const TelegramBot = require('node-telegram-bot-api');
const Calendar = require('telegram-inline-calendar');
const moment = require('moment');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const { calendarRepository, ottProviderConversationProvider, userRepository, telegramBotRepository } = repositories;
// const userRepository = require('../../repository/user/user.repository');
// const ottProviderConversationProvider = require('../../repository/ottprovider/ottprovider_conversation_provider.repository');
// const calendarRepository = require('../../repository/calendar/calendar_event.repository');
const config = require('../../config/config');

class TelegramBotService {
  constructor() {
    logger.info(`telebot bot inited`);
    this.bots = {};
  }

  async processTelegramWebhook(body) {
    logger.info(`processTelegramWebhook: ${JSON.stringify(body)}`);
    // eslint-disable-next-line camelcase
    const { token, message, callback_query } = body;
    const text = message?.text;
    const data = callback_query?.data;
    // eslint-disable-next-line camelcase
    const fromId = callback_query ? callback_query.from.id : message.from.id;
    const ottProvider = await ottProviderConversationProvider.getList({
      'telegram.authToken': token,
    });
    const botId = `${ottProvider[0].providerId}-${token}`;
    const bot = await TelegramBotService.getBotLocalInfo(botId);
    const userInfo = bot.users ? bot.users[fromId] : null;
    if (text === '/start') {
      await this.logicForStart(message, botId);
    } else if (data === 'login') {
      await this.logicForLogin(callback_query, botId);
    } else if (text === '/logout' && userInfo.loggedIn) {
      await this.logicForLogout(message, botId);
    } else if (text === '/getapps' && userInfo.loggedIn) {
      await this.logicForGetApps(message, botId);
    } else {
      // eslint-disable-next-line no-unused-expressions, camelcase
      callback_query ? await this.callbacks(callback_query, botId) : await this.callbacks(message, botId);
    }
    return bot;
    // bot.onText(/\/start/, async (msg) => {

    // });
  }

  async logicForStart(message, botId) {
    const { chat, from } = message;
    logger.info(`logicForStart: ${botId}`);
    const { bot } = this.bots[botId];
    const chatId = chat.id;
    let loggedIn = false;
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const fromId = from.id;
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    if (!botLocalInfo.users || !botLocalInfo.users[fromId]) {
      if (!botLocalInfo.users) botLocalInfo.users = {};
      botLocalInfo.users[fromId] = {
        loggedIn: false,
        fromId,
      };
      this.bots[botId] = botLocalInfo;
      await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    } else {
      const userInfo = botLocalInfo.users[fromId];
      loggedIn = userInfo.loggedIn;
    }
    if (loggedIn) {
      botLocalInfo.users[fromId].state = null;
      await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
      bot.sendMessage(chatId, 'Welcome back!');
    } else {
      botLocalInfo.users[fromId].state = 'waitingLogin';
      await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
      const opts = {
        reply_markup: {
          inline_keyboard: [[{ text: 'Login', callback_data: 'login' }]],
        },
      };

      bot.sendMessage(chatId, 'Welcome! Please log in.', opts);
    }
  }

  async logicForLogin(callbackQuery, botId) {
    const { bot } = this.bots[botId];
    const { from, message } = callbackQuery;
    const { chat } = message;
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    botLocalInfo.users[from.id].state = 'waitingLogin';
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    bot.sendMessage(chat.id, 'type your login please!');
  }

  // eslint-disable-next-line class-methods-use-this
  async logicForLogout(message, botId) {
    const { bot } = this.bots[botId];
    const { from, chat } = message;
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const fromId = from.id;
    botLocalInfo.users[fromId].loggedIn = false;
    botLocalInfo.users[fromId].state = 'waitingLogin';
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    const opts = {
      reply_markup: {
        inline_keyboard: [[{ text: 'Login', callback_data: 'login' }]],
      },
    };

    bot.sendMessage(chat.id, 'Welcome! Please log in.', opts);
  }

  async logicForGetApps(message, botId) {
    const { text, from } = message;
    const botInfo = this.bots[botId];
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    botLocalInfo.users[from.id].state = text;
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    botInfo.calendar.startNavCalendar(message);
  }

  async callbacks(callbackQuery, botId) {
    const message = callbackQuery?.message || callbackQuery;
    const text = callbackQuery?.text || callbackQuery?.data;
    const { bot } = this.bots[botId];
    const fromId = callbackQuery?.from ? callbackQuery?.from.id : message?.from.id;
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const userInfo = botLocalInfo.users[fromId];
    if (!userInfo.loggedIn) {
      const login = botLocalInfo.users[fromId].state === 'waitingLogin' ? text.toString() : botLocalInfo.users[fromId].login;
      const user = await TelegramBotService.getUserInfo(login);

      if (botLocalInfo.users[fromId].state === 'waitingLogin') {
        if (user) {
          botLocalInfo.users[fromId].login = user.telegramLogin.toString();
          botLocalInfo.users[fromId].state = 'waitingPassword';
          await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
          bot.sendMessage(message.chat.id, 'enter password pls');
        } else {
          bot.sendMessage(message.chat.id, "such login doesn't exist!");
        }
      } else if (botLocalInfo.users[fromId].state === 'waitingPassword') {
        if (message.text.toString() === user.telegramPassword.toString()) {
          botLocalInfo.users[fromId].password = message.text;
          botLocalInfo.users[fromId].state = null;
          botLocalInfo.users[fromId].loggedIn = true;
          botLocalInfo.users[fromId].userId = user._id || null;
          await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
          bot.sendMessage(message.chat.id, 'login success.');
        } else {
          bot.sendMessage(message.chat.id, 'wrong password!');
        }
      } else if (!botLocalInfo.users[fromId].loggedIn) {
        const opts = {
          reply_markup: {
            inline_keyboard: [[{ text: 'Login', callback_data: 'login' }]],
          },
        };
        bot.sendMessage(message.chat.id, 'please login to continue', opts);
      }
    } else {
      await this.getAppsCallback(callbackQuery, botId);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async getAppsCallback(callbackQuery, botId) {
    const message = callbackQuery?.message || callbackQuery;
    const { data, from } = callbackQuery;
    const { bot } = this.bots[botId];
    const chatId = message.chat.id;
    const action = data ? data.split('_') : null;
    const fromId = from ? from.id : message?.from.id;
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const state = botLocalInfo.users[fromId].state.split('_');
    const availableCommands = ['/start', '/login', '/logout', '/getapps'];
    if (botLocalInfo.users[fromId] && botLocalInfo.users[fromId].loggedIn === true) {
      if (!action && state) {
        if (state[0] === 'yes-cancel') {
          await this.changeAppointmentStatus(state, botId, chatId, fromId, message.text);
          return;
        }
        if (state[2] === 'writePrice') {
          await this.changeAppointmentStatusAndPrice(state, botId, chatId, fromId, message.text);
          return;
        }
      }
      if (action && action.length === 3) {
        const validDate = moment(action[1], 'DD-MM-YYYY').isValid();
        if (!validDate) {
          return;
        }
        await this.getEventList(action, botId, chatId, fromId, callbackQuery);
        return;
      }
      if (action) {
        switch (action[0]) {
          case 'no-process':
          case 'no-cancel':
          case 'no-completed':
            bot.sendMessage(chatId, `status change canceled!`);
            break;
          case 'button':
            await this.appointmentClick(botId, chatId, action, fromId);
            break;
          case 'info':
            await this.appointmentInfo(botId, chatId, fromId, action, botLocalInfo);
            break;
          case 'process':
            await this.yesOrNo(action, botId, chatId);
            break;
          case 'yes-process':
            await this.changeAppointmentStatus(action, botId, chatId, fromId);
            break;
          case 'cancel':
            await this.yesOrNo(action, botId, chatId);
            break;
          case 'yes-cancel':
            await this.appointmentComment(action, botId, chatId, fromId);
            break;
          case 'completed':
            await this.yesOrNo(action, botId, chatId);
            break;
          case 'yes-completed':
            await this.openCompleteButtons(action, botId, chatId, fromId);
            break;
          case 'paid':
            await this.writePriceMsg(action, botId, chatId, fromId);
            break;
          case 'free':
            await this.changeAppointmentStatusAndPrice(action, botId, chatId, fromId, message.text);
            break;
          default:
            bot.sendMessage(chatId, `available commands ${availableCommands.toString()}`);
            break;
        }
      } else {
        bot.sendMessage(chatId, `available commands ${availableCommands.toString()}`);
      }
    } else {
      const opts = {
        reply_markup: {
          inline_keyboard: [[{ text: 'Login', callback_data: 'login' }]],
        },
      };
      bot.sendMessage(chatId, 'please login to continue', opts);
    }
  }

  async yesOrNo(action, botId, chatId) {
    const { bot } = this.bots[botId];
    const nestedKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Yes', callback_data: `yes-${action[0]}_${action[1]}` },
            { text: 'No', callback_data: `no-${action[0]}_${action[1]}` },
          ],
        ],
      },
    };
    bot.sendMessage(chatId, 'Please Confirm!', {
      parse_mode: 'Markdown',
      reply_markup: nestedKeyboard.reply_markup,
    });
  }

  async getEventList(action, botId, chatId, fromId, callbackQuery) {
    const { bot, calendar } = this.bots[botId];
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const validDate = moment(action[1], 'DD-MM-YYYY').isValid();
    if (!validDate) {
      return;
    }
    const userInfo = botLocalInfo.users[fromId];
    const res = calendar.clickButtonCalendar(callbackQuery);
    const user = await TelegramBotService.getUserInfo(userInfo.login);
    const events = await calendarRepository.getCalendarEventByEqInstaller(user, {
      startDate: moment(res, 'DD-MM-YYYY').format(),
    });
    const title = events.length ? 'Choose Appointment' : 'data is empty';
    const inlineKeyboard = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const event of events) {
      const timezoneString = user.provider.timezone;

      // Get the current offset in minutes
      const offsetInMinutes = moment.tz(timezoneString).utcOffset();
      const startDate = moment
        .utc(event.startDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ')
        .add(offsetInMinutes, 'minutes')
        .format('YYYY-MM-DDTHH:mm:ss.SSS');
      const flag =
        // eslint-disable-next-line no-nested-ternary
        event.state === 'process' ? '🔵' : event.state === 'completed' ? '🟢' : event.state === 'cancel' ? '🔴' : '⚪';
      const text = JSON.stringify(`${flag} ${moment(startDate, 'YYYY-MM-DDTHH:mm:ss.SSS').format('h:mm a')}
${event.customerAddress.city}, ${event.customerAddress.province}`);

      inlineKeyboard.push([
        {
          text: JSON.parse(text),
          callback_data: `button_${event._id}`,
        },
      ]);
    }
    bot.sendMessage(chatId, title, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  }

  async writePriceMsg(action, botId, chatId, fromId) {
    const { bot } = this.bots[botId];
    const text = 'Please write price!';
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    botLocalInfo.users[fromId].state = `${action[0]}_${action[1]}_writePrice`;
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    bot.sendMessage(chatId, text);
  }

  async openCompleteButtons(action, botId, chatId, fromId) {
    const { bot } = this.bots[botId];
    const [{ event, status }, botLocalInfo] = await Promise.all([
      this.checkEventStatus(action[1]),
      TelegramBotService.getBotLocalInfo(botId),
    ]);
    if (!status) {
      bot.sendMessage(chatId, `This event already ${event.state}`);
      return;
    }
    if (event.paymentType === 'unpaid') {
      await this.writePriceMsg(action, botId, chatId, fromId);
      return;
    }
    botLocalInfo.users[fromId].state = `${action[0]}_${action[1]}_writePrice`;
    await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
    let nestedKeyboard = {};
    let text = 'Please write price!';
    if (event.paymentType !== 'paid') {
      text = 'Choose option';
      nestedKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Paid', callback_data: `paid_${action[1]}` },
              { text: 'Free', callback_data: `free_${action[1]}` },
            ],
          ],
        },
      };
      bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: nestedKeyboard.reply_markup,
      });
    } else {
      await this.changeAppointmentStatusAndPrice(action, botId, chatId, fromId, event.paymentPrice);
    }
  }

  async appointmentClick(botId, chatId, action, fromId) {
    const { bot } = this.bots[botId];
    const event = await calendarRepository.getCalendarEventById(action[1]);
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const user = await TelegramBotService.getUserInfo(botLocalInfo.users[fromId].login);
    const timezoneString = user.provider.timezone;

    // Get the current offset in minutes
    const offsetInMinutes = moment.tz(timezoneString).utcOffset();
    const startDate = moment.utc(event.startDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ').add(offsetInMinutes, 'minutes');
    const nowDay = moment.utc().format('YYYY-MM-DD');
    const getDay = startDate.format('YYYY-MM-DD');
    const nestedKeyboard =
      // eslint-disable-next-line no-nested-ternary
      event.state === 'completed' || event.state === 'cancel' || nowDay > getDay
        ? {
            reply_markup: {
              inline_keyboard: [[{ text: 'Info', callback_data: `info_${action[1]}` }]],
            },
          }
        : event.state === 'process'
        ? {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Info', callback_data: `info_${action[1]}` }],
                [
                  { text: 'Completed', callback_data: `completed_${action[1]}` },
                  { text: 'Cancel', callback_data: `cancel_${action[1]}` },
                ],
              ],
            },
          }
        : {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Info', callback_data: `info_${action[1]}` },
                  { text: 'Process', callback_data: `process_${action[1]}` },
                ],
                [
                  { text: 'Completed', callback_data: `completed_${action[1]}` },
                  { text: 'Cancel', callback_data: `cancel_${action[1]}` },
                ],
              ],
            },
          };
    const address = `
  ${moment(startDate.format('YYYY-MM-DDTHH:mm:ss.SSS'), 'YYYY-MM-DDTHH:mm:ss.SSS').format('h:mm a')}\n${
      event.customerAddress.address
    }\n${event.customerAddress.city} ${event.customerAddress.province}
  ${event.customerAddress.zip}`;
    bot.sendMessage(chatId, address, {
      parse_mode: 'Markdown',
      reply_markup: nestedKeyboard.reply_markup,
    });
  }

  async appointmentInfo(botId, chatId, fromId, action, botLocalInfo) {
    const { bot } = this.bots[botId];
    if (botLocalInfo.users[fromId].state === '/getapps') {
      const event = await calendarRepository.getCalendarEventById(action[1]);
      const user = await TelegramBotService.getUserInfo(botLocalInfo.users[fromId].login);
      const timezoneString = user.provider.timezone;

      // Get the current offset in minutes
      const offsetInMinutes = moment.tz(timezoneString).utcOffset();
      const startDate = moment.utc(event.startDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ').add(offsetInMinutes, 'minutes');
      const nowDay = moment.utc().format('YYYY-MM-DD');
      const getDay = startDate.format('YYYY-MM-DD');

      const messageData = await TelegramBotService.writeEventInfo(event, botId, fromId);
      const nestedKeyboard =
        event.state !== 'cancel' && event.state !== 'completed' && nowDay <= getDay
          ? {
              reply_markup: {
                inline_keyboard: [
                  event.state !== 'process' ? [{ text: 'Process', callback_data: `process_${action[1]}` }] : [],
                  [
                    { text: 'Completed', callback_data: `completed_${action[1]}` },
                    { text: 'Cancel', callback_data: `cancel_${action[1]}` },
                  ],
                ],
              },
            }
          : {
              reply_markup: {},
            };
      bot.sendMessage(chatId, messageData, {
        parse_mode: 'Markdown',
        reply_markup: nestedKeyboard.reply_markup,
      });
    }
  }

  async appointmentComment(action, botId, chatId, fromId) {
    const { bot } = this.bots[botId];
    const [botLocalInfo, { event, status }] = await Promise.all([
      TelegramBotService.getBotLocalInfo(botId),
      this.checkEventStatus(action[1]),
    ]);
    if (status && botLocalInfo && botLocalInfo.users[fromId].state === '/getapps') {
      // eslint-disable-next-line no-param-reassign
      botLocalInfo.users[fromId].state = `${action[0]}_${action[1]}_writeComment`;
      await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);
      bot.sendMessage(chatId, 'Please write comment!');
    } else {
      bot.sendMessage(chatId, `This event already ${event.state}`);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async checkEventStatus(eventId) {
    const event = await calendarRepository.getCalendarEventById(eventId);
    if (event.state === 'completed' || event.state === 'cancel') {
      return {
        event,
        status: 0,
      };
    }
    return {
      event,
      status: 1,
    };
  }

  async changeAppointmentStatus(state, botId, chatId, fromId, text = null) {
    const { bot } = this.bots[botId];
    let statusName = state[0].split('-');
    statusName = statusName.length === 1 ? statusName[0] : statusName[1];
    const [botLocalInfo, { event, status }] = await Promise.all([
      TelegramBotService.getBotLocalInfo(botId),
      this.checkEventStatus(state[1]),
    ]);
    const { comments } = event;
    if (!status) {
      bot.sendMessage(chatId, `This event already ${event.state}`);
      return;
    }
    if (
      state[0] !== 'yes-cancel' ||
      (state[0] === 'yes-cancel' && botLocalInfo.users[fromId].state === `${state[0]}_${state[1]}_writeComment`)
    ) {
      const user = await TelegramBotService.getUserInfo(botLocalInfo.users[fromId].login);
      if (text) {
        comments.push({
          comment: text,
          isCancel: state[0] === 'yes-cancel',
          user: botLocalInfo.users[fromId].userId,
          userName: `${user.firstname} ${user.lastname}`,
        });
      }
      await calendarRepository.updateCalendarEventByIdNew(state[1], {
        state: statusName,
        comments,
      });
      // eslint-disable-next-line no-param-reassign
      botLocalInfo.users[fromId].state = `/getapps`;
      await TelegramBotService.updateBotLocalInfo(botId, botLocalInfo);

      bot.sendMessage(chatId, `Event status successfuly changed to ${statusName}`);
    }
  }

  async changeAppointmentStatusAndPrice(action, botId, chatId, fromId, text = null) {
    const { bot } = this.bots[botId];
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const calendarObj = {
      state: 'completed',
      paymentType: action[0] !== 'free' ? 'paid' : 'free',
      paymentPrice: action[0] !== 'free' ? text : 0,
    };
    botLocalInfo.users[fromId].state = `/getapps`;
    await Promise.all([
      TelegramBotService.updateBotLocalInfo(botId, botLocalInfo),
      calendarRepository.updateCalendarEventByIdNew(action[1], calendarObj),
    ]);
    bot.sendMessage(chatId, `Event is successfuly completed!`);
  }

  isRunning(provider, token) {
    return !!Object.keys(this.bots).filter((r) => this.bots[r].token === token).length;
  }

  getBots() {
    return Object.keys(this.bots).map((r) => {
      return { token: this.bots[r].token, provider: this.bots[r].provider };
    });
  }

  getRunnings() {
    return Object.keys(this.bots).map((r) => this.bots[r]);
  }

  // eslint-disable-next-line no-unused-vars
  stopBot(provider, token) {
    const list = Object.keys(this.bots).map((r) => this.bots[r]);
    const foundList = list.filter((r) => r.provider === provider);
    // eslint-disable-next-line no-restricted-syntax
    for (const item of foundList) {
      const { key } = item;
      if (!this.bots[key]) {
        logger.info(`TelegramBotService: bot ${key} not found to stop`);
        return;
      }
      this.bots[key].bot.stopPolling();
      delete this.bots[key].bot;
      delete this.bots[key];
      logger.info(`TelegramBotService: bot ${key} stoped`);
    }
    if (!foundList.length) {
      logger.info(`TelegramBotService: bot ${provider}-${token} not found to stop`);
    }
  }

  static async getBotLocalInfo(botId) {
    const list = await telegramBotRepository.getList({ botId });
    if (!list.length) {
      const current = await telegramBotRepository.createTelegramBot({ botId });
      return current.toJSON();
    }
    return list[0].toJSON();
  }

  static async updateBotLocalInfo(botId, update) {
    await telegramBotRepository.updateOne({ botId }, update);
    const list = await telegramBotRepository.getList({ botId });
    return list[0].toJSON();
  }

  static async getUserInfo(login) {
    const user = await userRepository.getUserByTelegramLogin(login);
    return user;
  }

  static async writeEventInfo(event, botId, fromId) {
    const botLocalInfo = await TelegramBotService.getBotLocalInfo(botId);
    const user = await this.getUserInfo(botLocalInfo.users[fromId].login);
    const timezoneString = user.provider.timezone;

    // Get the current offset in minutes
    const offsetInMinutes = moment.tz(timezoneString).utcOffset();
    const startDate = moment
      .utc(event.startDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ')
      .add(offsetInMinutes, 'minutes')
      .format('YYYY-MM-DDTHH:mm:ss.SSS');
    const endDate = moment
      .utc(event.endDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ')
      .add(offsetInMinutes, 'minutes')
      .format('YYYY-MM-DDTHH:mm:ss.SSS');

    let phones = '';
    let connections = '';
    const address = `${event.customerAddress.address}, ${event.customerAddress.city}, ${event.customerAddress.province}, ${event.customerAddress.zip}`;
    // eslint-disable-next-line no-restricted-syntax
    for (const item of event.client.phones) {
      phones += `[${item.phone.replace(/[-\s]/g, '')}](tel:${item.phone.replace(
        /[-\s]/g,
        ''
      )})\n\n                                               `;
    }
    const googleMapsLink = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
    const fullAddress = `[${address}](${googleMapsLink})`;
    const comments = event.comments
      ? event.comments.map((elem) => {
          return `\n
        from: ${elem.userName},
        content: ${elem.comment},
        ${elem.isCancel ? 'isCancel: 🔴' : ''}
        ------------------------------------------------------------
      `;
        })
      : '';
    // eslint-disable-next-line no-restricted-syntax
    for (const item of event.client.info.locations) {
      connections += `${item.login}\n                   `;
    }
    const message = `
                  EVENT INFO
Event By: ${event.customerAddress.firstname} ${event.customerAddress.lastname}

Equipment Installer: ${event.equipmentInstaller.firstname} ${event.equipmentInstaller.lastname}

Status: ${event.state.charAt(0).toUpperCase() + event.state.slice(1)}

Date: ${moment(startDate, 'YYYY-MM-DDTHH:mm:ss.SSS').add(offsetInMinutes, 'minutes').format('MM/DD/YYYY')} - ${moment(
      endDate,
      'YYYY-MM-DDTHH:mm:ss.SSSZ'
    ).format('MM/DD/YYYY')}
                ${moment(startDate, 'YYYY-MM-DDTHH:mm:ss.SSS').format('h:mm a')} - ${moment(
      endDate,
      'YYYY-MM-DDTHH:mm:ss.SSSZ'
    ).format('h:mm a')}

Title: ${event.title}

Customer: ${event.client.personalInfo.firstname} ${event.client.personalInfo.lastname}

Customer Phones: ${phones}

Address: ${fullAddress}

Location: Name:   ${event.location.locationName}
                   Login:   ${event.location.login}
                   Password:   ${event.location.password}
                   Rooms:   ${event.location.roomsCount}

Connections:
                   ${connections}

Payment Type: ${event.paymentType} $${event.paymentPrice}

Comments: ${comments}
            `;
    return message;
  }

  // eslint-disable-next-line no-unused-vars
  async runBot(provider, token) {
    const key = `${provider}-${token}`;
    if (Object.keys(this.bots).filter((r) => this.bots[r].token === token).length) {
      logger.error(`bot already running ${key}`);
      return;
    }
    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token, { polling: config.telegram.polling });
    // bot.setChatPermissions(chatId, {
    //   can_send_messages
    // })
    bot.setMyCommands([
      { command: '/start', description: 'Start' },
      { command: '/getapps', description: 'Get List by Date' },
      { command: '/logout', description: 'command for Logout' },
    ]);
    const calendar = new Calendar(bot, {
      date_format: 'DD-MM-YYYY',
      language: 'en',
    });

    if (!config.telegram.polling) {
      // This informs Telegram where to send updates
      bot.setWebHook(`${config.telegram.webhookurl}?token=${token}`);
    } else {
      bot.onText(/\/\w+|\w+/, async (message) => {
        await this.processTelegramWebhook({
          message,
          token,
        });
      });
      bot.on('callback_query', async (callbackQuery) => {
        await this.processTelegramWebhook({
          callback_query: callbackQuery,
          token,
        });
      });
    }

    this.bots[key] = {
      bot,
      provider,
      token,
      key,
      calendar,
    };
    logger.info(
      `telegra bot: bot ${provider}-${token} is running (polling: ${config.telegram.polling}, wehookurl: ${config.telegram.webhookurl})...`
    );
  }
}

module.exports = TelegramBotService;
