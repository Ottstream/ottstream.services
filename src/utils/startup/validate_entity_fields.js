const logger = require('../logger/logger');

const validateClientFields = async () => {
  logger.info(`validate if clients fields match with table counts.`);
};

module.exports = {
  validateClientFields,
};
