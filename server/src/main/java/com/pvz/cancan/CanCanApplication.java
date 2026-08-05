package com.pvz.cancan;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;

/**
 * 灿灿专属版植物大战僵尸后端启动类。
 * 提供登录鉴权与通关进度持久化两个核心能力，防止前端刷新后数据丢失。
 *
 * 排除 Spring 的 Redis 自动配置：端口由嵌入式 RedisServer 动态分配，
 * 在 RedisConfig 中手动创建 LettuceConnectionFactory。
 */
@SpringBootApplication(exclude = { RedisAutoConfiguration.class, RedisRepositoriesAutoConfiguration.class })
public class CanCanApplication {

  public static void main(String[] args) {
    SpringApplication.run(CanCanApplication.class, args);
  }
}
