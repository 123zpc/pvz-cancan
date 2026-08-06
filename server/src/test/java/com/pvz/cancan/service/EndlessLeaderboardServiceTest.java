package com.pvz.cancan.service;

import com.pvz.cancan.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EndlessLeaderboardServiceTest {

  @Mock
  private RedisTemplate<String, Object> redisTemplate;

  @Mock
  private ValueOperations<String, Object> valueOperations;

  @Mock
  private UserService userService;

  private EndlessLeaderboardService leaderboardService;

  @BeforeEach
  void setUp() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    when(userService.getByUserId(anyString())).thenAnswer(invocation -> {
      String id = invocation.getArgument(0);
      return new User(id, "玩家" + id);
    });
    leaderboardService = new EndlessLeaderboardService(redisTemplate, userService);
  }

  @Test
  void higherScoreTakesTheLeadAndReturnsDistanceToTheNextRank() {
    when(valueOperations.get("match3:endless:scores"))
        .thenReturn(new HashMap<>(Map.of("002523", 1200L, "020510", 1500L)));

    Map<String, Object> result = leaderboardService.submit("002523", 1800L);

    assertThat(result.get("myRank")).isEqualTo(1);
    assertThat(result.get("myScore")).isEqualTo(1800L);
    assertThat(result.get("scoreToBeat")).isEqualTo(0L);
    assertThat((List<?>) result.get("entries")).hasSize(2);

    ArgumentCaptor<Object> scoresCaptor = ArgumentCaptor.forClass(Object.class);
    verify(valueOperations).set(eq("match3:endless:scores"), scoresCaptor.capture());
    Map<?, ?> savedScores = (Map<?, ?>) scoresCaptor.getValue();
    assertThat(savedScores.get("002523")).isEqualTo(1800L);
  }
}
