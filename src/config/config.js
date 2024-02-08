// const dotenv = require('dotenv');
// const path = require('path');
// const Joi = require('joi');

// dotenv.config({ path: path.join(__dirname, '../../.env') });

// const envVarsSchema = Joi.object()
//   .keys({
//     NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
//     PUBLIC_URL: Joi.string().default(null),
//     SYNC_MIDDLEWARE: Joi.boolean().default(false),
//     SYNC_GENERATE_LOGIN: Joi.boolean().default(true),
//     PORT: Joi.number().default(3000),
//     GRAYLOG_NAME: Joi.string().default('local'),
//     GRAYLOG_HOST: Joi.string().default(null),
//     GRAYLOG_PORT: Joi.string().default(12201),
//     REDIS_HOST: Joi.string().default('127.0.0.1'),
//     REDIS_PORT: Joi.string().default(6379),
//     REDIS_PASSWORD: Joi.string().default('master_password'),
//     SYNC_URL: Joi.string().default('https://ott/api/OttProvider'),
//     SYNC_PROVIDER_PULL_TIME: Joi.number().default(30),
//     TAXJAR_API_TOKEN: Joi.string().default('e5437df7aef675ecb405bdfeeebdfb3f'),
//     FRONT_URL: Joi.string().required().description('front url'),
//     SMARTSTREET_SOURCE_URL: Joi.string()
//       .required()
//       .description('fsmartstreet validation source url')
//       .default('http://localhost:5020'),
//     MONGODB_URL: Joi.string().required().description('Mongo DB url'),
//     FILE_STORAGE_PATH: Joi.string().required().description('File Storage full path'),
//     STORAGE_ROOT_PATH: Joi.string().description('File Storage root path').default('./'),
//     TEMPLATE_PATH: Joi.string().description('template_path').default('../../'),
//     JWT_SECRET: Joi.string().required().description('JWT secret key'),
//     JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(1).description('minutes after which access tokens expire'),
//     JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
//     SMTP_FULL: Joi.string().description('nodemail connection string'),
//     SMTP_HOST: Joi.string().description('server that will send the emails'),
//     SMTP_PORT: Joi.number().description('port to connect to the email server'),
//     SMTP_USERNAME: Joi.string().description('username for email server'),
//     MAXMIND_DAILY_LIMIT: Joi.number().description('maxmind request daily limit').default(10),
//     SMTP_PASSWORD: Joi.string().description('password for email server'),
//     EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
//     SMART_STREET_KEY: Joi.string().description('smart street key').default('14477575717190509'),
//     SMART_STREET_AUTH_ID: Joi.string().description('smart street auth ud').default('1963a2f6-470c-96a9-b62e-6e16b34f9032'),
//     SMART_STREET_AUTH_TOKEN: Joi.string().description('smart street auth token').default('SyN5kyNQ0zyPmA83vd6v'),
//     SYNC_LOCATION_PULL_TIME: Joi.number().description('sync location pull time').default(2),
//     SYNC_LOCATIONS_PULL_TIME: Joi.number().description('sync locations pull time').default(1),
//     GOOGLE_CONSUMER_KEY: Joi.string().description('google oauth client id'),
//     GOOGLE_CONSUMER_SECRET: Joi.string().description('google oauth secret'),
//     GOOGLE_CALLBACK_URL: Joi.string().description('google oauth callback url'),
//     EQUIPMENT_PER_PROVIDER: Joi.boolean().description('equipment per provider').default(true),
//     SUBSCRIPTION_LEFT_EXPIRE_HOURS: Joi.number().description('subscription left expire hours').default(504),
//     SUBSCRIPTION_LEFT_EXPIRE_HOURS_START: Joi.number().description('subscription left expire hours start').default(120),
//     SUBSCRIPTION_INVOICE_GENERATE: Joi.bool().description('generate invoices or not').default(true),
//     SUBSCRIPTION_PROCESS: Joi.bool().description('update subscription states').default(true),
//     SUBSCRIPTION_CARDS_CHARGE: Joi.bool().description('charge from cards in requrring or not').default(false),
//     SUBSCRIPTION_CARDS_HOURS: Joi.number().description('recurring subscription charge hours').default(24),
//     SUBSCRIPTION_CARDS_RETRY: Joi.number().description('recurring subscription charge retry attempts').default(2),
//     SUBSCRIPTION_SYNC_NOW: Joi.bool().description('on locaiton update fast sync to server or not').default(false),
//     POSTALMETHODS_PROCESS: Joi.bool().description('process postal methods service to update state from.').default(false),
//     CARDS_PROCESS: Joi.bool().description('update cards states in authorize').default(false),
//     NOTIFICATIONS_PROCESS: Joi.bool().description('process notifications to generate from comments').default(false),
//     CREDITS_PROCESS: Joi.bool().description('process credits to stop or do other actions').default(false),
//     AUTHORIZE_PROCESS: Joi.bool().description('process authorize voides, statuses').default(true),
//     CLOVER_PROCESS: Joi.bool().description('process clover voides, statuses').default(true),
//     SHIPPINGS_PROCESS: Joi.bool().description('update shhippings states in easyship').default(false),
//     CHECKEEPER_PROCESS: Joi.bool().description('update check states in checkeeper').default(false),
//     INVOICES_PROCESS: Joi.bool().description('process bill invoices with statistics').default(true),
//     POSTAL_SEND_INVOICES: Joi.bool().description('send postal invoices automaticaly').default(false),
//     TWILIO_PROCESS: Joi.bool().description('process twilio sms checks').default(false),
//     TELEGRAM_BOTS_PROCESS: Joi.bool().description('process telegram bots').default(false),
//     TELEGRAM_POLLING: Joi.bool().description('polling on or off').default(true),
//     TELEGRAM_WEBHOOKURL: Joi.string().description('webhook url'),
//     PAYMENT_CARD_SYNC: Joi.bool().description('sync payment cards with gateway or not').default(true),
//     SQUARE_PROD: Joi.bool().description('square prod or sandbox').default(false),
//     AUTHORIZE_ENDPOINT: Joi.bool().description('authorize prod or sandbox').default(false),
//     CLOVER_PROD: Joi.bool().description('clover prod or sandbox').default(false),
//   })
//   .unknown();

// const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

// if (error) {
//   throw new Error(`Config validation error: ${error.message}`);
// }

// module.exports = {
//   env: envVars.NODE_ENV,
//   global: {
//     equipment_per_provider: envVars.EQUIPMENT_PER_PROVIDER,
//   },
//   port: envVars.PORT,
//   front_url: envVars.FRONT_URL,
//   file: {
//     file_storage_path: envVars.FILE_STORAGE_PATH,
//     root_path: envVars.STORAGE_ROOT_PATH,
//     template_path: envVars.TEMPLATE_PATH,
//   },
//   mongoose: {
//     url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '' : ''),
//     options: {
//       minPoolSize: 90,
//     },
//   },
//   jwt: {
//     secret: envVars.JWT_SECRET,
//     accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
//     refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
//     resetPasswordExpirationMinutes: 10,
//   },
//   sync: {
//     live_url: envVars.SYNC_URL,
//     locations_pull_time: envVars.SYNC_LOCATIONS_PULL_TIME,
//     provider_pull_time: envVars.SYNC_PROVIDER_PULL_TIME,
//     sync_middleware: envVars.SYNC_MIDDLEWARE,
//     generate_login: envVars.SYNC_GENERATE_LOGIN,
//   },
//   google: {
//     clientId: envVars.GOOGLE_CONSUMER_KEY,
//     secret: envVars.GOOGLE_CONSUMER_SECRET,
//     callbackUrl: envVars.GOOGLE_CALLBACK_URL,
//   },
//   smartStreet: {
//     front_url: envVars.SMARTSTREET_SOURCE_URL,
//     publicKey: envVars.SMART_STREET_KEY,
//     smartyStreetAuthId: envVars.SMART_STREET_AUTH_ID,
//     smartyStreetAuthToken: envVars.SMART_STREET_AUTH_TOKEN,
//   },
//   taxJar: {
//     token: envVars.TAXJAR_API_TOKEN,
//   },
//   email: {
//     smtp: {
//       full: envVars.SMTP_FULL,
//       host: envVars.SMTP_HOST,
//       port: envVars.SMTP_PORT,
//       auth: {
//         user: envVars.SMTP_USERNAME,
//         pass: envVars.SMTP_PASSWORD,
//       },
//     },
//     from: envVars.EMAIL_FROM,
//   },
//   maxmind: {
//     dailyLimit: envVars.MAXMIND_DAILY_LIMIT,
//   },
//   subscription: {
//     left_expire_hours: envVars.SUBSCRIPTION_LEFT_EXPIRE_HOURS,
//     left_expire_hours_start: envVars.SUBSCRIPTION_LEFT_EXPIRE_HOURS_START,
//     generate_invoice: envVars.SUBSCRIPTION_INVOICE_GENERATE,
//     allowCardCharge: envVars.SUBSCRIPTION_CARDS_CHARGE,
//     recurring_charge_hour: envVars.SUBSCRIPTION_CARDS_HOURS,
//     recurring_retry: envVars.SUBSCRIPTION_CARDS_RETRY,
//     syncNow: envVars.SUBSCRIPTION_SYNC_NOW,
//   },
//   payment: {
//     payment_card_sync: envVars.PAYMENT_CARD_SYNC,
//   },
//   redis: {
//     host: envVars.REDIS_HOST,
//     port: envVars.REDIS_PORT,
//     password: envVars.REDIS_PASSWORD,
//   },
//   hosted: {
//     processCards: envVars.CARDS_PROCESS,
//     processShippings: envVars.SHIPPINGS_PROCESS,
//     processSubscriptions: envVars.SUBSCRIPTION_PROCESS,
//     processPostalMethods: envVars.POSTALMETHODS_PROCESS,
//     processNotifications: envVars.NOTIFICATIONS_PROCESS,
//     processCredits: envVars.CREDITS_PROCESS,
//     processAuthorize: envVars.AUTHORIZE_PROCESS,
//     processClover: envVars.CLOVER_PROCESS,
//     processCheckeeper: envVars.CHECKEEPER_PROCESS,
//     processInvoices: envVars.INVOICES_PROCESS,
//     processTwilio: envVars.TWILIO_PROCESS,
//     processTelegramBots: envVars.TELEGRAM_BOTS_PROCESS,
//   },
//   postal: {
//     sendInvoices: envVars.POSTAL_SEND_INVOICES,
//   },
//   telegram: {
//     polling: envVars.TELEGRAM_POLLING,
//     webhookurl: envVars.TELEGRAM_WEBHOOKURL,
//   },
//   graylog: {
//     host: envVars.GRAYLOG_HOST,
//     port: envVars.GRAYLOG_PORT,
//     name: envVars.GRAYLOG_NAME,
//   },
//   public_url: envVars.PUBLIC_URL,
//   square_prod: envVars.SQUARE_PROD,
//   authorize_prod_endpoint: envVars.AUTHORIZE_ENDPOINT,
//   clover_prod: envVars.CLOVER_PROD,
// };
const {Config} = require('ottstream.services.config');
const config = Config.getConfigFromClient(process.env)
module.exports = config;