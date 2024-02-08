const { channelIconSetTypeRepository } = require('../../repository');
const { checkOttProviderPermissions } = require('./check_permissions');
const logger = require('../logger/logger');

const ensureDefaultChannelIconSetExists = async (name) => {
  logger.info('Checking  DefaultChannelIconSet...');
  const list = await channelIconSetTypeRepository.queryChannelIconSetTypes({}, {}, {});
  if (list.results.length === 0) {
    logger.info(`Creating DefaultChannelIconSet (${name})`);
    await channelIconSetTypeRepository.createChannelIconSetType({ name }, {});
  }

  await checkOttProviderPermissions(['getChannelIconSetTypes', 'manageChannelIconSetTypes']);
};

const checkDefaultChannelIconSet = async () => {
  await ensureDefaultChannelIconSetExists('Default');
};

module.exports = {
  checkDefaultChannelIconSet,
};
