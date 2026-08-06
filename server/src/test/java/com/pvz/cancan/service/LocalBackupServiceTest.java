package com.pvz.cancan.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.serializer.RedisSerializer;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalBackupServiceTest {

  @Mock
  private RedisTemplate<String, Object> redisTemplate;

  @Mock
  private ValueOperations<String, Object> valueOperations;

  @Mock
  private RedisSerializer<Object> serializer;

  @TempDir
  Path tempDirectory;

  @Test
  void dailySnapshotRestoresAllApplicationValuesOnTheNextStart() throws Exception {
    Map<String, Object> store = new HashMap<>();
    store.put("progress:002523", "player-progress");
    store.put("progress:020510", "admin-progress");
    store.put("match3:endless:scores", "leaderboard");
    configureStore(store);

    LocalBackupService writer = new LocalBackupService(redisTemplate, tempDirectory.toString());
    writer.scheduledBackup();
    try (var files = Files.list(tempDirectory)) {
      assertThat(files.filter(path -> path.getFileName().toString().endsWith(".json")).count()).isEqualTo(1);
    }

    store.clear();
    LocalBackupService reader = new LocalBackupService(redisTemplate, tempDirectory.toString());
    reader.restoreLatest();

    assertThat(store).containsEntry("progress:002523", "player-progress");
    assertThat(store).containsEntry("progress:020510", "admin-progress");
    assertThat(store).containsEntry("match3:endless:scores", "leaderboard");
  }

  private void configureStore(Map<String, Object> store) {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    doReturn(serializer).when(redisTemplate).getValueSerializer();
    when(valueOperations.get(anyString())).thenAnswer(invocation -> store.get(invocation.getArgument(0)));
    doAnswer(invocation -> {
      store.put(invocation.getArgument(0), invocation.getArgument(1));
      return null;
    }).when(valueOperations).set(anyString(), any());
    when(serializer.serialize(any())).thenAnswer(invocation -> invocation.getArgument(0).toString().getBytes(StandardCharsets.UTF_8));
    when(serializer.deserialize(any())).thenAnswer(invocation -> new String(invocation.getArgument(0), StandardCharsets.UTF_8));
  }
}
