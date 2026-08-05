package com.pvz.cancan.config;

import com.github.fppt.jedismock.RedisServer;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * 嵌入式 Redis 配置：应用启动时在 JVM 内拉起一个纯 Java 实现的 Redis 服务，
 * 数据存于内存，应用退出即销毁。无需安装外部 Redis，便于部署。
 *
 * jedis-mock 默认绑定随机端口，启动后通过 getBindPort() 取实际端口，
 * 再由 RedisConfig 据此创建 LettuceConnectionFactory。
 */
@Slf4j
@Configuration
public class EmbeddedRedisConfig {

  @Getter
  private RedisServer redisServer;

  @Bean
  public RedisServer redisServer() throws IOException {
    redisServer = RedisServer.newRedisServer().start();
    log.info("嵌入式 Redis 已启动，端口 {}", redisServer.getBindPort());
    return redisServer;
  }

  @PreDestroy
  public void stop() throws IOException {
    if (redisServer != null) {
      redisServer.stop();
      log.info("嵌入式 Redis 已关闭");
    }
  }
}
