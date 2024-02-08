const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

// eslint-disable-next-line no-unused-vars
const { clientActivityRepository } = repositories;

class ClientActivityService {
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  static async AddPackageUpdateLog(info) {
    logger.info('adding package update log to client activity');
    try {
      await clientActivityRepository.createClientActivity({
        user: info.user ? info.user._id.toString() : null,
        client: info.client ? info.client : null,
        provider: info.provider ? info.provider : null,
        userDescription: !info.user ? 'System' : `${info.user.firstname} ${info.user.lastname}`,
        type: 'PACKAGE_UPDATE',
        action: { ...info.action, name: 'Client Package Updated' },
        actionDescription: 'Client Package Updated',
        typeDescription: 'Client Package Updated,',
      });
      return true;
      // TODO from here tests
    } catch (ex) {
      return false;
    }
  }
}

module.exports = ClientActivityService;
