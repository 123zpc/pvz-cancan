package com.pvz.cancan.config;

import com.github.fppt.jedismock.RedisServer;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.IOException;

/**
 * 嵌入式 Redis 配置：应用启动时在 JVM 内拉起一个纯 Java 实现的 Redis 服务，
 * 数据存于内存，应用退出即销毁。无需安装外部 Redis，便于部署。
 */
@Slf4j
@Configuration
public class EmbeddedRedisConfig {

  @Value("${app.redis.embedded-port}")
  private int port;

  private RedisServer redisServer;

  @PostConstruct
  public void start() throws IOException {
    redisServer = RedisServer.newRedisServer().port(port).start();
    log.info("嵌入式 Redis 已启动，端口 {}", port);
  }

  @PreDestroy
  public void stop() throws IOException {
    if (redisServer != null) {
      redisServer.stop();
      log.info("嵌入式 Redis 已关闭");
    }
  }
}
