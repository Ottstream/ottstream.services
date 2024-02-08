const twilio = require('twilio');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const { clientRepository, smsRepository, ottProviderOtherApiRepository, chatRepository } = repositories;
const BroadcastService = require('../socket/broadcastService.service');

class TwilioService {
  constructor() {
    logger.info(`TwilioService() initiated`);
  }

  static async processTwilioWebhook(body, cb) {
    try {
      const { EventType, MessageSid, Author, Body, Source, AccountSid, From } = body;
      if (
        Source === 'SMS' &&
        (EventType === 'onMessageAdded' || EventType === 'onMessageSent' || EventType === 'onMessageAdd')
      ) {
        logger.info(`twilioarrived 2`);
        const from = EventType === 'onMessageSent' ? From : Author;
        const normalizedPhoneNumber = from.replace(/[-\s]/g, '');
        // const phoneRegexPattern = new RegExp(normalizedPhoneNumber);

        const phoneRegexPattern = `\\${normalizedPhoneNumber.split('').join('\\s*-?')}`;
        const otherApis = await ottProviderOtherApiRepository.getList({
          'twilio.sId': AccountSid,
          'twilio.isValid': true,
        });

        const providers = [];
        otherApis.forEach((item) => {
          providers.push(item.providerId);
        });

        const clients = await clientRepository.getAll({
          'phones.phone': { $regex: phoneRegexPattern, $options: 'i' },
          provider: { $in: providers },
          status: 1,
        });
        if (!clients.length) {
          const clentBody = {
            personalInfo: {
              firstname: from,
              lastname: `(New Client)`,
            },
            phones: [
              {
                phone: from,
              },
            ],
            provider: providers[0],
          };
          const newClient = await clientRepository.createClient(clentBody);
          clients.push(newClient);
        }
        if (!MessageSid) {
          cb(null, {
            status: false,
          });
          return;
        }
        logger.info(`twilioarrived 3`);
        const oldSmS = await smsRepository.getList({ messageId: MessageSid });
        // eslint-disable-next-line no-restricted-syntax
        for (const client of clients) {
          let sms = null;
          if (!oldSmS.length) {
            logger.info(`newmessagecreate ${MessageSid}`);
            // eslint-disable-next-line no-await-in-loop
            const smsBySid = await smsRepository.findBySid(MessageSid);
            if (!smsBySid) {
              // eslint-disable-next-line no-await-in-loop
              sms = await smsRepository.createSms({
                deliveryState: 1,
                messageId: MessageSid,
                messageSource: from,
                deliverySystem: 'twilio',
                message: Body,
                provider: client.provider,
              });
            }

            logger.info(`sms, ${sms}`);
          } else {
            // eslint-disable-next-line prefer-destructuring
            sms = oldSmS[0];
            logger.info(`twiliowebhookdublicate`);
          }
          // eslint-disable-next-line no-await-in-loop
          const oldChat = await chatRepository.getList({ client: client.id, sms: sms.id });
          if (!oldChat.length) {
            // eslint-disable-next-line no-await-in-loop
            const chat = await chatRepository.createChat({
              from_client: client.id,
              client: client.id,
              provider: client.provider,
              to_provider: client.provider,
              deliveryState: 1,
              deliveryDate: new Date(),
              deliverySystem: 'twilio',
              sms: sms.id,
              message: Body,
              messageSource: from,
              readState: 0,
            });

            // eslint-disable-next-line no-await-in-loop
            await BroadcastService.broadcastToGroup(`chat-client-mini-${client.id}`, `chat-client-mini-${client.id}`, {
              action: 'newChat',
              chat,
            });

            // eslint-disable-next-line no-await-in-loop
            await BroadcastService.broadcastToProvider(client.provider._id.toString(), `provider-chat`, {
              action: 'newChat',
              chat,
            });

            // eslint-disable-next-line no-await-in-loop
            await BroadcastService.broadcastToGroup(`chat-client-${client.id}`, `chat-client-${client.id}`, {
              action: 'newChat',
              chat,
            });

            // TODO with 2 message enought to do, update tommorow

            logger.info(`webhook: twilio incoming message... ${from} client: ${client.id} provider: ${client.provider}`);
          }
        }
        cb(null, {
          status: true,
        });
      }
      cb(null, {
        status: false,
      });
    } catch (ex) {
      cb(null, {
        error: ex,
        message: ex.message ?? ex,
        status: false,
      });
    }
  }

  static async validateKey({ sId, authToken }) {
    const response = {
      status: false,
      messages: '',
      list: [],
    };
    try {
      // Replace these with your Twilio Account SID and Auth Token
      const client = twilio(sId, authToken);
      return new Promise((resolve) => {
        client.api
          .accounts(sId)
          .fetch()
          .then((account) => {
            response.account = account;
            response.status = true;
            resolve(response);
          })
          .catch((error) => {
            response.status = false;
            response.error = error;
            response.message = `key is not valid`;
            resolve(response);
          });
      });
    } catch (ex) {
      response.status = false;
      response.error = ex;
      response.message = 'key or sid error';
    }
    return response;
  }

  static async getMessageStatus(messageId, { sId, authToken }) {
    const response = {
      status: false,
      messages: '',
      list: [],
    };
    try {
      // Replace these with your Twilio Account SID and Auth Token
      const client = twilio(sId, authToken);
      return new Promise((resolve) => {
        client.api.account
          .messages(messageId)
          .fetch()
          .then(async (account) => {
            response.account = account;
            response.status = true;
            resolve(response);
          })
          .catch((error) => {
            response.status = false;
            response.error = error;
            response.message = `key is not valid`;
            resolve(response);
          });
      });
    } catch (ex) {
      response.status = false;
      response.error = ex;
      response.message = 'key or sid error';
    }
    return response;
  }

  static async getMessages({ sId, authToken }) {
    const response = {
      status: false,
      messages: '',
      list: [],
    };
    try {
      // Replace these with your Twilio Account SID and Auth Token
      const client = twilio(sId, authToken);
      return new Promise((resolve) => {
        client.api.account.messages
          .list({ direction: 'inbound' })
          .then(async (account) => {
            response.account = account;
            response.status = true;
            resolve(response);
          })
          .catch((error) => {
            response.status = false;
            response.error = error;
            response.message = `key is not valid`;
            resolve(response);
          });
      });
    } catch (ex) {
      response.status = false;
      response.error = ex;
      response.message = 'key or sid error';
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async getSmsSatus(sendInfo, { sId, authToken }, { provider, user }) {
    const response = {
      status: false,
      messages: '',
      list: [],
    };
    // Replace these with your Twilio Account SID and Auth Token
    const client = twilio(sId, authToken);

    // Replace these with your own phone numbers and message
    const { fromNumber } = sendInfo; // Your Twilio phone number
    const { toNumber } = sendInfo; // Recipient's phone number
    const messageBody = sendInfo.body;
    return new Promise((resolve) => {
      const sendBody = {
        body: messageBody,
        from: fromNumber,
        to: toNumber,
      };
      if (sendInfo.mediaUrl) sendBody.mediaUrl = sendInfo.mediaUrl;
      // Send the SMS
      client.messages
        .create(sendBody)
        .then(async (message) => {
          logger.info(`Message sent with SID: ${message.sid}}`);
          response.status = true;
          response.data = message;
          resolve(response);
        })
        .catch(async (error) => {
          logger.error(`Error sending message: ${error.message}`);
          response.status = false;
          response.data = error;
          resolve(response);
        });
    });
  }

  // eslint-disable-next-line no-unused-vars
  static async sendSms(sendInfo, { sId, authToken }, { provider, user }) {
    const response = {
      status: false,
      messages: '',
      list: [],
    };
    // Replace these with your Twilio Account SID and Auth Token
    const client = twilio(sId, authToken);

    // Replace these with your own phone numbers and message
    const { fromNumber } = sendInfo; // Your Twilio phone number
    const { toNumber } = sendInfo; // Recipient's phone number
    const messageBody = sendInfo.body;
    const sms = await smsRepository.createSms({
      deliveryState: 2,
      deliverySystem: 'twilio',
      message: messageBody,
      provider,
      user,
    });
    return new Promise((resolve) => {
      const sendBody = {
        body: messageBody,
        from: fromNumber,
        to: toNumber,
      };
      if (sendInfo.mediaUrl) sendBody.mediaUrl = sendInfo.mediaUrl;
      // Send the SMS
      client.messages
        .create(sendBody)
        .then(async (message) => {
          logger.info(`Message sent with SID: ${message.sid}}`);
          let deliveryState = 2;
          if (message.status === 'queued') deliveryState = 3;
          await smsRepository.updateSmsById(sms.id, {
            deliveryState,
            messageId: message.sid,
          });
          response.status = true;
          response.data = message;
          resolve(response);
        })
        .catch(async (error) => {
          logger.error(`Error sending message: ${error.message}`);
          await smsRepository.updateSmsById(sms.id, {
            deliveryState: 0,
            errorMessage: `message deliver error`,
          });
          response.status = false;
          response.data = error;
          resolve(response);
        });
    });
  }
}

module.exports = TwilioService;
