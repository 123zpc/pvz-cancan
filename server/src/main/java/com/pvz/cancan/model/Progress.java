package com.pvz.cancan.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 用户通关进度：unlocked 表示已解锁到第几关，cleared 表示已通关的关卡 id 列表。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Progress {
  private Integer unlocked;
  private List<Integer> cleared;
}
