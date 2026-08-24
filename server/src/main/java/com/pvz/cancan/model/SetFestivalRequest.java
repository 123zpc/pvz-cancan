package com.pvz.cancan.model;

import lombok.Data;
import lombok.NoArgsConstructor;

/** 节日主题开关请求体。 */
@Data
@NoArgsConstructor
public class SetFestivalRequest {
  private Boolean qixi;
}
