package com.pvz.cancan.service;

import com.pvz.cancan.model.Progress;
import com.pvz.cancan.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashSet;
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

  private static final int MAIN_LEVEL_COUNT = 10;
  private static final int MATCH3_LEVEL_COUNT = 11;

  private final UserService userService;
  private final ProgressService progressService;

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
      item.put("starlightBestScore", p.getStarlightBestScore() == null ? 0L : p.getStarlightBestScore());
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
    progressService.overwrite(userId, progress);
    log.info("管理员覆盖用户 {} 进度：unlocked={}, cleared={}", userId, progress.getUnlocked(), progress.getCleared());
  }

  /** 为一个或多个用户补录指定关卡的通关记录。 */
  public void addClearedLevels(List<String> userIds, List<Integer> levelIds, String game) {
    if (userIds == null || userIds.isEmpty()) {
      throw new IllegalArgumentException("请至少选择一个用户");
    }
    boolean match3;
    if ("pvz".equals(game)) {
      match3 = false;
    } else if ("m3".equals(game)) {
      match3 = true;
    } else {
      throw new IllegalArgumentException("游戏类型只能是 pvz 或 m3");
    }

    LinkedHashSet<String> targetIds = new LinkedHashSet<>();
    for (String userId : userIds) {
      if (userId == null || userId.isBlank() || userService.getByUserId(userId) == null) {
        throw new IllegalArgumentException("包含不存在的用户");
      }
      targetIds.add(userId);
    }

    int totalLevels = match3 ? MATCH3_LEVEL_COUNT : MAIN_LEVEL_COUNT;
    for (String userId : targetIds) {
      progressService.addClearedLevels(userId, match3, levelIds, totalLevels);
    }
    log.info("管理员为用户 {} 补录 {} 关卡通关记录：{}", targetIds, game, levelIds);
  }
}
