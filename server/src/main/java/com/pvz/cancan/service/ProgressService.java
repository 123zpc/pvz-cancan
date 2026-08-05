package com.pvz.cancan.service;

import com.pvz.cancan.model.Progress;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

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
    return new Progress(1, java.util.List.of());
  }

  /** 保存用户进度。 */
  public void save(String userId, Progress progress) {
    redisTemplate.opsForValue().set(PROGRESS_PREFIX + userId, progress);
    log.info("用户 {} 进度已保存：unlocked={}, cleared={}",
        userId, progress.getUnlocked(), progress.getCleared());
  }
}
