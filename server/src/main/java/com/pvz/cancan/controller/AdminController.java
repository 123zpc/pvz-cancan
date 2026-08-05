package com.pvz.cancan.controller;

import com.pvz.cancan.model.Progress;
import com.pvz.cancan.service.AdminService;
import com.pvz.cancan.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 管理员接口：仅 userId=020510 可访问。
 *   GET  /api/admin/users                列出所有用户进度
 *   GET  /api/admin/users/{userId}       读取指定用户完整进度
 *   POST /api/admin/users/{userId}        覆盖指定用户进度
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

  private final UserService userService;
  private final AdminService adminService;

  @GetMapping("/users")
  public ResponseEntity<?> listUsers(@RequestHeader(value = "Authorization", required = false) String auth) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    if (!userService.isAdmin(userId)) return forbidden();
    List<Map<String, Object>> users = adminService.listUsersWithProgress();
    return ResponseEntity.ok(Map.of("users", users));
  }

  @GetMapping("/users/{userId}")
  public ResponseEntity<?> getUser(@RequestHeader(value = "Authorization", required = false) String auth,
                                     @PathVariable String userId) {
    String adminId = auth(auth);
    if (adminId == null) return unauthorized();
    if (!userService.isAdmin(adminId)) return forbidden();
    if (userService.getByUserId(userId) == null) {
      return ResponseEntity.status(404).body(Map.of("error", "用户不存在"));
    }
    return ResponseEntity.ok(adminService.getUserProgress(userId));
  }

  @PostMapping("/users/{userId}")
  public ResponseEntity<?> overwriteUser(@RequestHeader(value = "Authorization", required = false) String auth,
                                          @PathVariable String userId,
                                          @RequestBody Progress progress) {
    String adminId = auth(auth);
    if (adminId == null) return unauthorized();
    if (!userService.isAdmin(adminId)) return forbidden();
    if (userService.getByUserId(userId) == null) {
      return ResponseEntity.status(404).body(Map.of("error", "用户不存在"));
    }
    adminService.overwriteProgress(userId, progress);
    return ResponseEntity.ok(Map.of("success", true));
  }

  /** 从 Authorization 头解析 token 并校验，返回 userId 或 null。 */
  private String auth(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
    String token = authHeader.substring(7).trim();
    return userService.verifyToken(token);
  }

  private ResponseEntity<?> unauthorized() {
    return ResponseEntity.status(401).body(Map.of("error", "未登录或登录已过期"));
  }

  private ResponseEntity<?> forbidden() {
    return ResponseEntity.status(403).body(Map.of("error", "无权访问管理后台"));
  }
}
