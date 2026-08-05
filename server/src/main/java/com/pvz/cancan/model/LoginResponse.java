package com.pvz.cancan.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录响应：返回 token 与用户名，前端后续请求携带 token。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
  private String token;
  private String userId;
  private String name;
}
