package com.pvz.cancan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvz.cancan.model.User;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * Persists the application-owned Redis values as JSON snapshots on the server disk.
 * Values are Base64-encoded Redis serializer bytes so polymorphic Progress/User values
 * can be restored without losing their runtime types.
 */
@Slf4j
@Service("backupRestoreService")
public class LocalBackupService {

  private static final ZoneId BACKUP_ZONE = ZoneId.of("Asia/Shanghai");
  private static final int KEEP_SNAPSHOTS = 7;
  private static final String SNAPSHOT_PREFIX = "pvz-data-";
  private static final String CUSTOM_USERS_KEY = "users:custom";
  private static final String LEADERBOARD_KEY = "match3:endless:scores";
  private static final List<String> BUILTIN_USER_IDS = List.of("002523", "020510");

  private final RedisTemplate<String, Object> redisTemplate;
  private final Path backupDirectory;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public LocalBackupService(
      RedisTemplate<String, Object> redisTemplate,
      @Value("${app.backup.directory:./backoup}") String backupDirectory) {
    this.redisTemplate = redisTemplate;
    this.backupDirectory = Path.of(backupDirectory).toAbsolutePath().normalize();
  }

  /** Runs before UserService is constructed, so restored custom users are available at login. */
  @PostConstruct
  public void restoreLatest() {
    try {
      Files.createDirectories(backupDirectory);
      Optional<Path> latest = latestSnapshot();
      if (latest.isPresent()) {
        restoreSnapshot(latest.get());
        log.info("已从本地备份恢复 Redis 数据：{}", latest.get().getFileName());
        return;
      }
      log.info("未找到本地备份，将从空 Redis 启动");
    } catch (Exception e) {
      log.error("本地备份恢复失败；为避免阻断服务启动，将从空 Redis 继续", e);
    }
  }

  /** Every day at 00:00 Asia/Shanghai. A same-day file is replaced atomically. */
  @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Shanghai")
  public void scheduledBackup() {
    writeSnapshot("每日定时");
  }

  /** A graceful restart also preserves changes made after the most recent midnight snapshot. */
  @PreDestroy
  public void backupBeforeShutdown() {
    writeSnapshot("服务停止");
  }

  private synchronized void writeSnapshot(String reason) {
    try {
      Files.createDirectories(backupDirectory);
      Snapshot snapshot = createSnapshot();
      Path target = backupDirectory.resolve(SNAPSHOT_PREFIX + LocalDate.now(BACKUP_ZONE) + ".json");
      Path temporary = Files.createTempFile(backupDirectory, SNAPSHOT_PREFIX, ".tmp");
      objectMapper.writeValue(temporary.toFile(), snapshot);
      moveAtomically(temporary, target);
      pruneOldSnapshots();
      log.info("Redis 本地备份已保存（{}）：{}，共 {} 个数据项", reason, target.getFileName(), snapshot.entries().size());
    } catch (Exception e) {
      log.error("Redis 本地备份失败（{}）", reason, e);
    }
  }

  private Snapshot createSnapshot() {
    Map<String, String> entries = new LinkedHashMap<>();
    Object customUsers = redisTemplate.opsForValue().get(CUSTOM_USERS_KEY);
    addEntry(entries, CUSTOM_USERS_KEY, customUsers);

    LinkedHashSet<String> userIds = new LinkedHashSet<>(BUILTIN_USER_IDS);
    if (customUsers instanceof List<?> users) {
      for (Object item : users) {
        if (item instanceof User user && user.getPassword() != null) userIds.add(user.getPassword());
      }
    }
    for (String userId : userIds) {
      addEntry(entries, "progress:" + userId, redisTemplate.opsForValue().get("progress:" + userId));
    }
    addEntry(entries, LEADERBOARD_KEY, redisTemplate.opsForValue().get(LEADERBOARD_KEY));
    return new Snapshot(1, entries);
  }

  private void addEntry(Map<String, String> entries, String key, Object value) {
    if (value == null) return;
    byte[] serialized = valueSerializer().serialize(value);
    if (serialized != null) entries.put(key, Base64.getEncoder().encodeToString(serialized));
  }

  private void restoreSnapshot(Path snapshotPath) throws IOException {
    Snapshot snapshot = objectMapper.readValue(snapshotPath.toFile(), Snapshot.class);
    if (snapshot.version() != 1 || snapshot.entries() == null) {
      throw new IOException("不支持的备份格式");
    }
    for (Map.Entry<String, String> entry : snapshot.entries().entrySet()) {
      Object value = valueSerializer().deserialize(Base64.getDecoder().decode(entry.getValue()));
      if (value != null) redisTemplate.opsForValue().set(entry.getKey(), value);
    }
  }

  private Optional<Path> latestSnapshot() throws IOException {
    try (Stream<Path> paths = Files.list(backupDirectory)) {
      return paths
          .filter(Files::isRegularFile)
          .filter(path -> path.getFileName().toString().startsWith(SNAPSHOT_PREFIX))
          .filter(path -> path.getFileName().toString().endsWith(".json"))
          .max(Comparator.comparing(path -> path.getFileName().toString()));
    }
  }

  private void pruneOldSnapshots() throws IOException {
    List<Path> snapshots;
    try (Stream<Path> paths = Files.list(backupDirectory)) {
      snapshots = paths
          .filter(Files::isRegularFile)
          .filter(path -> path.getFileName().toString().startsWith(SNAPSHOT_PREFIX))
          .filter(path -> path.getFileName().toString().endsWith(".json"))
          .sorted(Comparator.comparing((Path path) -> path.getFileName().toString()).reversed())
          .toList();
    }
    for (int i = KEEP_SNAPSHOTS; i < snapshots.size(); i++) {
      Files.deleteIfExists(snapshots.get(i));
    }
  }

  private void moveAtomically(Path source, Path target) throws IOException {
    try {
      Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    } catch (AtomicMoveNotSupportedException e) {
      Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
    }
  }

  @SuppressWarnings("unchecked")
  private RedisSerializer<Object> valueSerializer() {
    return (RedisSerializer<Object>) redisTemplate.getValueSerializer();
  }

  private record Snapshot(int version, Map<String, String> entries) {
  }
}
