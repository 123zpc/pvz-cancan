package com.pvz.cancan.controller;

import com.pvz.cancan.model.LoginRequest;
import com.pvz.cancan.model.LoginResponse;
import com.pvz.cancan.model.User;
import com.pvz.cancan.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 登录接口：POST /api/login
 * 请求体 { password: "002523" }，成功返回 { token, userId, name }。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

  private final UserService userService;

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    String token = userService.login(req.getPassword());
    if (token == null) {
      return ResponseEntity.status(401).body(Map.of("error", "密码不对哦～"));
    }
    User user = userService.getByPassword(req.getPassword());
    return ResponseEntity.ok(new LoginResponse(token, user.getPassword(), user.getName()));
  }
}
