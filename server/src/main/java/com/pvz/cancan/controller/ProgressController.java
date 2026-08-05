package com.pvz.cancan.controller;

import com.pvz.cancan.model.Progress;
import com.pvz.cancan.service.ProgressService;
import com.pvz.cancan.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 通关进度接口：
 *   GET  /api/progress  读取当前用户进度
 *   POST /api/progress  保存当前用户进度
 * 通过 Authorization: Bearer {token} 鉴权。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProgressController {

  private final UserService userService;
  private final ProgressService progressService;

  @GetMapping("/progress")
  public ResponseEntity<?> get(@RequestHeader(value = "Authorization", required = false) String auth) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    return ResponseEntity.ok(progressService.get(userId));
  }

  @PostMapping("/progress")
  public ResponseEntity<?> save(@RequestHeader(value = "Authorization", required = false) String auth,
                                @RequestBody Progress progress) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    progressService.save(userId, progress);
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
}
