// const request = re/quire('request');
// const logger = require('../../utils/logger/logger');
const { repositories } = require('ottstream.dataaccess');

const queue = require('queue');

const { ottProviderRepository, ottProviderAddressRepository, ottProviderPhoneRepository, ottProviderEmailRepository } =
  repositories;
const logger = require('../../../utils/logger/logger');
const OttSyncCrudService = require('./ott_sync_crud.service');
const BroadcastService = require('../../socket/broadcastService.service');
const RoleService = require('../../role/role.service');

const q = queue({ results: [], autostart: true, timeout: 0, concurrency: 1 });

q.on('timeout', function (next, job) {
  logger.warn('task timed out:', job.toString().replace(/\n/g, ''));
  next();
});

// get notified when jobs complete
q.on('success', function (result, job) {
  logger.info('provider sync task finished processing:', job.toString().replace(/\n/g, ''));
  // logger.info('The result is:', result);
});

class OttSyncService {
  static providerUrl() {
    return `https://iptv.ottstream.live/api_test/ottstream/providers`;
  }

  static constructProviderQuery(withDevices) {
    let query = `use_new_billing=1&`;
    if (withDevices) {
      query += `with_devices&`;
    }
    return `${OttSyncService.providerUrl()}?${query}`;
  }

  // eslint-disable-next-line no-empty-function
  static async markToSync(ottProviderId, broadUser) {
    // TODO get only number and id
    const syncState = 2;
    const ottProvider = await ottProviderRepository.getOttProviderById(ottProviderId, [], {
      _id: 1,
      number: 1,
      syncState: 1,
    });
    if (ottProvider?.number) {
      await ottProviderRepository.updateOttProvidersByNumber(ottProvider?.number, { syncState });
      if (broadUser.provider?._id?.toString()) {
        await BroadcastService.broadcastToProvider(broadUser.provider?._id?.toString(), 'sync-info', {
          providerId: ottProviderId.toString(),
          syncState,
        });
      }
    }
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSync(ottProviderId) {
    // TODO get only number and id
    // TODO important! mark if state is 3
    const syncState = 1;
    const ottProvider = await ottProviderRepository.getOttProviderById(ottProviderId, [], {
      _id: 1,
      number: 1,
      syncState: 1,
    });
    if (ottProvider?.number && ottProvider.syncState === 3) {
      await ottProviderRepository.updateOttProvidersByNumber(ottProvider?.number, { syncState });
      const parents = await ottProviderRepository.getOttParents(ottProviderId);

      // eslint-disable-next-line no-restricted-syntax
      for (const parent of parents) {
        if (parent._id) {
          // eslint-disable-next-line no-await-in-loop
          await BroadcastService.broadcastToProvider(parent?._id?.toString(), 'sync-info', {
            providerId: ottProviderId.toString(),
            syncState,
          });
        }
      }
    }
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSyncing(ottProviderId) {
    // TODO get only number and id
    // TODO important! mark if state is 3
    const syncState = 3;
    const ottProvider = await ottProviderRepository.getOttProviderById(ottProviderId, [], {
      _id: 1,
      number: 1,
      syncState: 1,
    });
    await ottProviderRepository.updateOttProvidersByNumber(ottProvider?.number, { syncState });
  }

  static async GetProviderFieldsForMiddleware(providerId) {
    // contract id
    // eslint-disable-next-line no-await-in-loop
    const providersWithCurrentPermission = await RoleService.GetOttWhichHasPermissions(
      providerId,
      RoleService.GetMainOttPermissionObjects(),
      'customContact'
    );
    const providersWithCurrentPermissionFiltered = providersWithCurrentPermission.filter((r) => r.state);
    let contactsProviderId = 0;
    if (providersWithCurrentPermissionFiltered) {
      const providersWithCurrentPermissionSelected = providersWithCurrentPermissionFiltered[0];
      contactsProviderId = providersWithCurrentPermissionSelected.number;
    }
    // address
    // eslint-disable-next-line no-await-in-loop
    const providerAddress = await ottProviderAddressRepository.getOttProviderAddressesByProviderId(providerId);
    const currentAddresses = providerAddress.filter((r) => r.inUse);
    let addressField = ``;
    if (currentAddresses.length) {
      const currentAddress = currentAddresses[0];
      const { unit, address, state, country, zip, city } = currentAddress;
      addressField = `${address} ${unit}  ${city} ${state} ${zip} ${country !== 'US' ? country : ''}`;
    }

    // email
    // eslint-disable-next-line no-await-in-loop
    const providerPhones = await ottProviderPhoneRepository.getOttProviderPhones(providerId);
    const phone = providerPhones.filter((r) => r.inUse).length ? providerPhones.filter((r) => r.inUse)[0].number : ``;
    // email
    // eslint-disable-next-line no-await-in-loop
    const providerEmails = await ottProviderEmailRepository.getOttProviderEmails(providerId);
    const email = providerEmails.filter((r) => r.inUse).length ? providerEmails.filter((r) => r.inUse)[0].address : ``;

    logger.info(`provider sync service: gathering ott info ${contactsProviderId}`);
    return {
      email,
      phone,
      address: addressField,
      contacts_provider_id: contactsProviderId,
    };
  }

  // eslint-disable-next-line no-empty-function
  static async syncProviders() {
    const func = async (cb) => {
      try {
        const allProviders = await ottProviderRepository.getOttProviders(
          { status: 1 },
          [
            {
              path: 'parent',
            },
          ],
          { _id: 1, syncState: 1, number: 1, name: 1, parent: 1, comment: 1 }
        );
        const providersThatNeedSync = allProviders.filter((r) => r.syncState !== 1);
        const createList = [];
        const updateList = [];
        const deleteList = [];
        const remoteProviders = await OttSyncCrudService.getProviders();

        const toAddList = providersThatNeedSync.filter(
          (r) => !remoteProviders.filter((a) => a.id === r.number).length && r.status !== 0
        );
        const toUpdateList = providersThatNeedSync.filter(
          (r) => remoteProviders.filter((a) => a.id === r.number).length && r.status !== 0
        );
        let toDeleteList = providersThatNeedSync.filter(
          (r) => remoteProviders.filter((a) => a.id === r.number).length && r.status === 0
        );
        toDeleteList = toDeleteList.concat(
          remoteProviders.filter((r) => !allProviders.filter((a) => a.number === r.id).length)
        );
        // eslint-disable-next-line no-restricted-syntax
        for (const item of toAddList) {
          // eslint-disable-next-line no-await-in-loop
          const fields = await OttSyncService.GetProviderFieldsForMiddleware(item._id);
          createList.push({
            providerId: item._id,
            id: item.number,
            name: item.name?.length ? item.name[0].name : `no name for Ott number ${item.number}`,
            parent_provider_id: item?.parent?.number || 0,
            contacts_provider_id: fields.contacts_provider_id,
            email: fields.email,
            comment: item.comment,
            address: fields.address,
            phone: fields.phone,
          });
          // eslint-disable-next-line no-await-in-loop
          if (item._id) await OttSyncService.markAsSyncing(item._id);
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const item of toUpdateList) {
          // eslint-disable-next-line no-await-in-loop
          const fields = await OttSyncService.GetProviderFieldsForMiddleware(item._id);
          updateList.push({
            providerId: item._id,
            id: item.number,
            name: item.name?.length ? item.name[0].name : `no name for Ott number: ${item.number}`,
            parent_provider_id: item?.parent?.number || 0,
            contacts_provider_id: fields.contacts_provider_id,
            email: fields.email,
            comment: item.comment,
            address: fields.address,
            phone: fields.phone,
          });
          // eslint-disable-next-line no-await-in-loop
          if (item._id) await OttSyncService.markAsSyncing(item._id);
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const item of toDeleteList) {
          deleteList.push({ id: item.number || item.id, providerId: item._id });
          // eslint-disable-next-line no-await-in-loop
          if (item._id) await OttSyncService.markAsSyncing(item._id);
        }
        //
        logger.info(
          `providers to sync - create: ${createList.length} update: ${updateList.length} delete: ${deleteList.length}`
        );
        // eslint-disable-next-line no-restricted-syntax
        for (const item of updateList) {
          const sendData = { ...item };
          delete sendData.providerId;
          // eslint-disable-next-line no-await-in-loop
          const updateResponse = await OttSyncCrudService.updateProvider(sendData);
          if (updateResponse.filter((r) => r.id === item.id).length) {
            // eslint-disable-next-line no-await-in-loop
            if (item.providerId) await OttSyncService.markAsSync(item.providerId);
            logger.info(`ott number: ${item.id} synced updated successfully`);
          }
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const item of createList) {
          const sendData = { ...item };
          delete sendData.providerId;
          // eslint-disable-next-line no-await-in-loop
          const updateResponse = await OttSyncCrudService.createProvider(sendData);
          if (updateResponse.id === item.id) {
            // eslint-disable-next-line no-await-in-loop
            if (item.providerId) await OttSyncService.markAsSync(item.providerId);
            logger.info(`ott number: ${item.id} synced created successfully`);
          }
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const item of deleteList) {
          // eslint-disable-next-line no-await-in-loop
          const deleteResponse = await OttSyncCrudService.deleteProvider(item.id);
          if (deleteResponse) {
            // eslint-disable-next-line no-await-in-loop
            if (item.providerId) await OttSyncService.markAsSync(item.providerId);
            logger.info(`ott number: ${item.id} synced deleted successfully`);
          }
        }

        cb(null, `success`);
      } catch (ex) {
        logger.error(ex);
      }
    };

    if (q.length) {
      logger.warn(`providers sync task is already running...`);
    } else {
      q.push(func);
    }
  }
}

module.exports = OttSyncService;
