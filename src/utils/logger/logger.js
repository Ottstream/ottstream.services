const graylog2 = require('graylog2');
const os = require('os');
const winston = require('winston');
const config = require('../../config/config');
// console.log(config,4541536);

// eslint-disable-next-line new-cap
const grayLogger = new graylog2.graylog({
  servers: [{ host: config.graylog.host, port: config.graylog.port }],
  hostname: os.hostname(), // the name of this host
  // (optional, default: os.hostname())
  facility: config.graylog.name, // the facility for these log messages
  // (optional, default: "Node.js")
  bufferSize: 1350, // max UDP packet size, should never exceed the
  // MTU of your system (optional, default: 1400)
});

grayLogger.on('error', function (error) {
  // eslint-disable-next-line no-console
  console.error('Error while trying to write to graylog2:', error);
});

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const winstonLogger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message }) => `${level}: ${message}`)
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

const logger = {
  info(e, send = true) {
    // eslint-disable-next-line no-console
    winstonLogger.info(e);
    if (send && config.graylog.name !== 'local') {
      grayLogger.info(e);
    }
  },
  error(e, send = true) {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    winstonLogger.error(e);
    if (send) {
      grayLogger.error(e.message);
    }
  },
  warn(e, send = true) {
    // eslint-disable-next-line no-console
    winstonLogger.warn(e);
    if (send) {
      grayLogger.warn(e);
    }
  },
};

module.exports = logger;
