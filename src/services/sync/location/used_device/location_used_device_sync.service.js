// const request = re/quire('request');
// const logger = require('../../utils/logger/logger');
const { repositories } = require('ottstream.dataaccess');

const net = require('net');

const { clientUsedDeviceRepository } = repositories;
const logger = require('../../../../utils/logger/logger');
const GeoIpService = require('../../../geoip/geoip.service');
const StatisticService = require('../../../statistics/statistic.service');
const LocationUsedDeviceSyncCrudService = require('./location_used_device_sync_crud.service');
// const { repositories } = require('ottstream.dataaccess');

function validateIP(ip) {
  return net.isIPv4(ip) || net.isIPv6(ip);
}

class LocationUsedDeviceSyncService {
  static async GetUsedDeviceFieldsForMiddleware(remoteFields) {
    const result = {
      locationId: remoteFields.location._id,
      providerName: remoteFields.location?.provider?.name?.length
        ? remoteFields.location?.provider?.name[0].name
        : 'No Provider Name',
      // eslint-disable-next-line no-await-in-loop
      serialN: remoteFields.device_serial,
      roomN: remoteFields.room_n,
      ipAddress: remoteFields.ip,
      type: remoteFields.device,
      modelCode: remoteFields.model_code,
      remoteControl: remoteFields.model_id ?? '0',
      model: remoteFields.model_id,
      lastActiveTime: new Date(remoteFields.time_close ? remoteFields.time_close * 1000 : remoteFields.time_update * 1000),
      manufacturer: remoteFields.manufacturer,
      macAddress: remoteFields.mac_address,
      userAgent: remoteFields.user_agent,
      appVersion: remoteFields.app_version,
      android_version: remoteFields.android_version?.name
        ? `${remoteFields.android_version?.name},${remoteFields.android_version?.api}`
        : remoteFields.android_version,
      timeShift: remoteFields.timeshift,
      language: remoteFields.lang,
      audioTrackDefault: remoteFields.audiotrack_default,
      httpCaching: remoteFields.http_caching,
      streamQuality: remoteFields.stream_quality,
      isBackgroundPlayer: remoteFields.background_player,
      isSD: remoteFields.definition_filter.filter((r) => r === 2).length,
      isHD: remoteFields.definition_filter.filter((r) => r === 3).length,
      isFHD: remoteFields.definition_filter.filter((r) => r === 4).length,
      isUHD: remoteFields.definition_filter.filter((r) => r === 5).length,
      uiFontSize: remoteFields.ui_font_size,
      lastUpdate: remoteFields.time_update,
      ott_client_id: null,
    };
    if (validateIP(remoteFields.ip)) {
      try {
        result.geoIpInfo = await GeoIpService.look(remoteFields.ip);
      } catch (err) {
        logger.error(err);
      }
    }
    if (remoteFields.cdn_sessions) {
      result.cdn_sessions = remoteFields.cdn_sessions;
      result.isLive = true;
    }
    return result;
  }

  static async AddUsedDeviceStatistics(usedDevice, userDeviceId, cdnSessions) {
    await StatisticService.AddUserdDeviceCdnSessions(usedDevice, userDeviceId, cdnSessions);
  }

  static async GetUsedDeviceUpdates(allUsedDevices, remoteUsedDevices) {
    const updateList = [];
    const toUpdateList = remoteUsedDevices.filter(
      (
        r // parseInt(r.settingsUpdateUts, 10)
      ) =>
        allUsedDevices.filter(
          (a) =>
            a.locationId &&
            a.locationId.login === r.location.login &&
            a.status !== 0 &&
            a.serialN === r.device_serial &&
            (!a.lastUpdate || a.lastUpdate > r.time_update)
        ).length
    );
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of toUpdateList) {
      // eslint-disable-next-line no-await-in-loop
      const foundList = allUsedDevices.filter(
        (r) => r.serialN === item.device_serial && r.locationId && r.locationId.id === item.location.id
      );
      if (foundList.length) {
        // eslint-disable-next-line no-restricted-syntax
        for (const currentItem of foundList) {
          const definitionFilter = [];
          if (currentItem.isSD) definitionFilter.push(2);
          if (currentItem.isHD) definitionFilter.push(3);
          if (currentItem.isFHD) definitionFilter.push(4);
          if (currentItem.isUHD) definitionFilter.push(5);

          const saveItem = {
            device_serial: currentItem.serialN,
            timeshift: currentItem.timeShift,
            lang: currentItem.language,
            definition_filter: definitionFilter,
            audiotrack_default: currentItem.audioTrackDefault,
            background_player: currentItem.isBackgroundPlayer ? 1 : 0,
            stream_quality: currentItem.streamQuality,
            ui_font_size: currentItem.uiFontSize,
            http_caching: currentItem.httpCaching,
          };

          // 'timeshift',
          // 'http_caching',
          // 'audiotrack_default',
          // 'definition_filter',
          // 'stream_quality',
          // 'background_player',
          // 'ui_font_size',

          updateList.push({
            usedDeviceId: currentItem.id,
            item: {
              devices: [saveItem],
              login: currentItem.locationId.login,
            },
          });
        }
      }
    }
    return updateList;
  }

  static async DoUsedDeviceSync(allUsedDevices, remoteUsedDevices) {
    const deleteList = [];
    const fromUpdates = [];
    const toAddList = [];
    const allUsedDevicesDict = allUsedDevices.reduce((obj, item) => {
      // eslint-disable-next-line no-param-reassign
      obj[item.locationId?.login + item.serialN] = item;
      return obj;
    }, {});
    const fromUpdateList = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const remoteUsedDevice of remoteUsedDevices) {
      const { login } = remoteUsedDevice.location;
      // eslint-disable-next-line camelcase
      const { device_serial } = remoteUsedDevice;
      // eslint-disable-next-line camelcase
      if (allUsedDevicesDict[login + device_serial]) {
        // eslint-disable-next-line camelcase
        const localUsedDevice = allUsedDevicesDict[login + device_serial];

        if (
          !localUsedDevice.lastUpdate ||
          localUsedDevice.lastUpdate < remoteUsedDevice.time_update ||
          remoteUsedDevice.cdn_sessions
        ) {
          fromUpdateList.push(remoteUsedDevice);
        }
      } else {
        toAddList.push(remoteUsedDevice);
      }
    }

    // const toAddList = remoteUsedDevices.filter(
    //   (r) =>
    //     !allUsedDevices.filter(
    //       (a) => a.locationId && a.locationId.login === r.location.login && r.device_serial === a.serialN
    //     ).lengths
    // );
    // const toUpdateList = remoteUsedDevices.filter(
    //   (
    //     r // parseInt(r.settingsUpdateUts, 10)
    //   ) =>
    //     allUsedDevices.filter(
    //       (a) =>
    //         a.locationId &&
    //         a.locationId.login === r.location.login &&
    //         a.status !== 0 &&
    //         a.serialN === r.device_serial &&
    //         (!a.lastUpdate || a.lastUpdate > r.time_update)
    //     ).length
    // );
    const toUpdateUsedDevices = await LocationUsedDeviceSyncService.GetUsedDeviceUpdates(allUsedDevices, remoteUsedDevices);
    // const toUpdateList = [];
    logger.info(
      `used devices to sync - create: ${toAddList.length} update: ${toUpdateUsedDevices.length} delete: ${deleteList.length} updateFrom: ${fromUpdateList.length}`
    );
    // const t+oUpdateList = allLocations.filter(
    //   (
    //     r // parseInt(r.settingsUpdateUts, 10)
    //   ) => remoteLocations.filter((a) => a.login === r.login && r.syncState !== 1).length && r.status !== 0
    // );
    // let toDeleteList = locationsThatNeedSync.filter(
    //   (r) => remoteLocations.filter((a) => a.login === r.login).length && r.status === 0
    // );
    // toDeleteList = toDeleteList.concat(
    //   remoteLocations.filter((r) => !allLocations.filter((a) => a.login === r.login).length)
    // );
    // const fromUpdateList = remoteUsedDevices.filter(
    //   (
    //     r // parseInt(r.settingsUpdateUts, 10)
    //   ) =>
    //     allUsedDevices.filter(
    //       (a) =>
    //         a.locationId &&
    //         a.locationId.login === r.location.login &&
    //         a.serialN === r.device_serial &&
    //         (!a.lastUpdate || a.lastUpdate < r.time_update || r.cdn_sessions)
    //     ).length
    // );
    // eslint-disable-next-line no-restricted-syntax
    for (const item of toAddList) {
      // eslint-disable-next-line no-await-in-loop
      const result = await LocationUsedDeviceSyncService.GetUsedDeviceFieldsForMiddleware(item);
      logger.info(`adding ${item.location._id.toString()}  ${item.location.login}`);
      const sendData = { ...result };
      // eslint-disable-next-line no-await-in-loop
      const updateResponse = await clientUsedDeviceRepository.createClientUsedDevice(sendData);
      if (updateResponse) {
        logger.info(`used device ${updateResponse._id} created synced successfully`);
      }
      // addMarkList.push(item._id);
    }
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of fromUpdateList) {
      // eslint-disable-next-line no-await-in-loop
      const result = await LocationUsedDeviceSyncService.GetUsedDeviceFieldsForMiddleware(item);
      if (result) fromUpdates.push(result);
    }
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of toUpdateUsedDevices) {
      // eslint-disable-next-line no-await-in-loop
      const updateResponse = await LocationUsedDeviceSyncCrudService.updateLocation(item.item);
      if (updateResponse.length && updateResponse[0].devices.length) {
        const device = updateResponse[0].devices.filter((r) => r.device_serial === item.item.devices[0].device_serial)[0];
        // eslint-disable-next-line no-await-in-loop
        await clientUsedDeviceRepository.updateClientUsedDeviceById(item.usedDeviceId, {
          lastUpdate: device.time_update,
        });
      }
    }
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const item of fromUpdates) {
      const saveData = { ...item };
      const findDevices = allUsedDevices.filter(
        (r) =>
          r.serialN === saveData.serialN && r.locationId && r.locationId._id.toString() === saveData.locationId.toString()
      );
      if (findDevices.length) {
        // eslint-disable-next-line no-restricted-syntax
        for (const updateDevice of findDevices) {
          if (updateDevice.isLive && !saveData.cdn_sessions) {
            const currentDate = new Date();
            const secondsPass = (currentDate.getTime() - updateDevice.liveDate.getTime()) / 1000;
            if (secondsPass > 60 * 5) saveData.isLive = false;
          }
          // eslint-disable-next-line no-await-in-loop
          const updated = await clientUsedDeviceRepository.updateClientUsedDeviceById(updateDevice._id.toString(), saveData);
          if (updated) {
            logger.info(`used device ${item.serialN} updated!`);
          }

          if (item.cdn_sessions) {
            // eslint-disable-next-line no-await-in-loop
            await LocationUsedDeviceSyncService.AddUsedDeviceStatistics(
              updateDevice.locationId._id.toString(),
              updateDevice._id.toString(),
              item.cdn_sessions
            );
            logger.info(`used device ${item.serialN} statistics updated!`);
          }

          // try {
          //   // eslint-disable-next-line no-await-in-loop
          //   await BroadcastService.broadcastToProvider(
          //     updateDevice.locationId.provider.toString(),
          //     `used-device-info-${updateDevice.locationId.clientId}`,
          //     {
          //       action: 'getList',
          //     }
          //   );
          // } catch (ex) {
          //   logger.error(ex);
          // }
        }
      }

      if (fromUpdates.length) {
        // mark location for cdn_sessions_updates
        // eslint-disable-next-line no-await-in-loop
        await StatisticService.MarkLocationCdnSync(fromUpdates[0].locationId.toString());
      }

      // delete sendData.locationId;
      // // eslint-disable-next-line no-await-in-loop
      // const updateResponse = await LocationSyncCrudService.createLocation(sendData);
      // if (updateResponse && updateResponse.login === item.login) {
      //   const currentResponse = updateResponse;
      //   const toSave = { ...item };
      //   if (currentResponse.password) toSave.password = currentResponse.password;
      //   if (currentResponse.pin_code) toSave.pin_code = currentResponse.pin_code;
      //   // eslint-disable-next-line no-await-in-loop
      //   markSyncList.push(toSave);
      // }
    }
    // if (markSyncList.length) {
    //   await LocationUsedDeviceSyncService.markAsSyncMultiple(markSyncList);
    //   logger.info(`locations:  count ${markSyncList.length} synced successfully`);
    // }
  }
}

module.exports = LocationUsedDeviceSyncService;
