package com.pvz.cancan.service;

import com.pvz.cancan.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock
  private RedisTemplate<String, Object> redisTemplate;

  @Mock
  private ValueOperations<String, Object> valueOperations;

  @BeforeEach
  void setUp() {
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void createdUserIsAvailableForLoginAndSavedToRedis() {
    UserService userService = new UserService(redisTemplate);

    User created = userService.createUser("002524", "新用户");

    assertThat(created.getPassword()).isEqualTo("002524");
    assertThat(userService.getByPassword("002524").getName()).isEqualTo("新用户");
    ArgumentCaptor<Object> usersCaptor = ArgumentCaptor.forClass(Object.class);
    verify(valueOperations).set(eq("users:custom"), usersCaptor.capture());
    assertThat(usersCaptor.getValue()).isInstanceOf(List.class);
    List<?> savedUsers = (List<?>) usersCaptor.getValue();
    assertThat(savedUsers).hasSize(1);
    assertThat(savedUsers.get(0)).isEqualTo(created);
  }
}
