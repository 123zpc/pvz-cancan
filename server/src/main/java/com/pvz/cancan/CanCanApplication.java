package com.pvz.cancan;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 灿灿专属版植物大战僵尸后端启动类。
 * 提供登录鉴权与通关进度持久化两个核心能力，防止前端刷新后数据丢失。
 */
@SpringBootApplication
public class CanCanApplication {

  public static void main(String[] args) {
    SpringApplication.run(CanCanApplication.class, args);
  }
}
