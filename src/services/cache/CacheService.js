const serviceCollection = require('../service_collection');

class CacheService {
  static getCacheStore() {
    return serviceCollection.getService('redisCacheStore');
  }

  static async hasKey(key) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.hasKey(key);
  }

  static async set(key, data) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.set(key, data);
  }

  static async setex(key, data, exp) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.setex(key, data, exp);
  }

  static async updateex(key, exp) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.updateex(key, exp);
  }

  static async removeKey(key) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.remove(key);
  }

  static async get(key) {
    const cacheService = CacheService.getCacheStore();
    if (!cacheService.isConnected) await cacheService.connect();
    return cacheService.get(key);
  }
}

module.exports = CacheService;
