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
  public static final String THEME_KEY = "config:theme";

  private final RedisTemplate<String, Object> redisTemplate;

  public FestivalConfigService(RedisTemplate<String, Object> redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  /** 获取当前生效的主题：classic / qixi / autumn */
  public String getCurrentTheme() {
    Object val = redisTemplate.opsForValue().get(THEME_KEY);
    if (val instanceof String s && !s.isBlank()) {
      return s;
    }
    // 兼容旧版 config:festival
    Object oldQixi = redisTemplate.opsForValue().get(FESTIVAL_KEY);
    if (Boolean.FALSE.equals(oldQixi)) {
      return "classic";
    }
    return "qixi";
  }

  /** 七夕主题是否开启（兼容旧客户端） */
  public boolean isQixiEnabled() {
    return "qixi".equalsIgnoreCase(getCurrentTheme());
  }

  /** 设置全站主题 */
  public synchronized void setTheme(String theme) {
    String normalized = "qixi".equalsIgnoreCase(theme) ? "qixi"
        : "autumn".equalsIgnoreCase(theme) ? "autumn"
        : "classic";
    redisTemplate.opsForValue().set(THEME_KEY, normalized);
    redisTemplate.opsForValue().set(FESTIVAL_KEY, "qixi".equals(normalized));
    log.info("全站主题已更新为: {}", normalized);
  }

  public synchronized void setQixiEnabled(boolean enabled) {
    setTheme(enabled ? "qixi" : "classic");
  }
}
