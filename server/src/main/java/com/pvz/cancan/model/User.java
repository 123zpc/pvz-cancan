package com.pvz.cancan.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 内置用户：密码即用户身份标识。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
  private String password;
  private String name;
}
