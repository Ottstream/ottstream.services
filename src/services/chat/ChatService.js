// const serviceCollection = require('../service_collection');
const { repositories } = require('ottstream.dataaccess');

const { userRepository } = repositories;
const BroadcastService = require('../socket/broadcastService.service');

class ChatService {
  static async userTyping(toClient, userId, clientId, accessToken) {
    if (toClient) {
      const user = await userRepository.getUserById(userId);
      await BroadcastService.broadcastToGroup(`chat-client-mini-${clientId}`, `chat-client-mini-${clientId}`, {
        action: 'typing',
        name: `${user.firstname} ${user.lastname}`,
        userId,
        token: accessToken,
      });

      await BroadcastService.broadcastToGroup(`chat-client-${clientId}`, `chat-client-${clientId}`, {
        action: 'typing',
        name: `${user.firstname} ${user.lastname}`,
        userId,
        token: accessToken,
      });
    } else {
      await BroadcastService.broadcastToGroup(`user-${userId}`, `chat-info-${userId}`, {
        action: 'typing',
      });
    }
  }
}

module.exports = ChatService;
