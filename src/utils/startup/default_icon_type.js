const { iconTypeRepository } = require('../../repository');
const { checkOttProviderPermissions } = require('./check_permissions');
const logger = require('../logger/logger');

const ensureDefaultIconTypeExists = async () => {
  logger.info('Checking  Default IconType...');
  const list = await iconTypeRepository.queryIconTypes({}, {}, {});
  if (list.results.length === 0) {
    logger.info(`Creating Default IconType (1x1)`);
    await iconTypeRepository.createIconType(
      {
        name: 'Default',
        ratiox: 1,
        ratioy: 1,
        contour: 'square',
        widths: ['100'],
        formats: ['jpg', 'png'],
      },
      {}
    );
  }

  await checkOttProviderPermissions(['getIconTypes', 'manageIconTypes']);
};

const checkDefaultIconType = async () => {
  await ensureDefaultIconTypeExists();
};

module.exports = {
  checkDefaultIconType,
};
