/* eslint-disable no-underscore-dangle */
const _ = require('lodash');
const sanitiseGlobalConfiguration = require('./sanitiser');
const createMemCache = require('./mem-cache');
const RedisClient = require('./redis-client');
const timeout = require('./timeout');
const { now, bypassCache } = require('./cache-utils');
const logger = require('../utils/logging');

class Cache {
  constructor(conf) {
    if (!Cache.instance) {
      Cache.instance = this;
    }
    this.configuration = sanitiseGlobalConfiguration(conf);
    if (this.configuration.l1CacheSettings) {
      const { size, ttl } = this.configuration.l1CacheSettings;
      this._initL1Cache(createMemCache({ size, ttl }));
    }
    this.redisClient = new RedisClient(this.configuration);
    return Cache.instance;
  }

  _initL1Cache(l1Cache) {
    this.l1Cache = l1Cache || bypassCache;
  }

  // set value should not be used independently as it might cause cache poisoning
  async set(key, data, ttl) {
    const { cacheDuration } = this.configuration;
    if (ttl <= 0) return;
    const client = (this.redisClient && this.redisClient.master.isHealthy)
      ? this.redisClient.master.redis
      : undefined;
    if (!client) {
      logger.warn(null, 'Redis client is not ready for cache set', this.configuration);
      return;
    }
    try {
      // IMPORTANT: the data that is set to the cache MUST be stringified,
      // because setex does not support setting objects.
      const stringifiedData = JSON.stringify(data);
      await client.setex(key, ttl || cacheDuration, stringifiedData);
    } catch (error) {
      logger.error(error, `Failed to store a cache item with key '${key}'`, this.configuration);
      if (this.redisClient && this.redisClient.master) {
        this.redisClient.master.checkStatus();
      }
    }
  }

  async _redisGet(key) {
    if (!this.redisClient) {
      throw new Error('Redis client undefined');
    }

    if (!(this.redisClient.slave.isHealthy && this.redisClient.slave.redis)) {
      throw new Error('Redis client not ready/healthy');
    }

    const client = this.redisClient.slave.redis;
    try {
      let result;
      if (this.configuration.redisGetTimeout) {
        result = await Promise.race([timeout(this.configuration.redisGetTimeout), client.get(key)]);
        // unstringify the data
        result = JSON.parse(result);
        return result;
      }
      result = await client.get(key);
      // unstringify the data
      result = JSON.parse(result);
      return result;
    } catch (error) {
      logger.error('Failed to get item from cache', error);
      logger.trace(error);
      this.redisClient.slave.checkStatus();
    }
    return null;
  }

  async _cachePeek(key) {
    // IMPORTANT: the l1 cache stores /references/, not /values/, so
    // the results you get from l1 MUST be cloned so it can be modified
    // downstream without modifying the cache at a given key.

    const requestDateTime = now();

    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      l1Result.responseFrom = 'l1Cache';
      return _.cloneDeep(l1Result);
    }
    try {
      const response = await this._redisGet(key, this.configuration);
      if (!response) {
        return null;
      }
      const cacheHitDuration = now() - requestDateTime;
      if (this.configuration.l1CacheSettings
        && (cacheHitDuration >= this.configuration.l1CacheSettings.minLatencyToStore)
      ) {
        this.l1Cache.set(key, response);
      }

      response.responseFrom = 'redis';
      return _.cloneDeep(response);
    } catch (error) {
      logger.error(error, `Failed getting redis cache for key '${key}'`, 'cachePeek', this.configuration);
      logger.trace(error);
      if (this.redisClient && this.redisClient.slave) {
        this.redisClient.slave.checkStatus();
      }
    }
    return null;
  }

  async get(key) {
    const result = await this._cachePeek(key);
    return result;
  }

  areConnectionsHealthy() {
    return this.redisClient
      && this.redisClient.master.isHealthy
      && this.redisClient.slave.isHealthy;
  }
}

const instance = new Cache();

module.exports = instance;