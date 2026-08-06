package com.pvz.cancan.controller;

import com.pvz.cancan.model.EndlessScoreRequest;
import com.pvz.cancan.service.EndlessLeaderboardService;
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

@RestController
@RequestMapping("/api/match3/endless")
@RequiredArgsConstructor
public class EndlessLeaderboardController {

  private final UserService userService;
  private final EndlessLeaderboardService leaderboardService;

  @GetMapping("/leaderboard")
  public ResponseEntity<?> leaderboard(@RequestHeader(value = "Authorization", required = false) String auth) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    return ResponseEntity.ok(leaderboardService.get(userId));
  }

  @PostMapping("/score")
  public ResponseEntity<?> submit(@RequestHeader(value = "Authorization", required = false) String auth,
                                  @RequestBody EndlessScoreRequest request) {
    String userId = auth(auth);
    if (userId == null) return unauthorized();
    try {
      return ResponseEntity.ok(leaderboardService.submit(userId, request.getScore()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  private String auth(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
    return userService.verifyToken(authHeader.substring(7).trim());
  }

  private ResponseEntity<?> unauthorized() {
    return ResponseEntity.status(401).body(Map.of("error", "未登录或登录已过期"));
  }
}
