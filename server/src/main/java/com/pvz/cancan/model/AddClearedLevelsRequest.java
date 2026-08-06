package com.pvz.cancan.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** 管理员为多个用户批量补录通关记录的请求。 */
@Data
@NoArgsConstructor
public class AddClearedLevelsRequest {
  private List<String> userIds;
  private List<Integer> levelIds;
  /** pvz（主游戏）或 m3（消消乐）。 */
  private String game;
}
