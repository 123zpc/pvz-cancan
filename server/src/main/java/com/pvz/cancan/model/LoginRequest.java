package com.pvz.cancan.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录请求：密码即用户身份。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
  private String password;
}
