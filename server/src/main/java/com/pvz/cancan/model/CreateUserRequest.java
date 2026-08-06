package com.pvz.cancan.model;

import lombok.Data;
import lombok.NoArgsConstructor;

/** 管理员新增用户请求。用户 ID 同时作为该用户的登录密码。 */
@Data
@NoArgsConstructor
public class CreateUserRequest {
  private String userId;
  private String name;
}
