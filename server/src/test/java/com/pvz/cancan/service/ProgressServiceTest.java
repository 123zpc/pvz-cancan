package com.pvz.cancan.service;

import com.pvz.cancan.model.Progress;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

  private static final String USER_ID = "002523";

  @Mock
  private RedisTemplate<String, Object> redisTemplate;

  @Mock
  private ValueOperations<String, Object> valueOperations;

  private ProgressService progressService;

  @BeforeEach
  void setUp() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    progressService = new ProgressService(redisTemplate);
  }

  @Test
  void stalePlayerSaveCannotUndoAnAdminUnlock() {
    Progress adminProgress = new Progress(5, List.of(1, 2), 3, List.of(1));
    adminProgress.setTotalPlayTimeSec(120L);
    adminProgress.setLevelBestTimes(Map.of(1, 30L));
    adminProgress.setM3LevelBestTimes(Map.of(1, 18L));
    adminProgress.setStarlightBestScore(680L);
    adminProgress.setLastPlayedAt(200L);
    when(valueOperations.get("progress:" + USER_ID)).thenReturn(adminProgress);

    Progress staleInitialState = new Progress(1, List.of(), 1, List.of());
    staleInitialState.setTotalPlayTimeSec(0L);
    staleInitialState.setStarlightBestScore(400L);
    staleInitialState.setLastPlayedAt(100L);

    progressService.save(USER_ID, staleInitialState);

    ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
    verify(valueOperations).set(anyString(), captor.capture());
    Progress saved = (Progress) captor.getValue();
    assertThat(saved.getUnlocked()).isEqualTo(5);
    assertThat(saved.getCleared()).containsExactly(1, 2);
    assertThat(saved.getM3Unlocked()).isEqualTo(3);
    assertThat(saved.getM3Cleared()).containsExactly(1);
    assertThat(saved.getTotalPlayTimeSec()).isEqualTo(120L);
    assertThat(saved.getLevelBestTimes()).containsEntry(1, 30L);
    assertThat(saved.getM3LevelBestTimes()).containsEntry(1, 18L);
    assertThat(saved.getStarlightBestScore()).isEqualTo(680L);
    assertThat(saved.getLastPlayedAt()).isEqualTo(200L);
  }

  @Test
  void playerSaveKeepsTheBestTimeAndAddsNewCompletion() {
    Progress existing = new Progress(2, List.of(1), 1, List.of());
    existing.setLevelBestTimes(Map.of(1, 40L));
    existing.setM3LevelBestTimes(Map.of());
    when(valueOperations.get("progress:" + USER_ID)).thenReturn(existing);

    Progress incoming = new Progress(3, List.of(1, 2), 1, List.of());
    incoming.setLevelBestTimes(Map.of(1, 35L, 2, 50L));
    incoming.setM3LevelBestTimes(Map.of());

    progressService.save(USER_ID, incoming);

    ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
    verify(valueOperations).set(anyString(), captor.capture());
    Progress saved = (Progress) captor.getValue();
    assertThat(saved.getUnlocked()).isEqualTo(3);
    assertThat(saved.getCleared()).containsExactly(1, 2);
    assertThat(saved.getLevelBestTimes()).containsExactlyInAnyOrderEntriesOf(Map.of(1, 35L, 2, 50L));
  }

  @Test
  void adminAddedClearedLevelsAlsoUnlockTheNextLevel() {
    Progress existing = new Progress(1, List.of(), 1, List.of());
    when(valueOperations.get("progress:" + USER_ID)).thenReturn(existing);

    Progress saved = progressService.addClearedLevels(USER_ID, false, List.of(1, 2, 3), 10);

    assertThat(saved.getCleared()).containsExactly(1, 2, 3);
    assertThat(saved.getUnlocked()).isEqualTo(4);
  }

  @Test
  void getUnlocksEndlessLevelForLegacyPlayerWhoClearedLevelTen() {
    Progress legacy = new Progress(5, List.of(1, 2, 3, 4, 5), 10,
        List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
    when(valueOperations.get("progress:" + USER_ID)).thenReturn(legacy);

    Progress progress = progressService.get(USER_ID);

    assertThat(progress.getM3Unlocked()).isEqualTo(11);
    verify(valueOperations).set("progress:" + USER_ID, legacy);
  }
}
