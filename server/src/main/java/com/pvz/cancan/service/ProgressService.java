package com.pvz.cancan.service;

import com.pvz.cancan.model.Progress;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 通关进度服务：以 progress:{userId} 为 key 存储进度 JSON。
 * 防止前端刷新后进度丢失。
 */
@Slf4j
@Service
public class ProgressService {

  private static final String PROGRESS_PREFIX = "progress:";

  private final RedisTemplate<String, Object> redisTemplate;

  public ProgressService(RedisTemplate<String, Object> redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  /** 读取用户进度，无记录则返回默认初始进度（解锁第 1 关，无通关记录）。 */
  public Progress get(String userId) {
    Object val = redisTemplate.opsForValue().get(PROGRESS_PREFIX + userId);
    if (val instanceof Progress p) return p;
    return new Progress(1, java.util.List.of(), 1, java.util.List.of());
  }

  /** 保存用户进度。 */
  public synchronized void save(String userId, Progress progress) {
    Progress merged = mergeForPlayer(get(userId), progress);
    redisTemplate.opsForValue().set(PROGRESS_PREFIX + userId, merged);
    log.info("用户 {} 进度已保存：主游戏 unlocked={}, cleared={}；消消乐 m3Unlocked={}, m3Cleared={}",
        userId, merged.getUnlocked(), merged.getCleared(),
        merged.getM3Unlocked(), merged.getM3Cleared());
  }

  /** 管理员覆盖是唯一允许降低玩家进度的写入路径。 */
  public synchronized void overwrite(String userId, Progress progress) {
    redisTemplate.opsForValue().set(PROGRESS_PREFIX + userId, normalize(progress));
  }

  /** 管理端批量补录通关记录，同时至少解锁到下一关。 */
  public synchronized Progress addClearedLevels(String userId, boolean match3, List<Integer> levelIds, int totalLevels) {
    if (totalLevels < 1) throw new IllegalArgumentException("关卡总数必须大于 0");
    List<Integer> levels = validateLevelIds(levelIds, totalLevels);
    Progress progress = normalize(get(userId));
    int highestLevel = levels.stream().mapToInt(Integer::intValue).max().orElse(1);

    if (match3) {
      progress.setM3Cleared(mergeCleared(progress.getM3Cleared(), levels));
      progress.setM3Unlocked(Math.max(progress.getM3Unlocked(), Math.min(totalLevels, highestLevel + 1)));
    } else {
      progress.setCleared(mergeCleared(progress.getCleared(), levels));
      progress.setUnlocked(Math.max(progress.getUnlocked(), Math.min(totalLevels, highestLevel + 1)));
    }
    progress.setLastPlayedAt(System.currentTimeMillis());
    redisTemplate.opsForValue().set(PROGRESS_PREFIX + userId, progress);
    return progress;
  }

  private Progress mergeForPlayer(Progress current, Progress incoming) {
    Progress existing = normalize(current);
    Progress requested = normalize(incoming);
    Progress merged = new Progress();
    merged.setUnlocked(Math.max(existing.getUnlocked(), requested.getUnlocked()));
    merged.setCleared(mergeCleared(existing.getCleared(), requested.getCleared()));
    merged.setM3Unlocked(Math.max(existing.getM3Unlocked(), requested.getM3Unlocked()));
    merged.setM3Cleared(mergeCleared(existing.getM3Cleared(), requested.getM3Cleared()));
    merged.setTotalPlayTimeSec(Math.max(existing.getTotalPlayTimeSec(), requested.getTotalPlayTimeSec()));
    merged.setLevelBestTimes(mergeBestTimes(existing.getLevelBestTimes(), requested.getLevelBestTimes()));
    merged.setM3LevelBestTimes(mergeBestTimes(existing.getM3LevelBestTimes(), requested.getM3LevelBestTimes()));
    merged.setLastPlayedAt(Math.max(existing.getLastPlayedAt(), requested.getLastPlayedAt()));
    return merged;
  }

  private Progress normalize(Progress progress) {
    Progress normalized = progress == null ? new Progress() : progress;
    if (normalized.getUnlocked() == null) normalized.setUnlocked(1);
    if (normalized.getCleared() == null) normalized.setCleared(List.of());
    if (normalized.getM3Unlocked() == null) normalized.setM3Unlocked(1);
    if (normalized.getM3Cleared() == null) normalized.setM3Cleared(List.of());
    if (normalized.getTotalPlayTimeSec() == null) normalized.setTotalPlayTimeSec(0L);
    if (normalized.getLevelBestTimes() == null) normalized.setLevelBestTimes(Map.of());
    if (normalized.getM3LevelBestTimes() == null) normalized.setM3LevelBestTimes(Map.of());
    if (normalized.getLastPlayedAt() == null) normalized.setLastPlayedAt(System.currentTimeMillis());
    return normalized;
  }

  private List<Integer> mergeCleared(List<Integer> existing, List<Integer> incoming) {
    LinkedHashSet<Integer> merged = new LinkedHashSet<>();
    existing.stream().filter(level -> level != null && level > 0).forEach(merged::add);
    incoming.stream().filter(level -> level != null && level > 0).forEach(merged::add);
    return new ArrayList<>(merged);
  }

  private List<Integer> validateLevelIds(List<Integer> levelIds, int totalLevels) {
    if (levelIds == null || levelIds.isEmpty()) {
      throw new IllegalArgumentException("请至少提供一个关卡编号");
    }
    LinkedHashSet<Integer> levels = new LinkedHashSet<>();
    for (Integer level : levelIds) {
      if (level == null || level < 1 || level > totalLevels) {
        throw new IllegalArgumentException("关卡编号必须在 1 到 " + totalLevels + " 之间");
      }
      levels.add(level);
    }
    return new ArrayList<>(levels);
  }

  private Map<Integer, Long> mergeBestTimes(Map<Integer, Long> existing, Map<Integer, Long> incoming) {
    Map<Integer, Long> merged = new TreeMap<>();
    mergeBestTimesInto(merged, existing);
    mergeBestTimesInto(merged, incoming);
    return merged;
  }

  private void mergeBestTimesInto(Map<Integer, Long> target, Map<Integer, Long> source) {
    source.forEach((level, time) -> {
      if (level != null && level > 0 && time != null && time >= 0) {
        target.merge(level, time, Math::min);
      }
    });
  }
}
