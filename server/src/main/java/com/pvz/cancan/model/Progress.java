package com.pvz.cancan.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 用户通关进度：
 * - unlocked / cleared：主游戏（植物大战僵尸）
 * - m3Unlocked / m3Cleared：消消乐小游戏
 * - totalPlayTimeSec：累计游戏时长（秒）
 * - levelBestTimes / m3LevelBestTimes：每关最佳通关用时（秒），key 为关卡 id
 * - lastPlayedAt：最近一次游戏时间（epoch 毫秒）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Progress {
  private Integer unlocked;
  private List<Integer> cleared;
  private Integer m3Unlocked;
  private List<Integer> m3Cleared;
  private Long totalPlayTimeSec;
  private Map<Integer, Long> levelBestTimes;
  private Map<Integer, Long> m3LevelBestTimes;
  private Long lastPlayedAt;

  /** 兼容旧数据：构造一个最小可用进度。 */
  public Progress(Integer unlocked, List<Integer> cleared, Integer m3Unlocked, List<Integer> m3Cleared) {
    this.unlocked = unlocked;
    this.cleared = cleared;
    this.m3Unlocked = m3Unlocked;
    this.m3Cleared = m3Cleared;
    this.totalPlayTimeSec = 0L;
    this.levelBestTimes = new java.util.HashMap<>();
    this.m3LevelBestTimes = new java.util.HashMap<>();
    this.lastPlayedAt = System.currentTimeMillis();
  }
}
