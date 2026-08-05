package com.pvz.cancan.service;

import com.pvz.cancan.model.User;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 用户与登录服务：内置用户表 + token 发放与校验。
 * token 存储于 Redis（key: token:{token} -> userId），有效期 30 天。
 */
@Slf4j
@Service
public class UserService {

  private static final String TOKEN_PREFIX = "token:";
  private static final long TOKEN_TTL_DAYS = 30L;

  private final RedisTemplate<String, Object> redisTemplate;

  @Value("${app.users}")
  private List<User> configuredUsers;

  /** 内存中的内置用户表：password -> User，启动时从配置加载 */
  private final Map<String, User> userTable = new HashMap<>();

  public UserService(RedisTemplate<String, Object> redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  @PostConstruct
  public void init() {
    for (User u : configuredUsers) {
      userTable.put(u.getPassword(), u);
    }
    log.info("已加载 {} 个内置用户", userTable.size());
  }

  /**
   * 登录：密码命中内置用户则发放 token。
   * @return 登录响应含 token，密码错误返回 null。
   */
  public String login(String password) {
    User user = userTable.get(password);
    if (user == null) return null;
    String token = UUID.randomUUID().toString().replace("-", "");
    redisTemplate.opsForValue().set(TOKEN_PREFIX + token, password, TOKEN_TTL_DAYS, TimeUnit.DAYS);
    log.info("用户 {} 登录成功", user.getName());
    return token;
  }

  /**
   * 校验 token，返回对应的 userId（即密码）。
   * @return 无效返回 null。
   */
  public String verifyToken(String token) {
    if (token == null || token.isBlank()) return null;
    Object val = redisTemplate.opsForValue().get(TOKEN_PREFIX + token);
    return val == null ? null : val.toString();
  }

  public User getByPassword(String password) {
    return userTable.get(password);
  }
}
