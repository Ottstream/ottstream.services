const Joi = require('joi');
const dotenv = require('dotenv').config()
const configSchema = require('./configSchema');

class Config {
  static validateConfig() {
    const { error } = configSchema.prefs({ errors: { label: 'key' } }).validate(this.myConfig);

    if (error) {
      console.log(`Config validation error: ${error.message}`);
    }
  }

  static initConfig(config) {
    // this.myConfig = {
    //   env: process.env.NODE_ENV,
    //   global: {
    //     equipment_per_provider: parseInt(process.env.EQUIPMENT_PER_PROVIDER),
    //   },
    //   port: parseInt(process.env.PORT),
    //   file: {
    //     file_storage_path: process.env.FILE_STORAGE_PATH,
    //     root_path: process.env.STORAGE_ROOT_PATH,
    //     template_path: process.env.TEMPLATE_PATH,
    //   },
    //   mongoose: {
    //     url: process.env.MONGODB_URL + (process.env.NODE_ENV === 'test' ? '' : ''),
    //     options: {
    //       minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE),
    //     },
    //   },
    //   jwt: {
    //     secret: process.env.JWT_SECRET,
    //     accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES),
    //     refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS),
    //     resetPasswordExpirationMinutes: 10,
    //   },
    //   sync: {
    //     live_url: process.env.SYNC_URL,
    //     locations_pull_time: parseInt(process.env.SYNC_LOCATIONS_PULL_TIME),
    //     provider_pull_time: parseInt(process.env.SYNC_PROVIDER_PULL_TIME),
    //     sync_middleware: process.env.SYNC_MIDDLEWARE,
    //     generate_login: process.env.SYNC_GENERATE_LOGIN,
    //   },
    //   google: {
    //     clientId: process.env.GOOGLE_CONSUMER_KEY,
    //     secret: process.env.GOOGLE_CONSUMER_SECRET,
    //     callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    //   },
    //   smartStreet: {
    //     front_url: process.env.SMARTSTREET_SOURCE_URL,
    //     publicKey: process.env.SMART_STREET_KEY,
    //     smartyStreetAuthId: process.env.SMART_STREET_AUTH_ID,
    //     smartyStreetAuthToken: process.env.SMART_STREET_AUTH_TOKEN,
    //   },
    //   taxJar: {
    //     token: process.env.TAXJAR_API_TOKEN,
    //   },
    //   email: {
    //     smtp: {
    //       full: process.env.SMTP_FULL,
    //       host: process.env.SMTP_HOST,
    //       port: parseInt(process.env.SMTP_PORT),
    //       auth: {
    //         user: process.env.SMTP_USERNAME,
    //         pass: process.env.SMTP_PASSWORD,
    //       },
    //     },
    //     from: process.env.EMAIL_FROM,
    //   },
    //   maxmind: {
    //     dailyLimit: parseInt(process.env.MAXMIND_DAILY_LIMIT),
    //   },
    //   subscription: {
    //     left_expire_hours: parseInt(process.env.SUBSCRIPTION_LEFT_EXPIRE_HOURS),
    //     left_expire_hours_start: parseInt(process.env.SUBSCRIPTION_LEFT_EXPIRE_HOURS_START),
    //     generate_invoice: process.env.SUBSCRIPTION_INVOICE_GENERATE,
    //     allowCardCharge: process.env.SUBSCRIPTION_CARDS_CHARGE,
    //     recurring_charge_hour: process.env.SUBSCRIPTION_CARDS_HOURS,
    //     recurring_retry: process.env.SUBSCRIPTION_CARDS_RETRY,
    //     syncNow: process.env.SUBSCRIPTION_SYNC_NOW,
    //   },
    //   payment: {
    //     payment_card_sync: process.env.PAYMENT_CARD_SYNC,
    //   },
    //   redis: {
    //     host: process.env.REDIS_HOST,
    //     port: parseInt(process.env.REDIS_PORT),
    //     password: process.env.REDIS_PASSWORD,
    //   },
    //   hosted: {
    //     processCards: process.env.CARDS_PROCESS,
    //     processShippings: process.env.SHIPPINGS_PROCESS,
    //     processSubscriptions: process.env.SUBSCRIPTION_PROCESS,
    //     processPostalMethods: process.env.POSTALMETHODS_PROCESS,
    //     processNotifications: process.env.NOTIFICATIONS_PROCESS,
    //     processCredits: process.env.CREDITS_PROCESS,
    //     processAuthorize: process.env.AUTHORIZE_PROCESS,
    //     processClover: process.env.CLOVER_PROCESS,
    //     processCheckeeper: process.env.CHECKEEPER_PROCESS,
    //     processInvoices: process.env.INVOICES_PROCESS,
    //     processTwilio: process.env.TWILIO_PROCESS,
    //     processTelegramBots: process.env.TELEGRAM_BOTS_PROCESS,
    //   },
    //   postal: {
    //     sendInvoices: process.env.POSTAL_SEND_INVOICES,
    //   },
    //   telegram: {
    //     polling: process.env.TELEGRAM_POLLING,
    //     webhookurl: process.env.TELEGRAM_WEBHOOKURL,
    //   },
    //   graylog: {
    //     host: process.env.GRAYLOG_HOST,
    //     port: parseInt(process.env.GRAYLOG_PORT),
    //     name: process.env.GRAYLOG_NAME,
    //   },
    //   public_url: process.env.PUBLIC_URL,
    //   square_prod: process.env.SQUARE_PROD,
    //   authorize_prod_endpoint: process.env.AUTHORIZE_ENDPOINT,
    //   clover_prod: process.env.CLOVER_PROD,
    // };
    this.myConfig = {
      env: config.NODE_ENV,
      global: {
        equipment_per_provider: config.EQUIPMENT_PER_PROVIDER,
      },
      port: config.PORT,
      front_url: config.FRONT_URL,
      file: {
        file_storage_path: config.FILE_STORAGE_PATH,
        root_path: config.STORAGE_ROOT_PATH,
        template_path: config.TEMPLATE_PATH,
      },
      mongoose: {
        url: config.MONGODB_URL + (config.NODE_ENV === 'test' ? '' : ''),
        options: {
          minPoolSize: 90,
        },
      },
      jwt: {
        secret: config.JWT_SECRET,
        accessExpirationMinutes: config.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: config.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: 10,
      },
      sync: {
        live_url: config.SYNC_URL,
        locations_pull_time: config.SYNC_LOCATIONS_PULL_TIME,
        provider_pull_time: config.SYNC_PROVIDER_PULL_TIME,
        sync_middleware: config.SYNC_MIDDLEWARE,
        generate_login: config.SYNC_GENERATE_LOGIN,
      },
      google: {
        clientId: config.GOOGLE_CONSUMER_KEY,
        secret: config.GOOGLE_CONSUMER_SECRET,
        callbackUrl: config.GOOGLE_CALLBACK_URL,
      },
      smartStreet: {
        front_url: config.SMARTSTREET_SOURCE_URL,
        publicKey: config.SMART_STREET_KEY,
        smartyStreetAuthId: config.SMART_STREET_AUTH_ID,
        smartyStreetAuthToken: config.SMART_STREET_AUTH_TOKEN,
      },
      taxJar: {
        token: config.TAXJAR_API_TOKEN,
      },
      email: {
        smtp: {
          full: config.SMTP_FULL,
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          auth: {
            user: config.SMTP_USERNAME,
            pass: config.SMTP_PASSWORD,
          },
        },
        from: config.EMAIL_FROM,
      },
      maxmind: {
        dailyLimit: config.MAXMIND_DAILY_LIMIT,
      },
      subscription: {
        left_expire_hours: config.SUBSCRIPTION_LEFT_EXPIRE_HOURS,
        left_expire_hours_start: config.SUBSCRIPTION_LEFT_EXPIRE_HOURS_START,
        generate_invoice: config.SUBSCRIPTION_INVOICE_GENERATE,
        allowCardCharge: config.SUBSCRIPTION_CARDS_CHARGE,
        recurring_charge_hour: config.SUBSCRIPTION_CARDS_HOURS,
        recurring_retry: config.SUBSCRIPTION_CARDS_RETRY,
        syncNow: config.SUBSCRIPTION_SYNC_NOW,
      },
      payment: {
        payment_card_sync: config.PAYMENT_CARD_SYNC,
      },
      redis: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
      },
      hosted: {
        processCards: config.CARDS_PROCESS,
        processShippings: config.SHIPPINGS_PROCESS,
        processSubscriptions: config.SUBSCRIPTION_PROCESS,
        processPostalMethods: config.POSTALMETHODS_PROCESS,
        processNotifications: config.NOTIFICATIONS_PROCESS,
        processCredits: config.CREDITS_PROCESS,
        processAuthorize: config.AUTHORIZE_PROCESS,
        processClover: config.CLOVER_PROCESS,
        processCheckeeper: config.CHECKEEPER_PROCESS,
        processInvoices: config.INVOICES_PROCESS,
        processTwilio: config.TWILIO_PROCESS,
        processTelegramBots: config.TELEGRAM_BOTS_PROCESS,
      },
      postal: {
        sendInvoices: config.POSTAL_SEND_INVOICES,
      },
      telegram: {
        polling: config.TELEGRAM_POLLING,
        webhookurl: config.TELEGRAM_WEBHOOKURL,
      },
      graylog: {
        host: config.GRAYLOG_HOST,
        port: config.GRAYLOG_PORT,
        name: config.GRAYLOG_NAME,
      },
      public_url: config.PUBLIC_URL,
      square_prod: config.SQUARE_PROD,
      authorize_prod_endpoint: config.AUTHORIZE_ENDPOINT,
      clover_prod: config.CLOVER_PROD,
    };
  

    this.validateConfig();
  
  }
  // static getConfigFromClient() {
  //   Config.initConfig();
  //   // console.log(Config.myConfig, 'config03');
  //   return Config.myConfig;
  // }
  static getConfigFromClient(clientConfig) {
    Config.initConfig(clientConfig);
    console.log(Config.myConfig, 'config03');
    return Config.myConfig;
  }
}

module.exports = { Config };
