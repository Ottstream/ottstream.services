const redis = require('redis');
const logger = require('../../utils/logger/logger');
const config = require('../../config/config');

class RedisCache {
  constructor() {
    this.cache = {};
    this.isConnecting = false;
  }

  async connect() {
    const self = this;
    if (self.isConnecting) {
      return new Promise((resolve) => {
        // Handle successful connection
        self.subClient.on('connect', () => {
          self.isConnected = true;
          resolve({ status: true });
        });
        self.subClient.on('error', (err) => {
          self.isConnected = false;
          resolve({ status: false });
          logger.error('RedisCache: error connecting to Redis:', err);
        });
      });
    }

    self.isConnecting = true;
    const url = `redis://${config.redis.host}:${config.redis.port}`;
    this.subClient = redis.createClient({
      url,
      password: config.redis.password,
    });
    this.subClient.connect();
    logger.info(`RedisCache: connecting to redis ${config.redis.host}:${config.redis.port}`);

    return new Promise((resolve) => {
      // Handle successful connection
      self.subClient.on('connect', () => {
        logger.info('RedisCache: Connected to Redis');
        self.isConnected = true;
        self.isConnecting = false;
        resolve({ status: true });
      });
      self.subClient.on('error', (err) => {
        self.isConnected = false;
        self.isConnecting = false;
        resolve({ status: false });
        logger.error('RedisCache: error connecting to Redis:', err);
      });
    });
  }

  async hasKey(key) {
    const self = this;
    return self.subClient.exists(key);
  }

  async remove(key) {
    const self = this;
    return self.subClient.del(key);
  }

  // async set(key, data) {
  //   // return new Promise((resolve, reject) => {
  //   //   this.subClient.get(key, (err, reply) => {
  //   //     if (err) {
  //   //       console.error('Error getting key:', err);
  //   //       callback(err, null);
  //   //     } else {
  //   //       console.log('Key retrieved:', reply);
  //   //       callback(null, reply);
  //   //     }
  //   //   });
  //   // });
  // }

  async setex(key, value, exp) {
    const self = this;
    const setValue = await self.subClient.set(key, JSON.stringify(value));
    await self.subClient.expire(key, exp);
    return setValue === 'OK' ? value : null;
  }

  async updateex(key, exp) {
    const self = this;
    await self.subClient.expire(key, exp);
  }

  async set(key, value) {
    const self = this;
    const setValue = await self.subClient.set(key, JSON.stringify(value));
    return setValue === 'OK' ? value : null;
  }

  async get(key) {
    const self = this;
    const data = await self.subClient.get(key);
    return data ? JSON.parse(data) : null;
  }
}

module.exports = RedisCache;
