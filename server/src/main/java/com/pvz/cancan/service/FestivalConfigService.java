package com.pvz.cancan.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * 节日主题配置：存储于 Redis（key: config:festival），随本地备份持久化。
 * 七夕主题默认开启，管理后台可随时关闭。
 */
@Slf4j
@Service
public class FestivalConfigService {

  public static final String FESTIVAL_KEY = "config:festival";

  private final RedisTemplate<String, Object> redisTemplate;

  public FestivalConfigService(RedisTemplate<String, Object> redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  /** 七夕主题是否开启。无记录时默认开启（节日献礼）。 */
  public boolean isQixiEnabled() {
    Object val = redisTemplate.opsForValue().get(FESTIVAL_KEY);
    if (val instanceof Boolean b) return b;
    return true;
  }

  public synchronized void setQixiEnabled(boolean enabled) {
    redisTemplate.opsForValue().set(FESTIVAL_KEY, enabled);
    log.info("七夕主题已{}", enabled ? "开启" : "关闭");
  }
}
