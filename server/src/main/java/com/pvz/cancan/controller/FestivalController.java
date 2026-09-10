package com.pvz.cancan.controller;

import com.pvz.cancan.model.SetFestivalRequest;
import com.pvz.cancan.service.FestivalConfigService;
import com.pvz.cancan.service.UserService;
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
 * 节日主题配置接口：
 *   GET  /api/config/festival          读取主题开关（需登录）
 *   POST /api/admin/config/festival    修改主题开关（仅管理员）
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FestivalController {

  private final UserService userService;
  private final FestivalConfigService festivalConfigService;

  @GetMapping("/config/festival")
  public ResponseEntity<?> get(@RequestHeader(value = "Authorization", required = false) String auth) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    String theme = festivalConfigService.getCurrentTheme();
    return ResponseEntity.ok(Map.of(
        "qixi", "qixi".equals(theme),
        "theme", theme
    ));
  }

  @PostMapping("/admin/config/festival")
  public ResponseEntity<?> set(@RequestHeader(value = "Authorization", required = false) String auth,
                               @RequestBody SetFestivalRequest request) {
    String adminId = auth(auth);
    if (adminId == null) return unauthorized();
    if (!userService.isAdmin(adminId)) return forbidden();

    if (request.getTheme() != null && !request.getTheme().isBlank()) {
      festivalConfigService.setTheme(request.getTheme());
    } else if (request.getQixi() != null) {
      festivalConfigService.setQixiEnabled(request.getQixi());
    }

    String theme = festivalConfigService.getCurrentTheme();
    return ResponseEntity.ok(Map.of(
        "success", true,
        "qixi", "qixi".equals(theme),
        "theme", theme
    ));
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
