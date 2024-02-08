const logger = require('../logger/logger');

const checkOttProviderPermissions = async (list) => {
  logger.info(`checking Permissions ${list.toString()}`);
};

module.exports = {
  checkOttProviderPermissions,
};
