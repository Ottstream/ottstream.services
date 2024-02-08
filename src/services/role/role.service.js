const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');
const OttPermission = require('./models/ott_permission.model');

const { ottProviderRepository } = repositories;

const flussonicsReadPermissions = ['getFlussonics'];

const channelPermissions = [
  'createChannel',
  'getChannels',
  'syncChannelsActions',
  'getPackageChannels',
  'getChannel',
  'updateChannel',
  'deleteChannel',
  'updateChannelOrder',
];

const ageGroupPermissions = ['createAgeGroup', 'getAgeGroups', 'getAgeGroup', 'updateAgeGroup', 'deleteAgeGroup'];

const clientPermissions = [
  'viewClientPage',
  'createClient',
  'getClients',
  'getClient',
  'updateClient',
  'deleteClient',
  'clientActionSettings',
  'clientActionDelete',
  'getClientSettings',
  'updateClientSettings',
  'clientCheckEmailPhone',
  'createClientPaymentMethod',
  'getClientPaymentMethods',
  'getClientPaymentMethod',
  'getClientActivitys',
  'updateClientPaymentMethod',
  'deleteClientPaymentMethod',
  'getClientPaymentMethodByClient',
  'paymentMethodsTypes',
  'createClientLocation',
  'getClientLocations',
  'getClientLocationRandomLoginPassword',
  'getClientLocation',
  'updateClientLocation',
  'deleteClientLocation',
  'getClientLocationPackagesByRoom',
  'resetPassword',
  'getClientLocationByClient',
  'createClientProfile',
  'getClientProfiles',
  'getClientProfile',
  'updateClientProfile',
  'deleteClientProfile',
  'createClientUsedDevice',
  'getClientUsedDevices',
  'getClientUsedDevice',
  'updateClientUsedDevice',
  'deleteClientUsedDevice',
  'createClientPackage',
  'getClientPackages',
  'getClientPackage',
  'updateClientPackage',
  'deleteClientPackage',
  'getClientPackageByClient',
  'updateClientEmail',
  'getClientBalanceCredit',
];

const countryPermissions = ['createCountry', 'getCountrys', 'getCountry', 'updateCountry', 'deleteCountry'];

const currencyPermissions = ['createCurrency', 'getCurrencys', 'getCurrency', 'updateCurrency', 'deleteCurrency'];

const currencyCountryPermissions = [
  'createCurrencyCountry',
  'getCurrencyCountrys',
  'getCurrencyCountry',
  'updateCurrencyCountry',
  'deleteCurrencyCountry',
];

const discountReadPermissions = ['getDiscounts', 'getDiscount'];

const discountPermissions = [
  'createDiscount',
  'updateDiscount',
  'deleteDiscount',
  'sendNotificationAction',
  'discountActions',
  'discountPriceGroupSettings',
].concat(discountReadPermissions);

const equipmentReadPermissions = ['getEquipments', 'getEquipment'];

const equipmentPermissions = [
  'createEquipment',
  'updateEquipment',
  'deleteEquipment',
  'equipmentEnableDisableAction',
].concat(equipmentReadPermissions);

const commentReadPermissions = ['getComments', 'getComment'];
const commentPermissions = ['createComment', 'updateComment', 'deleteComment'].concat(commentReadPermissions);

const helpReadPermissions = ['getHelps', 'getHelp'];
const helpPermissions = ['createHelp', 'updateHelp', 'deleteHelp'].concat(helpReadPermissions);

const chatReadPermissions = ['getChats', 'getChat'];
const chatPermissions = ['createChat', 'updateChat', 'deleteChat'].concat(chatReadPermissions);

const calendarReadPermissions = ['getCalendars', 'getCalendar'];
const calendarPermissions = ['createCalendar', 'updateCalendar', 'deleteCalendar'].concat(calendarReadPermissions);

const calendarEventReadPermissions = ['getCalendarEvents', 'getCalendarEvent'];
const calendarEventPermissions = ['createCalendarEvent', 'updateCalendarEvent', 'deleteCalendarEvent'].concat(
  calendarEventReadPermissions
);

const notificationReadPermissions = ['getNotifications', 'getNotification'];

const notificationPermissions = ['createNotification', 'updateNotification', 'deleteNotification'].concat(
  notificationReadPermissions
);

const shippingReadPermissions = ['getClientShippings', 'getShipping'];

const shippingAllReadPermissions = ['getShippings'];

const shippingPermissions = ['createShipping', 'updateShipping', 'deleteShipping']
  .concat(shippingReadPermissions)
  .concat(shippingAllReadPermissions);

const equipmentTypeReadPermissions = ['getEquipmentTypes', 'getEquipmentType'];

const equipmentTypePermissions = ['createEquipmentType', 'updateEquipmentType', 'deleteEquipmentType'].concat(
  equipmentTypeReadPermissions
);

const filePermissions = ['manageFiles', 'getFiles', 'manageChannels', 'updateFile', 'deleteFile'];

const groupPermissions = [
  'manageGroups',
  'getGroups',
  'getGroup',
  'updateGroup',
  'deleteGroup',
  'disableEnableGroup',
  'disableEnableGroups',
];

const iconPermissions = [
  'createIcon',
  'getIcons',
  'getIcon',
  'updateIcon',
  'deleteIcon',
  'disableEnableIcon',
  'disableEnableIcons',
];

const iconTypePermissions = ['createIconType', 'getIconTypes', 'getIconType', 'updateIconType', 'deleteIconType'];

const languagePermissions = ['createLanguage', 'getLanguages', 'getLanguage', 'updateLanguage', 'deleteLanguage'];

const languageUnitPermissions = [
  'createLanguageUnit',
  'getLanguageUnits',
  'getLanguageUnit',
  'updateLanguageUnit',
  'deleteLanguageUnit',
];

const languageUnitTranslationPermissions = [
  'createLanguageUnitTranslation',
  'getLanguageUnitTranslations',
  'updateLanguageUnitTranslation',
  'deleteLanguageUnitTranslation',
];

const ottProviderPermissionsForBase = [
  'getRegistrationProviders',
  'registrationApprove',
  'approveOttProvider',
  'syncLive',
  'ottSync',
  'packageSync',
];

const ottProviderPermissions = [
  'createOttProvider',
  'getOttProviders',
  'addByAdmin',
  'getOttProvider',
  'updateOttProvider',
  'deleteOttProvider',
  'getCheckOttProviderKey',
  'getOttProviderSalesTax',
  'updateOttProviderSalesTax',
  'getOttProviderSettings',
  'updateOttProviderSettings',
  'createOttProviderEmail',
  'getOttProviderEmails',
  'getOttProviderEmail',
  'updateOttProviderEmail',
  'deleteOttProviderEmail',
  'createOttProviderPrinter',
  'getOttProviderPrinters',
  'updateOttProviderPaymentMethodOptions',
  'getOttProviderPaymentMethodOptions',
  'createOttProviderPaymentMethod',
  'getOttProviderPaymentMethods',
  'getOttProviderPaymentMethod',
  'updateOttProviderPaymentMethod',
  'deleteOttProviderPaymentMethod',
  'getOttProviderPrinter',
  'updateOttProviderPrinter',
  'deleteOttProviderPrinter',
  'createOttProviderPhone',
  'getOttProviderPhones',
  'getOttProviderPhone',
  'updateOttProviderPhone',
  'deleteOttProviderPhone',
  'createOttProviderAddress',
  'getOttProviderAddresses',
  'getOttProviderAddressesByProviderId',
  'getOttProviderAddress',
  'updateOttProviderAddress',
  'deleteOttProviderAddress',
  'getOttProviderInfo',
  'updateOttProviderInfo',
  'getOttProviderUi',
  'updateOttProviderUi',
  'getOttProviderShippingProvider',
  'updateOttProviderShippingProvider',
  'getOttProviderShippingProviderMethods',
  'getOttProviderConversationProvider',
  'updateOttProviderConversationProvider',
  'getOttProviderPaymentGateway',
  'updateOttProviderPaymentGateway',
  'getOttProviderPaymentGatewayMethods',
  'getOttProviderInvoice',
  'updateOttProviderInvoice',
  'printExampleInvoice',
  'getOttProviderOtherApi',
  'updateOttProviderOtherApi',
  'getOttProviderOtherApiMethods',
  'getOttProviderBalanceCredit',
  'actionSettings',
  'ottProviderActionDelete',
  'getOttProviderPermission',
  'updateOttProviderPermission',
];

const packageReadPermissions = ['getPackages', 'getPackage'];

const packagePermissions = [
  'createPackage',
  'updatePackage',
  'deletePackage',
  'createDefaultPrice',
  'createPrice',
  'addPrice',
  'getPackagePrice',
  'disableEnablePackage',
  'disableEnablePackages',
].concat(packageReadPermissions);

const creditCardPermissions = [
  'createCreditCard',
  'getCreditCards',
  'getCreditCard',
  'updateCreditCard',
  'deleteCreditCard',
];

const balancePermissions = ['addBalance', 'payBalance'];

const creditPermissions = ['createCredit', 'stopCredit', 'stopClientCredit'];

const invoiceReadPermissions = ['getBillInvoices', 'getInvoice', 'getInvoices'];

const invoicePermissions = ['createInvoice', 'payInvoice', 'clientOrderAction', 'payInvoice', 'updateShippingInfo'].concat(
  invoiceReadPermissions
);

const paymentGatewayPermissions = [
  'createPaymentGateway',
  'getPaymentGateways',
  'getPaymentGateway',
  'updatePaymentGateway',
  'deletePaymentGateway',
];

const paymentImplementationPermissions = [
  'createPaymentImplementation',
  'getPaymentImplementations',
  'getPaymentImplementation',
  'updatePaymentImplementation',
  'deletePaymentImplementation',
];

const paymentMethodPermissions = [
  'createPaymentMethod',
  'getPaymentMethods',
  'getPaymentMethod',
  'updatePaymentMethod',
  'deletePaymentMethod',
];

const shippingProviderPermissions = [
  'createShippingProvider',
  'getShippingProviders',
  'getShippingProvider',
  'updateShippingProvider',
  'deleteShippingProvider',
];

const transactionPermissions = ['createTransaction', 'getClientTransactions', 'viewTransactionPage', 'getTransactions'];

const priceGroupReadPermissions = ['getPriceGroups', 'getPriceGroup'];

const priceGroupPermissions = ['createPriceGroup', 'updatePriceGroup', 'deletePriceGroup'].concat(priceGroupReadPermissions);

const rolePermissions = ['createRole', 'getRoles', 'getOttRoles', 'getRole', 'updateRole', 'deleteRole'];

const permissionPermissions = [
  'createPermission',
  'getPermissions',
  'getPermission',
  'updatePermission',
  'deletePermission',
];

const serverReadPermissions = ['getServers', 'getServer'];

const serverPermissions = [
  'createServer',
  'updateServer',
  'deleteServer',
  'disableEnableServer',
  'disableEnableServers',
].concat(serverReadPermissions);

const bankNameReadPermissions = ['getBankNames', 'getBankName'];

const bankNamePermissions = ['createBankName', 'updateBankName', 'deleteBankName'].concat(bankNameReadPermissions);

const subscriptionPermissions = [
  'getLocationSubscriptions',
  'subscribeLocationToPackage',
  'checkout',
  'unsubscribeLocationFromPackage',
  'updateLocationSubscriptions',
  'generateLocationInvoice',
];

const systemPermissions = [
  'createSystemVariable',
  'getSystemVariables',
  'getSystemVariable',
  'updateSystemVariable',
  'deleteSystemVariable',
];

const userActivityReadPermissions = ['getUserActivitys'];

const userActivityPermissions = [].concat(userActivityReadPermissions);

const userPermissions = [
  'createUser',
  'getUsers',
  'resetLoginCount',
  'emailResetPassword',
  'generateTelegramPassword',
  'resetPassword',
  'getRegistrationUsers',
  'getActiveUsers',
  'getUserSettings',
  'getUser',
  'updateUser',
  'deleteUser',
  'getPermissionUser',
  'deleteMultiply',
  'userEnableDisableAction',
];

const basePermissions = [
  'getPermissionUser',
  'getCalendarUsers',
  'getOttProviderAddressesByProviderId',
  'getOttProviderEmails',
  'getOttProviderPaymentGateway',
  'getOttProviderEmail',
  'getUserSettings',
  'getUser',
  'UserCheckEmail',
  'voidTransaction',
  'sendTransaction',
  'printTransaction',
  'UserCheckPhone',
  'setUserSettings',
  'getOttProvider',
  'getOttRoles',
  'getCurrencys',
  'getFullCalendar',
  'updateUser',
  'getOttProviderOtherApi',
  'getOttProviderOtherApiMethods',
  'getClientActivitys',
  'getOttProviderShippingProvider',
  'updateOttProviderShippingProvider',
  'getOttProviderConversationProvider',
  'updateOttProviderConversationProvider',
  'getOttProviderShippingProviderMethods',
  'updateNotification',
];

const permissionsForBaseProvider = [].concat(ottProviderPermissionsForBase);

const allPermissions = []
  .concat(channelPermissions)
  .concat(ageGroupPermissions)
  .concat(clientPermissions)
  .concat(countryPermissions)
  .concat(calendarPermissions)
  .concat(calendarEventPermissions)
  .concat(currencyPermissions)
  .concat(currencyCountryPermissions)
  .concat(discountPermissions)
  .concat(equipmentPermissions)
  .concat(commentPermissions)
  .concat(helpPermissions)
  .concat(chatPermissions)
  .concat(notificationPermissions)
  .concat(shippingPermissions)
  .concat(equipmentTypePermissions)
  .concat(filePermissions)
  .concat(groupPermissions)
  .concat(iconPermissions)
  .concat(iconTypePermissions)
  .concat(languagePermissions)
  .concat(languageUnitPermissions)
  .concat(languageUnitTranslationPermissions)
  .concat(ottProviderPermissions)
  .concat(packagePermissions)
  .concat(creditCardPermissions)
  .concat(balancePermissions)
  .concat(creditPermissions)
  .concat(invoicePermissions)
  .concat(paymentGatewayPermissions)
  .concat(paymentImplementationPermissions)
  .concat(paymentMethodPermissions)
  .concat(shippingProviderPermissions)
  .concat(transactionPermissions)
  .concat(priceGroupPermissions)
  .concat(rolePermissions)
  .concat(permissionPermissions)
  .concat(serverPermissions)
  .concat(subscriptionPermissions)
  .concat(systemPermissions)
  .concat(userPermissions)
  .concat(userActivityPermissions)
  .concat(bankNamePermissions)
  .concat(flussonicsReadPermissions);

const redirectUrls = [
  {
    url: '/review',
    permission: 'getRegistrationProviders',
  },
  {
    url: '/providers-resellers',
    permission: 'getOttProviders',
  },
  {
    url: '/users/list',
    permission: 'getUsers',
  },
  {
    url: '/users/activity',
    permission: 'getUsers',
  },
  {
    url: '/clients/list',
    permission: 'getClients',
  },
  {
    url: '/clients/payments',
    permission: 'getBillInvoices',
  },
  {
    url: '/transactions',
    permission: 'getTransactions',
  },
  {
    url: '/packages',
    permission: 'getPackages',
  },
  {
    url: '/transactions',
    permission: 'getTransactions',
  },
  {
    url: '/equipments',
    permission: 'getEquipments',
  },
  {
    url: '/discounts',
    permission: 'getDiscounts',
  },
];

const roles = {
  admin: {
    permissions: basePermissions.concat(allPermissions).concat(['getClientList']).concat(chatPermissions),
    excludes: [],
    searchExcludes: [],
    redirect: '/review',
  },
  advancedCashier: {
    permissions: basePermissions.concat(chatPermissions).concat(['getClientList']).concat(shippingReadPermissions),
    excludes: [],
    searchExcludes: [],
    redirect: '/error/forbidden',
  },
  equipmentInstaller: {
    permissions: basePermissions
      .concat(chatPermissions)
      .concat(shippingReadPermissions)
      .concat(calendarPermissions)
      .concat(calendarEventPermissions),
    excludes: [],
    searchExcludes: [],
    redirect: '/packages',
  },
  cashier: {
    permissions: basePermissions
      .concat([])
      .concat(chatPermissions)
      .concat(clientPermissions)
      .concat(calendarPermissions)
      .concat(calendarEventPermissions)
      .concat(transactionPermissions)
      .concat(serverReadPermissions)
      .concat(packageReadPermissions)
      .concat(equipmentReadPermissions)
      .concat(equipmentTypeReadPermissions)
      .concat(commentPermissions)
      .concat(helpPermissions)
      .concat(notificationReadPermissions)
      .concat(shippingReadPermissions)
      .concat(priceGroupReadPermissions)
      .concat(invoicePermissions)
      .concat(subscriptionPermissions)
      .concat(channelPermissions)
      .concat(discountReadPermissions)
      .concat(bankNamePermissions)
      .concat(userActivityReadPermissions),
    excludes: ['viewTransactionPage', 'viewClientPage', 'getTransactions'],
    searchExcludes: [
      {
        permission: 'getClients',
        type: 'limitBySearch',
      },
      {
        permission: 'getTransactions',
        type: 'limitBySearch',
      },
    ],
    redirect: '/packages',
  },
  support: {
    permissions: basePermissions
      .concat([])
      .concat(clientPermissions)
      .concat(serverReadPermissions)
      .concat(packageReadPermissions)
      .concat(equipmentReadPermissions)
      .concat(equipmentTypeReadPermissions)
      .concat(commentPermissions)
      .concat(helpPermissions)
      .concat(calendarPermissions)
      .concat(calendarEventPermissions)
      .concat(notificationReadPermissions)
      .concat(shippingReadPermissions)
      .concat(priceGroupReadPermissions)
      .concat(subscriptionPermissions)
      .concat(channelPermissions)
      .concat(discountReadPermissions)
      .concat(userActivityReadPermissions)
      .concat(bankNamePermissions),
    excludes: [],
    searchExcludes: [],
    redirect: '/error/forbidden', // TODO
  },
};

class RoleService {
  constructor() {
    logger.info(`RoleService() initiated`);
  }

  static SyncRolePermissionsDb() {
    return new Date();
  }

  static GetUserPermissions(user, withRedirect = false) {
    let currentPermissions = [];
    const isCashier = user?.rolesInfo?.cashier;
    const isAdvancedCashier = user?.rolesInfo?.advancedCashier;
    const isEquipmentInstaller = user?.rolesInfo?.equipmentInstaller;
    const isSupport = user?.rolesInfo?.support;
    const isAdmin = user?.rolesInfo?.admin;
    let redirect = null;
    if (isSupport) {
      currentPermissions = currentPermissions.concat(
        roles.support.permissions.filter((r) => !roles.support.excludes.filter((a) => a === r).length)
      );
      redirect = roles.support.redirect;
    }
    if (isCashier) {
      currentPermissions = currentPermissions.concat(
        roles.cashier.permissions.filter((r) => !roles.cashier.excludes.filter((a) => a === r).length)
      );
      redirect = roles.cashier.redirect;
    }
    if (isAdvancedCashier) {
      currentPermissions = currentPermissions.concat(
        roles.advancedCashier.permissions.filter((r) => !roles.advancedCashier.excludes.filter((a) => a === r).length)
      );
      redirect = roles.advancedCashier.redirect;
    }
    if (isEquipmentInstaller) {
      currentPermissions = currentPermissions.concat(
        roles.equipmentInstaller.permissions.filter((r) => !roles.equipmentInstaller.excludes.filter((a) => a === r).length)
      );
      redirect = roles.equipmentInstaller.redirect;
    }
    if (isAdmin) {
      currentPermissions = currentPermissions.concat(
        roles.admin.permissions.filter((r) => !roles.admin.excludes.filter((a) => a === r).length)
      );
      redirect = roles.admin.redirect;
    }
    // adding base permissions
    if (user.provider && user.provider.type === 0 && isAdmin) {
      currentPermissions = currentPermissions.concat(permissionsForBaseProvider);
    }
    // check existing Permission
    const getDefault = () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const urlObject of redirectUrls) {
        const foundPermissions = currentPermissions.filter((r) => r === urlObject.permission);
        if (foundPermissions.length) {
          redirect = urlObject.url;
          break;
        }
      }
    };
    const foundRedirects = redirectUrls.filter((r) => r.url === redirect);
    if (foundRedirects.length) {
      const foundRedirect = foundRedirects[0];
      if (!currentPermissions.filter((r) => r === foundRedirect.permission).length) {
        getDefault();
      }
    } else {
      // wrong default on route, selecting available
      getDefault();
    }

    if (!redirect) redirect = '/error/forbidden';
    const response = {
      permissions: currentPermissions,
    };
    if (withRedirect) response.redirect = redirect;
    return response;
  }

  static GetMainOttPermissionObjects() {
    return [
      new OttPermission('Add Provider', 'addByAdmin', true, true, true),
      new OttPermission('Custom Contact Address For Clients', 'customContact', true, true, true),
      new OttPermission('Custom Domain', 'customDomain', true, true, true),
      new OttPermission('Edit Comments', 'updateComments', true, true, true),
      new OttPermission('Delete Comments', 'deleteComments', true, true, true),
      new OttPermission('Notify Notification Parent', 'notifyToParent', false, false, true),
    ];
  }

  static async GetOttPermissions(ottProviderId, incomingPermissions) {
    const ottPermissions = incomingPermissions ?? [];
    const mainPermissions = RoleService.GetMainOttPermissionObjects();
    const parentProviders = await ottProviderRepository.getOttParents(ottProviderId);

    const permissionList = [];
    mainPermissions.forEach((mainPermission) => {
      const foundPermissions = ottPermissions.filter((r) => r.permission === mainPermission.permission);
      parentProviders
        .slice()
        .reverse()
        .forEach((parentProvider) => {
          const parentProviderPermissions = parentProvider.permission?.permissions ?? [];
          const foundParentProviderPermissions = parentProviderPermissions.filter(
            (r) => r.permission === mainPermission.permission
          );
          if (foundParentProviderPermissions.length) {
            const currentParentPermission = foundParentProviderPermissions[0];
            // eslint-disable-next-line no-param-reassign
            if (!currentParentPermission.onOffChild) mainPermission.state = false;
          }
        });

      if (foundPermissions.length) {
        const currentOttPermission = foundPermissions[0];
        // eslint-disable-next-line no-param-reassign
        mainPermission.onOff = currentOttPermission.onOff;
        // eslint-disable-next-line no-param-reassign
        mainPermission.onOffChild = currentOttPermission.onOffChild;
      }
      permissionList.push(mainPermission);
    });
    return permissionList;
  }

  static async GetOttWhichHasPermissions(ottProviderId, incomingPermissions, permission) {
    const ottPermissions = incomingPermissions ?? [];
    const mainPermissions = RoleService.GetMainOttPermissionObjects().filter((r) => r.permission === permission);
    const parentProviders = await ottProviderRepository.getOttParents(ottProviderId);
    const currentProvider = await ottProviderRepository.getOttProviderById(ottProviderId, [], {
      _id: 1,
      number: 1,
      parent: 1,
    });

    const permissionList = [];
    mainPermissions.forEach((mainPermission) => {
      const foundPermissions = ottPermissions.filter((r) => r.permission === mainPermission.permission);
      parentProviders
        .slice()
        .reverse()
        .forEach((parentProvider) => {
          const parentProviderPermissions = parentProvider.permission?.permissions ?? [];
          const foundParentProviderPermissions = parentProviderPermissions.filter(
            (r) => r.permission === mainPermission.permission
          );
          if (foundParentProviderPermissions.length) {
            const currentParentPermission = foundParentProviderPermissions[0];
            permissionList.push({
              providerId: parentProvider._id.toString(),
              number: parentProvider.number,
              state: mainPermission.state && currentParentPermission.onOff,
            });
            // eslint-disable-next-line no-param-reassign
            if (!currentParentPermission.onOffChild) mainPermission.state = false;
          } else {
            permissionList.push({
              providerId: parentProvider._id.toString(),
              number: parentProvider.number,
              state: mainPermission.state,
            });
          }
        });

      if (foundPermissions.length) {
        const currentOttPermission = foundPermissions[0];
        // eslint-disable-next-line no-param-reassign
        mainPermission.onOff = currentOttPermission.onOff;
        // eslint-disable-next-line no-param-reassign
        mainPermission.onOffChild = currentOttPermission.onOffChild;
        permissionList.push({
          providerId: currentProvider._id.toString(),
          number: currentProvider.number,
          state: mainPermission.state && mainPermission.onOff,
        });
      } else {
        permissionList.push({
          providerId: currentProvider._id.toString(),
          number: currentProvider.number,
          state: mainPermission.state,
        });
      }
    });
    return permissionList.slice().reverse();
  }

  static UserHasPermission(user, needPermissions) {
    const isCashier = user?.rolesInfo?.cashier;
    const isAdvancedCashier = user?.rolesInfo?.advancedCashier;
    const isSupport = user?.rolesInfo?.support;
    const isAdmin = user?.rolesInfo?.admin;
    let allPermissionsFound = true;
    needPermissions.forEach((permission) => {
      let permissionFound = false;
      if (isCashier && !permissionFound) {
        permissionFound = roles.cashier.permissions.filter(
          (r) => r === permission && !roles.cashier.excludes.filter((a) => a === permission).length
        ).length;
      }
      if (isSupport && !permissionFound) {
        permissionFound = roles.support.permissions.filter(
          (r) => r === permission && !roles.support.excludes.filter((a) => a === permission).length
        ).length;
      }
      if (isAdmin && !permissionFound) {
        permissionFound = roles.admin.permissions.filter(
          (r) => r === permission && !roles.admin.excludes.filter((a) => a === permission).length
        ).length;
      }
      if (isAdvancedCashier && !permissionFound) {
        permissionFound = roles.advancedCashier.permissions.filter(
          (r) => r === permission && !roles.advancedCashier.excludes.filter((a) => a === permission).length
        ).length;
      }
      if (user.provider && user.provider.type === 0 && !permissionFound) {
        permissionFound = permissionsForBaseProvider.filter((r) => r === permission).length;
      }
      if (!permissionFound) allPermissionsFound = false;
    });
    return allPermissionsFound;
  }
}

module.exports = RoleService;
