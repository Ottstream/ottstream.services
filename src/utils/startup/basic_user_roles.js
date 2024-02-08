const { permissionRepository, roleRepository, userRepository } = require('../../repository');
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
    const getPermission = await ensurePermissionExists('getPermissions');
    const managePermission = await ensurePermissionExists('managePermissions');
    const getRole = await ensurePermissionExists('getRoles');
    const manageRoles = await ensurePermissionExists('manageRoles');

    return roleRepository.createRole({
      keyword: name,
      name,
      permissions: [getPermission.id, managePermission.id, getRole.id, manageRoles.id],
    });
  }
  return role;
};

const ensureSuperAdminExists = async (email, password) => {
  const user = await userRepository.getUserByEmail(email);
  logger.info('Checking Basic User and Permissions...');
  if (!user) {
    logger.info(`Creating Super Admin User With Permissions (${email}, ${password})`);
    await ensureRoleExists('superadmin');
    return userRepository.createUser(
      {
        email,
        firstname: 'Super',
        lastname: 'Admin',
        // eslint-disable-next-line no-undef
        password,
      },
      'superadmin'
    );
  }
  return user;
};

const checkBasicRoles = async () => {
  await ensureSuperAdminExists('superadmin@ottstream.live', 'asdasd321');
};

module.exports = {
  checkBasicRoles,
};
