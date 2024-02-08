const { permissionRepository, roleRepository, userRepository, ottProviderRepository } = require('../../repository');
const logger = require('../logger/logger');

const ensurePermissionExists = async (name) => {
  const permission = await permissionRepository.getPermissionsByKeyword(name);
  if (!permission) {
    return permissionRepository.createPermission({
      keyword: name,
      description: name,
    });
  }
  return permission;
};

const ensureRoleExists = async (name) => {
  const role = await roleRepository.getRoleByKeyword(name);
  if (!role) {
    const getChannel = await ensurePermissionExists('getChannels');
    const manageChannel = await ensurePermissionExists('manageChannels');
    const getChannelPackage = await ensurePermissionExists('getChannelPackages');
    const manageChannelPackage = await ensurePermissionExists('manageChannelPackages');

    return roleRepository.createRole({
      keyword: name,
      name,
      permissions: [getChannel.id, manageChannel.id, getChannelPackage.id, manageChannelPackage.id],
    });
  }
  return role;
};

const ensureUserExists = async (email, password) => {
  const user = await userRepository.getUserByEmail(email);
  logger.info('Checking Basic User and Permissions...');
  if (!user) {
    logger.info(`Creating Super Admin User With Permissions (super@puper.com, asdasd321)`);
    await ensureRoleExists('ottprovider');
    return userRepository.createUser(
      {
        email,
        firstname: 'OttProvider',
        lastname: 'Base',
        // eslint-disable-next-line no-undef
        password,
      },
      'ottprovider'
    );
  }
  return user;
};

const ensureBasicOttProviderExists = async (email, password) => {
  logger.info('Checking Basic OttProvider...');
  let ottProvider = await ottProviderRepository.getBaseOttProvider();
  if (!ottProvider) {
    logger.info(`Creating OttProvider Base with (${email}, ${password})`);
    const user = await ensureUserExists(email, password);
    ottProvider = await ottProviderRepository.createBaseOttProvider(
      {
        email,
      },
      user
    );
  }
};

const checkBasicOttProvider = async () => {
  await ensureBasicOttProviderExists('ottproviderbase@ottstream.live', 'asdasd321');
};

module.exports = {
  checkBasicOttProvider,
};
