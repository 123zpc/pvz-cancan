package com.pvz.cancan.service;

import com.pvz.cancan.model.User;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EndlessLeaderboardService {

  private static final String SCORES_KEY = "match3:endless:scores";
  private static final long MAX_SCORE = 1_000_000_000L;
  private static final int TOP_COUNT = 10;

  private final RedisTemplate<String, Object> redisTemplate;
  private final UserService userService;

  public EndlessLeaderboardService(RedisTemplate<String, Object> redisTemplate, UserService userService) {
    this.redisTemplate = redisTemplate;
    this.userService = userService;
  }

  /** Stores only a player's best endless score, then returns the fresh global ranking. */
  public synchronized Map<String, Object> submit(String userId, Long score) {
    if (score == null || score < 0 || score > MAX_SCORE) {
      throw new IllegalArgumentException("分数不合法");
    }
    Map<String, Long> scores = loadScores();
    scores.merge(userId, score, Math::max);
    redisTemplate.opsForValue().set(SCORES_KEY, scores);
    return leaderboard(userId, scores);
  }

  public synchronized Map<String, Object> get(String userId) {
    return leaderboard(userId, loadScores());
  }

  private Map<String, Long> loadScores() {
    Object stored = redisTemplate.opsForValue().get(SCORES_KEY);
    Map<String, Long> scores = new HashMap<>();
    if (!(stored instanceof Map<?, ?> rawScores)) return scores;
    rawScores.forEach((userId, score) -> {
      if (userId instanceof String id && score instanceof Number value && value.longValue() >= 0) {
        scores.put(id, value.longValue());
      }
    });
    return scores;
  }

  private Map<String, Object> leaderboard(String currentUserId, Map<String, Long> scores) {
    List<Map.Entry<String, Long>> ranking = new ArrayList<>(scores.entrySet());
    ranking.sort(Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
        .reversed()
        .thenComparing(Map.Entry::getKey));

    List<Map<String, Object>> entries = new ArrayList<>();
    int myRank = 0;
    long myScore = scores.getOrDefault(currentUserId, 0L);
    for (int i = 0; i < ranking.size(); i++) {
      Map.Entry<String, Long> score = ranking.get(i);
      int rank = i + 1;
      Map<String, Object> entry = entry(score.getKey(), score.getValue(), rank);
      if (rank <= TOP_COUNT || score.getKey().equals(currentUserId)) entries.add(entry);
      if (score.getKey().equals(currentUserId)) myRank = rank;
    }

    long scoreToBeat = myRank > 1 ? ranking.get(myRank - 2).getValue() : 0L;
    return Map.of("entries", entries, "myScore", myScore, "myRank", myRank, "scoreToBeat", scoreToBeat);
  }

  private Map<String, Object> entry(String userId, long score, int rank) {
    User user = userService.getByUserId(userId);
    String name = user == null ? userId : user.getName();
    return Map.of("userId", userId, "name", name, "score", score, "rank", rank);
  }
}
