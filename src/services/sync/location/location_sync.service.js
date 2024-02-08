// const request = re/quire('request');
// const logger = require('../../utils/logger/logger');
const queue = require('queue');
// eslint-disable-next-line no-unused-vars
const { repositories, models } = require('ottstream.dataaccess');
const LocationUsedDeviceSyncService = require('./used_device/location_used_device_sync.service');
const config = require('../../../config/config');

const storage = { locations: {} };

const { clientLocationRepository, subscriptionRepository, clientUsedDeviceRepository, serverRepository } = repositories;
const logger = require('../../../utils/logger/logger');
const LocationSyncCrudService = require('./location_sync_crud.service');
const { randomNumberSequence } = require('../../../utils/crypto/random');
const SubscriptionService = require('../../subscription/subscription.service');

const { ClientLocation } = models;
const BroadcastService = require('../../socket/broadcastService.service');

// eslint-disable-next-line camelcase
const location_queue = queue({ results: [], autostart: true, timeout: 0, concurrency: 1 });
// eslint-disable-next-line camelcase
const locations_queue = queue({ results: [], autostart: true, timeout: 0, concurrency: 1 });
// eslint-disable-next-line camelcase
const used_devices_queue = queue({ results: [], autostart: true, timeout: 0, concurrency: 1 });

location_queue.on('timeout', function (next, job) {
  logger.warn('task timed out:', job.toString().replace(/\n/g, ''));
  next();
});
locations_queue.on('timeout', function (next, job) {
  logger.warn('task timed out:', job.toString().replace(/\n/g, ''));
  next();
});
used_devices_queue.on('timeout', function (next, job) {
  logger.warn('task timed out:', job.toString().replace(/\n/g, ''));
  next();
});

// get notified when jobs complete
location_queue.on('success', function (result, job) {
  logger.info('location sync task finished processing:', job.toString().replace(/\n/g, ''));
  // logger.info('The result is:', result);
});
// get notified when jobs complete
locations_queue.on('success', function (result, job) {
  logger.info('locations sync task finished processing:', job.toString().replace(/\n/g, ''));
  // logger.info('The result is:', result);
});
// get notified when jobs complete
used_devices_queue.on('success', function (result, job) {
  logger.info('used_device sync task finished processing:', job.toString().replace(/\n/g, ''));
  // logger.info('The result is:', result);
});

class LocationSyncService {
  static async syncLocation(login, async = true) {
    const func = async (cb) => {
      try {
        const allLocations = await clientLocationRepository.getClientLocations(
          { login },
          [{ path: 'provider' }, { path: 'clientId' }],
          {
            _id: 1,
            syncState: 1,
            login: 1,
            name: 1,
            clientId: 1,
            provider: 1,
            migrated: 1,
            settingsUpdateUts: 1,
            isBlockLocation: 1,
            password: 1,
            parentalCode: 1,
            updatedAt: 1,
            isPauseSubscriptions: 1,
            server: 1,
            VODEnable: 1,
            archiveEnable: 1,
            roomsCount: 1,
            lastUpdate: 1,
            maxDevice: 1,
          }
        );
        logger.info(`downloading remote locations...'`);
        const allRemoteLocations = await LocationSyncCrudService.getLocation(login, true);
        logger.info(`downloading remote locations done'`);

        logger.info(`starting sync.. ${login}'`);
        await LocationSyncService.DoLocationsSync(allLocations, allRemoteLocations, [], []);
        logger.info(`starting done.. ${login}`);

        await LocationSyncService.syncUsedDevice(login, allRemoteLocations);

        if (login) {
          if (!storage.locations[login]) {
            storage.locations[login] = {};
          }
          storage.locations[login].lastUpdate = new Date();
        }

        if (async) {
          cb(null, `success`);
        }
      } catch (ex) {
        logger.error(ex);
        return false;
      }
      return true;
    };

    if (config.subscription.syncNow) {
      if (async) {
        if (location_queue.length) {
          logger.warn(`locations sync task is already running...`);
        } else {
          location_queue.push(func);
        }
        return true;
      }
      return func();
    }
    logger.info(`syncing locations is not enabled from .env (SUBSCRIPTION_SYNC_NOW=false)`);
    return true;
  }

  // eslint-disable-next-line no-empty-function,no-unused-vars
  static async markToSync(locationId, syncNow = false) {
    // TODO get only number and id
    const syncState = 2;
    const location = await clientLocationRepository.getClientLocationById(locationId, [], {
      _id: 1,
      login: 1,
      syncState: 1,
    });
    if (location?.login) {
      await clientLocationRepository.updateLocationById(location?._id, {
        syncState,
        settingsUpdateUts: Math.round(Date.now() / 1000),
      });
      if (syncNow) {
        logger.info(`fast syncing location ${location.login}`);
        await LocationSyncService.syncLocation(location.login);
      }
    }
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSync(item) {
    // TODO get only number and id
    // TODO important! mark if state is 3
    const syncState = 1;
    const location = await clientLocationRepository.getClientLocationById(item.locationId, [], {
      _id: 1,
      login: 1,
      syncState: 1,
    });
    if (location?.login && location.syncState === 3) {
      const saveBody = {
        syncState,
        settingsUpdateUts: item.settings_update_uts,
      };
      if (item.password) saveBody.password = item.password;
      if (item.pin_code) saveBody.parentalCode = item.pin_code;
      await clientLocationRepository.updateLocationById(location?._id, saveBody);
    }
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSyncMultiple(itemList) {
    const syncState = 1;
    const ids = itemList.map((r) => r.locationId.toString());
    await clientLocationRepository.updateAll({ _id: { $in: ids } }, { syncState });
    logger.info(`location marked as synced`);
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const item of itemList) {
      const saveBody = {};
      if (item.password || item.pin_code) {
        if (item.password) saveBody.password = item.password;
        if (item.pin_code) saveBody.parentalCode = item.pin_code;
        // if (item.conflict) saveBody.migrated = true; // TODO if conflict then migrated?
        // eslint-disable-next-line no-await-in-loop
        await clientLocationRepository.updateLocationById(item?.locationId, saveBody);
        logger.info(
          `locations: location ${item.login} password: ${item.password}, pin: ${item.pin_code} synced successfully`
        );
      }
    }
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSyncing(locationId) {
    // TODO get only number and id
    // TODO important! mark if state is 3
    const syncState = 3;
    // const location = await clientLocationRepository.getClientLocationById(ottProviderId, [], {
    //   _id: 1,
    //   login: 1,
    //   syncState: 1,
    // });
    await clientLocationRepository.updateLocationById(locationId, { syncState });
  }

  // eslint-disable-next-line no-empty-function
  static async markAsSyncingMultiple(list) {
    // TODO get only number and id
    // TODO important! mark if state is 3
    const syncState = 3;
    // const location = await clientLocationRepository.getClientLocationById(ottProviderId, [], {
    //   _id: 1,
    //   login: 1,
    //   syncState: 1,
    // });
    const ids = list.map((r) => r.toString());
    await clientLocationRepository.updateAll({ _id: { $in: ids } }, { syncState });
  }

  static async GenerateLocationLogin() {
    return LocationSyncCrudService.createLocation({ login_length: 8, pass_length: 6, pin_length: 6 });
  }

  static async GetLocationFieldsForMiddleware(locationFields, allSubscriptions = []) {
    const subscriptions = allSubscriptions.filter(
      (r) => r.location && r.location.toString() === locationFields._id.toString()
    );
    // eslint-disable-next-line prefer-spread
    const minimumPacketStartDate = Math.min.apply(
      Math,
      subscriptions.map(function (o) {
        return o.startDate.getTime();
      })
    );
    // eslint-disable-next-line prefer-spread
    const maximumPacketEndDate = Math.max.apply(
      Math,
      subscriptions.map(function (o) {
        return o.endDate.getTime();
      })
    );
    let server = null;
    if (locationFields.server) {
      const DbServer = await serverRepository.getServerById(locationFields.server);
      if (DbServer) {
        server = DbServer.middlewareId;
      }
    }
    if (server !== null) {
      // const servers = await serverRepository.getList({});
      // if (servers.length) {
      //   server = servers[0].middlewareId;
      // }
    }
    let autoStart = 0;
    if (
      !subscriptions.filter((r) => r.isActive && r.state === 1).length &&
      subscriptions.filter((r) => r.state === 1).length
    ) {
      autoStart = 1;
    }
    const result = {
      locationId: locationFields._id,
      login: locationFields.login,
      ott_provider_id: null,
      ott_client_id: null,
      disabled: locationFields.isBlockLocation ? 1 : 0,
      packets: subscriptions
        .filter((r) => r.package)
        .map((r) => r.package.middlewareId)
        .filter((r) => r), // todo edit
      autostart_status: autoStart,
      packet_start: Math.round(minimumPacketStartDate / 1000) || 0,
      packet_expire: Math.round(maximumPacketEndDate / 1000) || 0,
      // settings_update_uts: Math.round(Date.now() / 1000),
      in_pause: locationFields.isPauseSubscriptions ? 1 : 0,
      vod_enabled: locationFields.VODEnable ? 1 : 0,
      archive_enabled: locationFields.archiveEnable ? 1 : 0,
      multiroom: locationFields.roomsCount,
      use_new_billing: 1,
      max_devices: locationFields.maxDevice,
    };
    if (!result.packets.length) {
      result.packet_start = 0;
      result.packet_expire = 0;
    }
    result.server = server;
    if (locationFields.password && locationFields.password !== ``) {
      result.password = locationFields.password;
    } else {
      result.password = randomNumberSequence(6);
    }
    if (locationFields.parentalCode && locationFields.parentalCode !== ``) {
      result.pin_code = locationFields.parentalCode;
    } else {
      result.pin_code = result.password;
    }
    if (locationFields.provider) {
      result.ott_provider_id = locationFields.provider.number;
    }
    if (locationFields.clientId) {
      result.ott_client_id = locationFields.clientId?.number_id;
    }
    logger.info(`location sync service: gathering location info ${result.login}`);
    return result;
  }

  // eslint-disable-next-line no-unused-vars
  static async DoLocationsSync(allLocations, remoteLocations, allUsedDevices, allRemoteUsedDevices) {
    const allSubscriptions = await subscriptionRepository.getSubscriptions({ state: 1 }, [{ path: 'package' }]);
    const servers = await serverRepository.getList({ status: 1 });
    const serverDict = servers.reduce((obj, item) => {
      // eslint-disable-next-line no-param-reassign
      obj[item.middlewareId] = item;
      return obj;
    }, {});
    const deleteList = [];
    const remoteLocationsDict = remoteLocations.reduce((obj, item) => {
      // eslint-disable-next-line no-param-reassign
      obj[item.login] = item;
      return obj;
    }, {});
    // const localLocationsDict = allLocations.reduce((obj, item) => {
    //   // eslint-disable-next-line no-param-reassign
    //   obj[item.login] = item;
    //   return obj;
    // }, {});
    // const toAddList = allLocations.filter(
    //   (r) => !remoteLocations.filter((a) => a.login === r.login).length && r.status !== 0 && !r.migrated
    // );
    const toAddList = [];
    let fromUpdateList = [];
    const toUpdateList = [];
    const toDeleteList = [];
    logger.info(`remote locations: ${remoteLocations.length}`);
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const localLocationKey in allLocations) {
      const localLocation = allLocations[localLocationKey];
      let remoteLocation = null;
      if (typeof remoteLocationsDict[localLocation.login] !== 'undefined') {
        remoteLocation = remoteLocationsDict[localLocation.login];
      }

      if (!remoteLocation && !localLocation.migrated) {
        toAddList.push(localLocation); // to add
      }

      if (remoteLocation) {
        if (localLocation.syncState === 2) {
          if (localLocation.status === 0) {
            toDeleteList.push(localLocation);
          } else {
            toUpdateList.push(localLocation);
          }
        } else if (remoteLocation.autostart_status === -1) {
          // eslint-disable-next-line no-await-in-loop
          await LocationSyncCrudService.resetCache(); // resetting cache on autostart found to avoid repeat update
          fromUpdateList.push(localLocation); // from update
        }
      }
    }
    // eslint-disable-next-line no-await-in-loop
    // const toUpdateUsedDevices = await LocationUsedDeviceSyncService.GetUsedDeviceUpdates(
    //   allUsedDevices,
    //   allRemoteUsedDevices
    // );
    // // eslint-disable-next-line no-restricted-syntax
    // for (const usedDevice of toUpdateUsedDevices) {
    //   if (toUpdateList.filter((r) => r._id.toString() === usedDevice.locationId.toString()).length === 0) {
    //     const deviceLocations = allLocations.filter((r) => r._id.toString() === usedDevice.locationId.toString());
    //     if (deviceLocations.length) {
    //       toUpdateList.push(deviceLocations[0]);
    //     }
    //   }
    // }
    // eslint-disable-next-line no-unreachable
    // let toDeleteList = locationsThatNeedSync.filter(
    //   (r) =>
    //     remoteLocations.filter((a) => a.login === r.login).length && r.status === 0 && (onlyMigrated ? !r.migrated : true)
    // );
    // if (onlyMigrated) {
    //   toDeleteList = toDeleteList.concat(
    //     remoteLocations.filter(
    //       (r) => !allLocations.filter((a) => a.login === r.login && (onlyMigrated ? !a.migrated : true)).length
    //     )
    //   );
    // }
    const fromUpdates = allLocations.filter(
      (
        r // parseInt(r.settingsUpdateUts, 10)
      ) =>
        remoteLocations.filter((a) => a.login === r.login && Math.round(r.updatedAt / 1000) < a.settings_update_uts)
          .length && r.status !== 0
    );
    fromUpdateList = fromUpdateList.concat(fromUpdates);
    logger.info(
      `locations to sync - create: ${toAddList.length} update: ${toUpdateList.length} delete: ${toDeleteList.length} updateFrom: ${fromUpdateList.length}`
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const item of toAddList) {
      // eslint-disable-next-line no-await-in-loop
      const result = await LocationSyncService.GetLocationFieldsForMiddleware(
        allLocations.filter((r) => r._id === item._id)[0],
        allSubscriptions
      );
      const sendData = { ...result };
      delete sendData.locationId;
      // eslint-disable-next-line no-await-in-loop
      const updateResponse = await LocationSyncCrudService.createLocation(sendData);
      if (updateResponse && updateResponse.login === result.login) {
        const currentResponse = updateResponse;
        const toSave = { ...result };
        // toSave.migrated = true;
        if (currentResponse.password) toSave.password = currentResponse.password;
        if (currentResponse.pin_code) toSave.pin_code = currentResponse.pin_code;
        if (updateResponse.conflict) toSave.conflict = updateResponse.constructor;
        // eslint-disable-next-line no-await-in-loop
        await ClientLocation.updateOne({ login: result.login }, { syncState: 1 });
      } else {
        logger.error(`remote location create error ${item.login}`);
      }
      // eslint-disable-next-line no-await-in-loop
    }
    let index = 0;
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of toUpdateList) {
      index += 1;
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await LocationSyncService.GetLocationFieldsForMiddleware(
          allLocations.filter((r) => r._id === item._id)[0],
          allSubscriptions
        );
        // const updateDevices = toUpdateUsedDevices.filter((r) => r.locationId.toString() === item._id.toString());
        // eslint-disable-next-line no-restricted-syntax
        // for (const updateDevice of updateDevices) {
        //   result.devices.push({
        //     device_serial: updateDevice.serialN,
        //     lang: updateDevice.language,
        //     timeshift: updateDevice.timeShift,
        //     http_caching: updateDevice.httpCaching,
        //     audiotrack_default: updateDevice.audioTrackDefault,
        //     definition_filter: updateDevice,
        //     stream_quality: updateDevice.streamQuality,
        //     background_player: updateDevice.isBackgroundPlayer,
        //   });
        // }
        result.devices = [];
        // addMarkList.push(item._id);
        // eslint-disable-next-line no-restricted-syntax,no-unused-vars
        const updateSendData = [];
        // eslint-disable-next-line no-restricted-syntax
        const sendData = { ...result };
        delete sendData.locationId;
        updateSendData.push(sendData);
        let multiUpdateResponse = [];
        // eslint-disable-next-line no-await-in-loop
        if (updateSendData.length) multiUpdateResponse = await LocationSyncCrudService.updateLocation(updateSendData);
        // eslint-disable-next-line no-restricted-syntax,no-unused-vars
        if (multiUpdateResponse && multiUpdateResponse.filter((r) => r.login === item.login).length) {
          logger.info(`location ${item.login} updated to remote ${index}/${toUpdateList.length}`);
          const currentResponse = multiUpdateResponse.filter((r) => r.login === item.login)[0];
          const toSave = { ...item };
          if (currentResponse.password) toSave.password = currentResponse.password;
          if (currentResponse.pin_code) toSave.pin_code = currentResponse.pin_code;
          // eslint-disable-next-line no-await-in-loop
        }
        // eslint-disable-next-line no-await-in-loop
        await ClientLocation.updateOne({ login: item.login }, { syncState: 1 });
      } catch (ex) {
        logger.error(`problematic login update ${item.login}`);
      }
    }
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of toDeleteList) {
      deleteList.push({ login: item.login || item.id, locationId: item._id });
    }
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    // let isRemoteDeleted = false;
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    // for (const item of deleteList) {
    //   isRemoteDeleted = true;
    //   // if delete happen, get new location lists
    //   // eslint-disable-next-line no-await-in-loop
    //   const deleteResponse = await LocationSyncCrudService.deleteLocation(item.login);
    //   if (deleteResponse) {
    //     if (item.locationId) {
    //       // eslint-disable-next-line no-await-in-loop
    //       markSyncList.push(item);
    //     }
    //   }
    // }
    index = 0;
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const dbLocation of fromUpdateList) {
      index += 1;
      const item = remoteLocationsDict[dbLocation.login];
      if (item.autostart_status === -1) {
        logger.info(`location first time activation ${dbLocation.login}`);
        // eslint-disable-next-line no-await-in-loop
        await SubscriptionService.locationFirstTimeLogin(dbLocation, item);
        // eslint-disable-next-line no-await-in-loop
        await LocationSyncService.markToSync(dbLocation._id.toString());
      }
      const updateBody = {
        isBlockLocation: item.disabled === 1,
        isPauseSubscriptions: item.disabled === 1,
        VODEnable: item.disabled === 1,
        archiveEnable: item.disabled === 1,
        settingsUpdateUts: item.settings_update_uts,
      };

      if (typeof serverDict[item.server] !== 'undefined') {
        updateBody.server = serverDict[item.server]._id.toString();
      }
      // eslint-disable-next-line no-await-in-loop
      await clientLocationRepository.updateClientLocationById(dbLocation._id, updateBody);
      logger.info(`location ${dbLocation.login} updated from remote ${index}/${fromUpdateList.length}`);

      try {
        logger.info(`broadcasting location info from update. client: ${dbLocation.clientId.id}`);
        // eslint-disable-next-line no-await-in-loop
        await BroadcastService.broadcastToProvider(
          dbLocation.clientId.provider.toString(),
          `location-info-${dbLocation.clientId.id}`,
          {
            action: 'getList',
          }
        );
      } catch (ex) {
        logger.error(ex);
      }
    }

    if (toUpdateList.length || toAddList.length || toDeleteList.length || fromUpdateList.length) {
      await LocationSyncCrudService.resetCache();
    }
  }

  // eslint-disable-next-line no-empty-function
  static async syncLocations(login) {
    const func = async (cb) => {
      try {
        const filter = {};
        if (login) filter.login = login;
        const allRemoteLocations = await LocationSyncCrudService.getLocations();
        // eslint-disable-next-line no-unreachable
        const allLocations = await clientLocationRepository.getClientLocations(
          filter,
          [{ path: 'provider' }, { path: 'clientId' }],
          {
            _id: 1,
            syncState: 1,
            login: 1,
            name: 1,
            clientId: 1,
            provider: 1,
            migrated: 1,
            settingsUpdateUts: 1,
            isBlockLocation: 1,
            password: 1,
            parentalCode: 1,
            updatedAt: 1,
            isPauseSubscriptions: 1,
            server: 1,
            VODEnable: 1,
            archiveEnable: 1,
            roomsCount: 1,
            lastUpdate: 1,
            maxDevice: 1,
          }
        );
        // eslint-disable-next-line no-unreachable
        const allRemoteUsedDevices = [];
        // eslint-disable-next-line no-unused-vars

        await LocationSyncService.DoLocationsSync(allLocations, allRemoteLocations, [], allRemoteUsedDevices);

        cb(null, `success`);
      } catch (ex) {
        logger.error(ex);
      }
    };

    if (locations_queue.length) {
      logger.warn(`locations sync task is already running...`);
    } else {
      locations_queue.push(func);
    }
  }

  // eslint-disable-next-line no-empty-function
  static async syncCdnSessions(login, roomN) {
    try {
      const filter = {};
      if (login) filter.login = login;
      const cdnSessionResponse = await LocationSyncCrudService.getCdnSessions(login, roomN);
      // eslint-disable-next-line no-unreachable
      const allLocations = await clientLocationRepository.getClientLocations(
        filter,
        [{ path: 'provider' }, { path: 'clientId' }],
        {
          _id: 1,
          syncState: 1,
          login: 1,
          name: 1,
          clientId: 1,
          provider: 1,
          migrated: 1,
          settingsUpdateUts: 1,
          isBlockLocation: 1,
          password: 1,
          parentalCode: 1,
          updatedAt: 1,
          isPauseSubscriptions: 1,
          server: 1,
          VODEnable: 1,
          archiveEnable: 1,
          roomsCount: 1,
          lastUpdate: 1,
          maxDevice: 1,
        }
      );

      const usedDeviceGetFilter = {};
      if (allLocations.length === 1) {
        usedDeviceGetFilter.locationId = allLocations[0].id;
      }
      // eslint-disable-next-line no-unused-vars
      // eslint-disable-next-line no-unreachable
      const allUsedDevices = await clientUsedDeviceRepository.getClientUsedDevices(
        usedDeviceGetFilter,
        [{ path: 'locationId', populate: [{ path: 'provider' }] }, { path: 'clientId' }],
        {
          locationId: 1,
          updatedAt: 1,
          lastUpdate: 1,
          serialN: 1,
          roomN: 1,
          timeShift: 1,
          audioTrackDefault: 1,
          isBackgroundPlayer: 1,
          streamQuality: 1,
          uiFontSize: 1,
          httpCaching: 1,
          language: 1,
          isSD: 1,
          isHD: 1,
          isFHD: 1,
          isUHD: 1,
          cdn_sessions: 1,
        }
      );
      const toUpdateUsedDevices = allUsedDevices.filter((r) => r.roomN === roomN);

      if (cdnSessionResponse.cdn_sessions) {
        // eslint-disable-next-line no-restricted-syntax
        for (const updateDevice of toUpdateUsedDevices) {
          // eslint-disable-next-line no-await-in-loop
          await LocationUsedDeviceSyncService.AddUsedDeviceStatistics(
            updateDevice,
            updateDevice._id.toString(),
            cdnSessionResponse.cdn_sessions
          );
          // eslint-disable-next-line no-undef
          logger.info(`used device cdn ${updateDevice.serialN} statistics updated!`);
        }
      }
      // await LocationUsedDeviceSyncService.DoUsedDeviceSync(allUsedDevices, allRemoteUsedDevices);
    } catch (ex) {
      logger.error(ex);
      return true;
    }
    return false;
  }

  // eslint-disable-next-line no-empty-function
  static async syncUsedDevice(login, remoteLocations) {
    try {
      const filter = {};
      if (login) filter.login = login;
      const allRemoteLocations = remoteLocations || (await LocationSyncCrudService.getLocation(login));
      // eslint-disable-next-line no-unreachable
      const allLocations = await clientLocationRepository.getClientLocations(
        filter,
        [{ path: 'provider' }, { path: 'clientId' }],
        {
          _id: 1,
          syncState: 1,
          login: 1,
          name: 1,
          clientId: 1,
          provider: 1,
          migrated: 1,
          settingsUpdateUts: 1,
          isBlockLocation: 1,
          password: 1,
          parentalCode: 1,
          updatedAt: 1,
          isPauseSubscriptions: 1,
          server: 1,
          VODEnable: 1,
          archiveEnable: 1,
          roomsCount: 1,
          lastUpdate: 1,
          maxDevice: 1,
        }
      );
      // eslint-disable-next-line no-unreachable
      const allRemoteUsedDevices = [];
      const localLocationsDict = allLocations.reduce((obj, item) => {
        // eslint-disable-next-line no-param-reassign
        obj[item.login] = item;
        return obj;
      }, {});
      allRemoteLocations.forEach((r) =>
        r.devices.forEach((a) => {
          const saveObj = {
            ...a,
          };
          if (localLocationsDict[r.login]) {
            // eslint-disable-next-line prefer-destructuring
            saveObj.location = localLocationsDict[r.login];
            allRemoteUsedDevices.push(saveObj);
          }
        })
      );

      const usedDeviceGetFilter = {};
      if (allLocations.length === 1) {
        usedDeviceGetFilter.locationId = allLocations[0].id;
      }
      // eslint-disable-next-line no-unused-vars
      // eslint-disable-next-line no-unreachable
      const allUsedDevices = await clientUsedDeviceRepository.getClientUsedDevices(
        usedDeviceGetFilter,
        [{ path: 'locationId', populate: [{ path: 'provider' }] }, { path: 'clientId' }],
        {
          locationId: 1,
          updatedAt: 1,
          lastUpdate: 1,
          serialN: 1,
          roomN: 1,
          timeShift: 1,
          audioTrackDefault: 1,
          isBackgroundPlayer: 1,
          streamQuality: 1,
          uiFontSize: 1,
          httpCaching: 1,
          language: 1,
          isSD: 1,
          isHD: 1,
          isFHD: 1,
          isUHD: 1,
        }
      );

      await LocationUsedDeviceSyncService.DoUsedDeviceSync(allUsedDevices, allRemoteUsedDevices);
    } catch (ex) {
      logger.error(ex);
      return true;
    }
    return false;
  }

  // eslint-disable-next-line no-empty-function
  static async syncUsedDevices(login) {
    const func = async (cb) => {
      try {
        const filter = {};
        if (login) filter.login = login;
        const allRemoteLocations = await LocationSyncCrudService.getLocations();
        // eslint-disable-next-line no-unreachable
        const allLocations = await clientLocationRepository.getClientLocations(
          filter,
          [{ path: 'provider' }, { path: 'clientId' }],
          {
            _id: 1,
            syncState: 1,
            login: 1,
            name: 1,
            clientId: 1,
            provider: 1,
            migrated: 1,
            settingsUpdateUts: 1,
            isBlockLocation: 1,
            password: 1,
            parentalCode: 1,
            updatedAt: 1,
            isPauseSubscriptions: 1,
            server: 1,
            VODEnable: 1,
            archiveEnable: 1,
            roomsCount: 1,
            lastUpdate: 1,
            maxDevice: 1,
          }
        );
        // eslint-disable-next-line no-unreachable
        const allRemoteUsedDevices = [];
        const localLocationsDict = allLocations.reduce((obj, item) => {
          // eslint-disable-next-line no-param-reassign
          obj[item.login] = item;
          return obj;
        }, {});
        allRemoteLocations.forEach((r) =>
          r.devices.forEach((a) => {
            const saveObj = {
              ...a,
            };
            if (localLocationsDict[r.login]) {
              // eslint-disable-next-line prefer-destructuring
              saveObj.location = localLocationsDict[r.login];
              allRemoteUsedDevices.push(saveObj);
            }
          })
        );
        // eslint-disable-next-line no-unused-vars
        // eslint-disable-next-line no-unreachable
        const allUsedDevices = await clientUsedDeviceRepository.getClientUsedDevices(
          {},
          [{ path: 'locationId', populate: [{ path: 'provider' }] }, { path: 'clientId' }],
          {
            locationId: 1,
            updatedAt: 1,
            lastUpdate: 1,
            serialN: 1,
          }
        );
        await LocationUsedDeviceSyncService.DoUsedDeviceSync(allUsedDevices, allRemoteUsedDevices);
        cb(null, `success`);
      } catch (ex) {
        logger.error(ex);
      }
    };

    if (used_devices_queue.length) {
      logger.warn(`used device sync task is already running...`);
    } else {
      used_devices_queue.push(func);
    }
  }
}

module.exports = LocationSyncService;
