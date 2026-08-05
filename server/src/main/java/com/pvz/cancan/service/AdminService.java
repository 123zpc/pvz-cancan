package com.pvz.cancan.service;

import com.pvz.cancan.model.Progress;
import com.pvz.cancan.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理员服务：列出所有用户、读取/覆盖任意用户进度。
 * 仅限 userId=020510 调用（由 AdminController 在 token 校验时拦截）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

  private final RedisTemplate<String, Object> redisTemplate;
  private final UserService userService;
  private final ProgressService progressService;

  private static final String PROGRESS_PREFIX = "progress:";

  /** 列出所有用户及其进度摘要（不返回密码）。 */
  public List<Map<String, Object>> listUsersWithProgress() {
    List<User> users = userService.getAllUsers();
    return users.stream().map(u -> {
      Progress p = progressService.get(u.getPassword());
      Map<String, Object> item = new HashMap<>();
      item.put("userId", u.getPassword());
      item.put("name", u.getName());
      item.put("unlocked", p.getUnlocked());
      item.put("cleared", p.getCleared());
      item.put("clearedCount", p.getCleared() == null ? 0 : p.getCleared().size());
      item.put("m3Unlocked", p.getM3Unlocked());
      item.put("m3Cleared", p.getM3Cleared());
      item.put("m3ClearedCount", p.getM3Cleared() == null ? 0 : p.getM3Cleared().size());
      item.put("totalPlayTimeSec", p.getTotalPlayTimeSec() == null ? 0L : p.getTotalPlayTimeSec());
      item.put("levelBestTimes", p.getLevelBestTimes() == null ? Map.of() : p.getLevelBestTimes());
      item.put("m3LevelBestTimes", p.getM3LevelBestTimes() == null ? Map.of() : p.getM3LevelBestTimes());
      item.put("lastPlayedAt", p.getLastPlayedAt() == null ? 0L : p.getLastPlayedAt());
      return item;
    }).toList();
  }

  /** 读取指定用户完整进度。 */
  public Progress getUserProgress(String userId) {
    return progressService.get(userId);
  }

  /** 覆盖指定用户进度（管理员修改）。 */
  public void overwriteProgress(String userId, Progress progress) {
    // 保证必填字段非空
    if (progress.getUnlocked() == null) progress.setUnlocked(1);
    if (progress.getCleared() == null) progress.setCleared(List.of());
    if (progress.getM3Unlocked() == null) progress.setM3Unlocked(1);
    if (progress.getM3Cleared() == null) progress.setM3Cleared(List.of());
    if (progress.getTotalPlayTimeSec() == null) progress.setTotalPlayTimeSec(0L);
    if (progress.getLevelBestTimes() == null) progress.setLevelBestTimes(new HashMap<>());
    if (progress.getM3LevelBestTimes() == null) progress.setM3LevelBestTimes(new HashMap<>());
    if (progress.getLastPlayedAt() == null) progress.setLastPlayedAt(System.currentTimeMillis());
    redisTemplate.opsForValue().set(PROGRESS_PREFIX + userId, progress);
    log.info("管理员覆盖用户 {} 进度：unlocked={}, cleared={}", userId, progress.getUnlocked(), progress.getCleared());
  }
}
