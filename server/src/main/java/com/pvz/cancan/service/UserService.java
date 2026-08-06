package com.pvz.cancan.service;

import com.pvz.cancan.model.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.DependsOn;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 用户与登录服务：内置用户表 + token 发放与校验。
 * token 存储于 Redis（key: token:{token} -> userId），有效期 30 天。
 *
 * 内置用户：密码即用户身份。新增用户只需在 BUILTIN_USERS 加一条。
 */
@Slf4j
@Service
@DependsOn("backupRestoreService")
public class UserService {

  private static final String TOKEN_PREFIX = "token:";
  private static final String CUSTOM_USERS_KEY = "users:custom";
  private static final long TOKEN_TTL_DAYS = 30L;

  /** 管理员密码（即 userId），仅有此用户可访问管理后台 */
  private static final String ADMIN_USER_ID = "020510";

  /** 内置用户表：password -> User */
  private static final List<User> BUILTIN_USERS = List.of(
      new User("002523", "灿灿"),
      new User("020510", "ZPC")
  );

  private final Map<String, User> userTable = new LinkedHashMap<>();

  private final RedisTemplate<String, Object> redisTemplate;

  public UserService(RedisTemplate<String, Object> redisTemplate) {
    this.redisTemplate = redisTemplate;
    for (User u : BUILTIN_USERS) {
      userTable.put(u.getPassword(), u);
    }
    loadCustomUsers();
    log.info("已加载 {} 个用户", userTable.size());
  }

  /**
   * 登录：密码命中内置用户则发放 token。
   * @return token，密码错误返回 null。
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

  public User getByUserId(String userId) {
    return userTable.get(userId);
  }

  /**
   * 创建一个可立即登录的新用户。为保持现有登录方式，新用户的登录密码就是其用户 ID。
   * 自定义用户写入 Redis，以便管理端的用户列表与登录服务使用同一份数据。
   */
  public synchronized User createUser(String userId, String name) {
    String normalizedId = userId == null ? "" : userId.trim();
    String normalizedName = name == null ? "" : name.trim();
    if (!normalizedId.matches("[A-Za-z0-9_-]{1,32}")) {
      throw new IllegalArgumentException("用户 ID 只能包含字母、数字、下划线或短横线，且最多 32 位");
    }
    if (normalizedName.isBlank() || normalizedName.length() > 32) {
      throw new IllegalArgumentException("昵称不能为空，且最多 32 个字符");
    }
    if (userTable.containsKey(normalizedId)) {
      throw new IllegalArgumentException("该用户 ID 已存在");
    }

    User user = new User(normalizedId, normalizedName);
    userTable.put(normalizedId, user);
    saveCustomUsers();
    log.info("管理员新增用户 {} ({})", normalizedName, normalizedId);
    return user;
  }

  /** 判断 userId 是否为管理员（020510）。 */
  public boolean isAdmin(String userId) {
    return ADMIN_USER_ID.equals(userId);
  }

  /** 返回所有用户（不暴露密码字段）。 */
  public synchronized List<User> getAllUsers() {
    return List.copyOf(userTable.values());
  }

  private void loadCustomUsers() {
    Object saved = redisTemplate.opsForValue().get(CUSTOM_USERS_KEY);
    if (!(saved instanceof List<?> users)) return;
    for (Object item : users) {
      if (item instanceof User user && user.getPassword() != null && user.getName() != null
          && !userTable.containsKey(user.getPassword())) {
        userTable.put(user.getPassword(), user);
      }
    }
  }

  private void saveCustomUsers() {
    List<User> customUsers = new ArrayList<>();
    for (User user : userTable.values()) {
      if (!BUILTIN_USERS.stream().anyMatch(builtin -> builtin.getPassword().equals(user.getPassword()))) {
        customUsers.add(user);
      }
    }
    redisTemplate.opsForValue().set(CUSTOM_USERS_KEY, customUsers);
  }
}
