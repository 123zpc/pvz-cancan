package com.pvz.cancan.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.fppt.jedismock.RedisServer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置：用嵌入式 RedisServer 的实际端口创建 LettuceConnectionFactory，
 * 并提供 key=String / value=JSON 的 RedisTemplate。
 */
@Configuration
public class RedisConfig {

  @Bean
  public RedisConnectionFactory redisConnectionFactory(RedisServer redisServer) {
    return new LettuceConnectionFactory(redisServer.getHost(), redisServer.getBindPort());
  }

  @Bean
  public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
    RedisTemplate<String, Object> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);

    StringRedisSerializer stringSerializer = new StringRedisSerializer();
    GenericJackson2JsonRedisSerializer jsonSerializer =
        new GenericJackson2JsonRedisSerializer(buildObjectMapper());

    template.setKeySerializer(stringSerializer);
    template.setHashKeySerializer(stringSerializer);
    template.setValueSerializer(jsonSerializer);
    template.setHashValueSerializer(jsonSerializer);
    template.afterPropertiesSet();
    return template;
  }

  private ObjectMapper buildObjectMapper() {
    ObjectMapper mapper = new ObjectMapper();
    mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
    mapper.activateDefaultTyping(
        mapper.getPolymorphicTypeValidator(),
        ObjectMapper.DefaultTyping.NON_FINAL);
    return mapper;
  }
}
