package com.example.notification.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

/**
 * Redis Cache Configuration.
 *
 * Interview Insight:
 *   "How does Spring caching work with Redis?"
 *   → "Spring @Cacheable abstracts the caching layer. The CacheManager determines
 *      where data is stored (ConcurrentMapCacheManager, RedisCacheManager, EhCache).
 *
 *      Key annotations:
 *        @Cacheable('name', key='#id')  — cache on read; skip DB on cache-hit
 *        @CachePut('name', key='#id')   — always update cache (write-through)
 *        @CacheEvict('name', key='#id') — remove from cache
 *        @CacheEvict(allEntries=true)   — flush the entire cache
 *
 *      Redis advantages over local cache:
 *        - Shared across all instances (distributed)
 *        - Persistence (AOF/RDB) — survives restarts
 *        - TTL support — auto-expiration
 *        - Data structures (Strings, Hashes, Sets, Sorted Sets)
 *
 *      Serialization strategies:
 *        - JdkSerializationRedisSerializer — default, Java-binary, not human-readable
 *        - GenericJackson2JsonRedisSerializer — JSON, debuggable in redis-cli
 *        - StringRedisSerializer — for simple key-value"
 */
@Configuration
@EnableCaching
@Profile("!test")
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .disableCachingNullValues();

        // Per-cache TTL overrides
        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                "notifications", defaults.entryTtl(Duration.ofMinutes(15)),
                "unreadCounts", defaults.entryTtl(Duration.ofMinutes(5)),
                "recipientNotifications", defaults.entryTtl(Duration.ofMinutes(10))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(cacheConfigs)
                .transactionAware()
                .build();
    }
}
