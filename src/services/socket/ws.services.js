const logger = require('../../utils/logger/logger');

class SocketService {
  constructor() {
    this.sockets = [];

    this.filteredClients = () => {
      this.sockets = this.sockets.filter((r) => r && r.socket._readyState === 1);
    };
    this.groups = {};
  }

  printClients() {
    logger.info(`sockets connected: ${this.sockets.length}`);
    // eslint-disable-next-line no-restricted-syntax
    for (const item of this.sockets) {
      logger.info(
        `user: ${item.user}, provider: ${item.provider}, state: ${item.socket._readyState}, groups: ${
          item?.groups?.length ? item?.groups?.toString() : 'NO GROUPS'
        }`
      );
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const groupKey of Object.keys(this.groups)) {
      const group = this.groups[groupKey];
      const subscribedUsers = Object.keys(group);
      logger.info(`group: ${groupKey}, users: ${subscribedUsers.length}`);
    }
  }

  removeClient(userId, ws) {
    this.sockets = this.sockets.filter((r) => r.socket !== ws);
    logger.info(`socket client removed`);
    // eslint-disable-next-line no-restricted-syntax
    for (const groupKey of Object.keys(this.groups)) {
      delete this.groups[groupKey][userId];
    }
    this.filteredClients();
  }

  addClient(providerId, userId, val) {
    this.sockets.push({
      provider: providerId,
      user: userId,
      groups: [],
      socket: val,
    });
    logger.info(`socket client added: ${userId}`);
    this.filteredClients();
  }

  addToGroup(userId, group) {
    // eslint-disable-next-line no-restricted-syntax
    for (const item of this.sockets) {
      if (item.user === userId) item.groups.push(group);
    }
  }

  onUserMessage(userId, data) {
    if (data.action === 'addGroup') {
      this.addToGroup(userId, data.group);
      this.printClients();
    }
    if (data.action === 'removeGroup') {
      this.removeFromGroup(userId, data.group);
      this.printClients();
    }
    if (data.action === 'chatUserTyping') {
      this.removeFromGroup(userId, data.group);
      this.printClients();
    }
  }

  removeFromGroup(userId, group) {
    // eslint-disable-next-line no-restricted-syntax
    for (const item of this.sockets) {
      if (item.user === userId) item.groups = item.groups.filter((r) => r !== group);
    }
  }

  getClients() {
    return this.sockets; // TODO make multiple logins to see same provider data
  }

  send(type, key, scope, message, group) {
    try {
      const toSend = this.sockets.filter((r) => {
        if (type === 1) return r.provider === key;
        if (type === 2) return r.user === key;
        if (type === 3) return r.groups.filter((a) => a === group).length;
        return type === 1 ? r.provider === key : r.user === key;
      });
      toSend.forEach((clientSocket) => {
        if (clientSocket.socket?._readyState === 1) {
          clientSocket.socket.send(
            JSON.stringify({
              scope,
              message,
            })
          );
        }
      });
    } catch (ex) {
      logger.error(ex.message);
    }
  }

  sendToProvider(key, scope, message) {
    return this.send(1, key, scope, message);
  }

  sendToGroup(group, scope, message) {
    return this.send(3, scope, scope, message, group);
  }

  sendToUser(key, scope, message) {
    return this.send(2, key, scope, message);
  }
}

module.exports = SocketService;
