package com.pvz.cancan.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * RedisTemplate 配置：key 使用 String 序列化，value 使用 JSON 序列化。
 */
@Configuration
public class RedisConfig {

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
