const axios = require('axios');
const logger = require('../../utils/logger/logger');

class TelegramService {
  // eslint-disable-next-line no-unused-vars
  static async validateToken(token) {
    // URL for checking the bot's token
    const url = `https://api.telegram.org/bot${token}/getMe`;
    const resp = { status: false, message: `` };
    return new Promise((resolve) => {
      axios
        .get(url)
        .then((response) => {
          if (response.status === 200) {
            logger.info('Token is valid!');
            const botInfo = response.data.result;
            logger.info(`Bot ID: ${botInfo.id}`);
            logger.info(`Bot Name: @${botInfo.username}`);
            resp.status = true;
            resp.info = botInfo;
            resolve(resp);
          } else {
            logger.info('Token is invalid.');
            logger.info(`Response Status Code: ${response.status}`);
            logger.info(`Response Data: ${JSON.stringify(response.data)}`);
            resp.status = false;
            resolve(resp);
          }
        })
        .catch((error) => {
          resp.message = error.message;
          resp.status = false;
          if (error.response.status === 404) {
            resp.message = `key is not valid`;
          } else {
            logger.error('Error occurred:', error.message);
          }
          resolve(resp);
        });
    });
    // Make a GET request to the Telegram Bot API
  }
}

module.exports = TelegramService;
