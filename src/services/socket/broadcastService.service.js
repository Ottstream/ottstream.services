class BroadcastService {
  static async broadcastToProvider(providerId, scope, data) {
    // eslint-disable-next-line global-require
    const serviceCollection = require('../service_collection');
    this.eventBusService = serviceCollection.getService('publisherEventBusService');
    if (!this.eventBusService.isConnected) await this.eventBusService.connect();

    await this.eventBusService.send('socket-stream', { providerId, scope, data });
  }

  static async broadcastToGroup(group, scope, data) {
    // eslint-disable-next-line global-require
    const serviceCollection = require('../service_collection');
    this.eventBusService = serviceCollection.getService('publisherEventBusService');
    if (!this.eventBusService.isConnected) await this.eventBusService.connect();

    await this.eventBusService.send('socket-stream', { group, scope, data });
  }

  static async broadcastToUser(userId, scope, data) {
    // eslint-disable-next-line global-require
    const serviceCollection = require('../service_collection');
    this.eventBusService = serviceCollection.getService('publisherEventBusService');
    if (!this.eventBusService.isConnected) await this.eventBusService.connect();

    await this.eventBusService.send('socket-stream', { userId, scope, data });
  }
}

module.exports = BroadcastService;
