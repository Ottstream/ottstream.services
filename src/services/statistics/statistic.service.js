/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
// const request = re/quire('request');
// const logger = require('../../utils/logger/logger');
const { repositories } = require('ottstream.dataaccess');

const {
  clientLocationRepository,
  ottProviderRepository,
  clientUsedDeviceRepository,
  clientRepository,
  // eslint-disable-next-line no-unused-vars
  packageRepository,
  invoiceRepository,
  // eslint-disable-next-line no-unused-vars
  subscriptionRepository,
} = repositories;
const CacheService = require('../cache/CacheService');
const logger = require('../../utils/logger/logger');

const BroadcastService = require('../socket/broadcastService.service');

class StatisticService {
  static async MarkLocationCdnSync(locationId) {
    await clientLocationRepository.updateLocationById(locationId, {
      statisticSyncState: 2,
    });
  }

  // eslint-disable-next-line no-unused-vars
  static async AddUserdDeviceCdnSessions(usedDevice, usedDeviceId, cdnSessions) {
    // const usedDevice = await clientUsedDeviceRepository.getClientUsedDeviceById(usedDeviceId);
    const existings = usedDevice.cdn_sessions;
    const newOnes = [];
    // eslint-disable-next-line no-restricted-syntax
    if (existings) {
      for (const incoming of cdnSessions) {
        const found = existings.filter((r) => r.remoteId === incoming.id);
        if (!found.length) {
          const pushObj = { ...incoming };
          pushObj.remoteId = incoming.id;
          newOnes.push(pushObj);
        }
      }
    }
    if (newOnes.length) {
      const all = [...usedDevice.cdn_sessions, ...newOnes];
      await clientUsedDeviceRepository.updateOne(
        { _id: usedDeviceId },
        {
          cdn_sessions: all,
        }
      );
    }
    // for (let cdnSession of cdnSessions) {
    //   // getClientUsedDeviceActivityStatistics
    // }
  }

  static async getPostalScheduleInfo(providerId) {
    const postalData = await CacheService.get(`provider-postal-info-${providerId}`);
    const statisticData = await CacheService.get(`invoice-schedule-info-${providerId}`);
    return { postalData, statisticData };
  }

  static async setPostalScheduleInfo(providerId, data) {
    const oldValue = await CacheService.get(`invoice-schedule-info-${providerId}`);
    const newValue = oldValue ? { ...oldValue, ...data } : data;
    const cached = await CacheService.setex(`invoice-schedule-info-${providerId}`, newValue, 500);
    return cached || {};
  }

  static async processServiceSubscriptionInfo(statisticData) {
    const provider = await ottProviderRepository.getBaseOttProvider();
    const cacheKey = 'service-info-subscription';
    await CacheService.setex(cacheKey, statisticData, 1800);
    await BroadcastService.broadcastToProvider(provider._id.toString(), 'statistic-info', { subsciption: statisticData });
  }

  static async processTelegramBotsInfo(telegramData) {
    const provider = await ottProviderRepository.getBaseOttProvider();
    const cacheKey = 'service-info-telegram';
    await CacheService.setex(cacheKey, telegramData, 1800);
    await BroadcastService.broadcastToProvider(provider._id.toString(), 'statistic-info', { telegram: telegramData });
  }

  // eslint-disable-next-line no-unused-vars
  static async getServiceSubscriptionInfo(providerId) {
    const cacheKey = 'service-info-subscription';
    let statisticData = {};
    if (await CacheService.hasKey(cacheKey)) {
      statisticData = await CacheService.get(cacheKey);
    }
    return statisticData;
  }

  // eslint-disable-next-line no-unused-vars
  static async getServiceTelegramInfo(providerId) {
    const cacheKey = 'service-info-telegram';
    let telegramData = {};
    if (await CacheService.hasKey(cacheKey)) {
      telegramData = await CacheService.get(cacheKey);
    }
    return telegramData;
  }

  // eslint-disable-next-line no-unused-vars
  static async getTransactions(viewProvider, fromProvider, fromClient) {
    const packages = await packageRepository.getList({});
    const packageDict = packages.reduce((obj, item) => {
      // eslint-disable-next-line no-param-reassign
      if (item._id) {
        obj[item._id.toString()] = item;
      }
      return obj;
    }, {});
    const clientPackageTracker = {};
    const clientFilter = {};
    if (fromClient) clientFilter._id = fromClient;
    const clients = await clientRepository.getAll(clientFilter);
    const invoiceFilter = {};
    invoiceFilter.state = 1;
    if (fromClient) invoiceFilter.client = fromClient;
    const invoices = await invoiceRepository.getList(invoiceFilter);
    logger.info(`overall invoices ${invoices.length}`);
    for (const invoice of invoices) {
      const clientId = invoice.client.toString();
      if (!clientPackageTracker[clientId]) clientPackageTracker[clientId] = {};
      if (!invoice.newPayload) {
        invoice.newPayload = {
          version: 1,
          buys: [],
          valid: true,
          refunds: [],
          errors: [],
          interval: ``,
          toProviderPrice: null,
        };

        const locationBuyRefunds = invoice.payloadCalculated.locations.filter(
          (r) => (r.packageInfos.length > 0 || r.packageRemoves.length > 0) && r.totalPrice !== 0
        );
        for (const locationBuyRefund of locationBuyRefunds) {
          invoice.newPayload.globalAction = locationBuyRefund.globalAction;
          if (locationBuyRefund.month) {
            invoice.newPayload.interval += `${locationBuyRefund.month} months `;
          }
          if (locationBuyRefund.day) {
            invoice.newPayload.interval += `${locationBuyRefund.day} days`;
          }
          if (locationBuyRefund.toParents) {
            if (locationBuyRefund.toParents[viewProvider]) {
              invoice.newPayload.toProviderPrice = locationBuyRefund.toParents[viewProvider].amount;
            }
          }
          for (const _packageInfo of locationBuyRefund.packageInfos) {
            const isInPackageRemoves = locationBuyRefund.packageRemoves.filter((r) => r === _packageInfo).length;
            if (!isInPackageRemoves) {
              const _package = locationBuyRefund.packages.filter((r) => r.packageId === _packageInfo)[0];
              if (_package) {
                const buyObject = {
                  packageName: _package.packageName[0].name,
                  packageId: _package.packageId,
                  expireNew: _package.expireNew,
                  startDate: invoice.createdAt,
                  endDate: _package.expireNew,
                  newStartDate: invoice.createdAt,
                  newEndDate: _package.expireNew,
                  oldStartDate: null,
                  oldEndDate: null,
                  oldRoom: null,
                  room: locationBuyRefund.room,
                };

                if (!clientPackageTracker[clientId][_packageInfo]) {
                  clientPackageTracker[clientId][_packageInfo] = { startDate: null, endDate: null };
                }
                if (!clientPackageTracker[clientId][_packageInfo].startDate)
                  clientPackageTracker[clientId][_packageInfo].startDate = buyObject.startDate;
                // set new startDate new endDate
                if (
                  clientPackageTracker[clientId][_packageInfo] &&
                  clientPackageTracker[clientId][_packageInfo].startDate &&
                  clientPackageTracker[clientId][_packageInfo].endDate
                ) {
                  if (buyObject.startDate < clientPackageTracker[clientId][_packageInfo].endDate) {
                    invoice.newPayload.valid = false;
                    buyObject.newStartDate = clientPackageTracker[clientId][_packageInfo].endDate;
                  }
                  if (buyObject.endDate < clientPackageTracker[clientId][_packageInfo].endDate) {
                    invoice.newPayload.valid = false;
                    buyObject.newEndDate = clientPackageTracker[clientId][_packageInfo].endDate;
                  }
                }

                clientPackageTracker[clientId][_packageInfo].endDate = buyObject.newEndDate;

                // if (previousInvoice) {
                //   const inBuys = previousInvoice.newPayload.buys.filter((r) => r.packageId === _package.packageId);
                //   const inRefunds = previousInvoice.newPayload.refunds.filter((r) => r.packageId === _package.packageId);
                //   if (inBuys.length) {
                //     buyObject.oldRoom = inBuys[0].room;
                //     buyObject.oldEndDate = inBuys[0].endDate;
                //     buyObject.oldStartDate = inBuys[0].startDate;
                //     if (inBuys[0].newStartDate && inBuys[0].newEndDate) {
                //       buyObject.oldEndDate = inBuys[0].newEndDate;
                //       buyObject.oldStartDate = inBuys[0].newStartDate;
                //     }
                //   }
                //   if (inRefunds.length) {
                //     buyObject.oldRoom = inRefunds[0].room;
                //   }
                //   if (inRefunds.length && inBuys.length) {
                //     invoice.newPayload.errors.push(
                //       `invoice ${invoice.number} has packageInfos, packageRemoves problem (double)`
                //     );
                //   }
                // }

                // if (
                //   clientPackageTracker[clientId][_packageInfo] &&
                //   clientPackageTracker[clientId][_packageInfo].startDate &&
                //   clientPackageTracker[clientId][_packageInfo].endDate
                // ) {
                //   // if (buyObject.oldRoom && buyObject.oldRoom === buyObject.room) {
                //   if (buyObject.oldStartDate && buyObject.oldEndDate && buyObject.startDate && buyObject.endDate) {
                //     if (buyObject.startDate <= buyObject.oldEndDate) {
                //       buyObject.newStartDate = buyObject.oldEndDate;
                //       buyObject.newEndDate = buyObject.endDate;
                //       logger.info(`invalid invoice buy startDate ${invoice.number}`);
                //       invoice.newPayload.valid = false;
                //     }
                //   }
                // }

                // if (buyObject.oldRoom && buyObject.oldRoom === buyObject.room) {
                // if (buyObject.oldStartDate && buyObject.oldEndDate && buyObject.startDate && buyObject.endDate) {
                //   if (buyObject.startDate <= buyObject.oldEndDate) {
                //     buyObject.newStartDate = buyObject.oldEndDate;
                //     buyObject.newEndDate = buyObject.endDate;
                //     logger.info(`invalid invoice buy startDate ${invoice.number}`);
                //     invoice.newPayload.valid = false;
                //   }
                // }
                // }a
                invoice.newPayload.buys.push(buyObject);
              } else {
                invoice.newPayload.errors.push(`invoice ${invoice.number} has packageInfo problem`);
              }
            } else {
              logger.info(`invoice not valid package bot in buys and refunds`);
            }
          }
          for (const _packageRemove of locationBuyRefund.packageRemoves) {
            const _package = locationBuyRefund.packages.filter((r) => r.packageId === _packageRemove)[0];

            const refundObject = {
              packageName: _package ? _package.packageName[0].name : packageDict[_packageRemove].name[0].name,
              packageId: _package ? _package.packageId : _packageRemove,
              expireNew: _package ? _package.expireNew || _package.expireDate : null,
              startDate: invoice.createdAt,
              newStartDate: invoice.createdAt,
              endDate: _package ? _package.expireNew || _package.expireDate : null,
              newEndDate: _package ? _package.expireNew || _package.expireDate : null,
              oldRoom: null,
              room: locationBuyRefund.room,
            };

            if (!clientPackageTracker[clientId][_packageRemove]) {
              clientPackageTracker[clientId][_packageRemove] = { startDate: null, endDate: null };
            }
            // set new startDate new endDate
            if (
              clientPackageTracker[clientId][_packageRemove] &&
              clientPackageTracker[clientId][_packageRemove].startDate &&
              clientPackageTracker[clientId][_packageRemove].endDate
            ) {
              if (refundObject.startDate < clientPackageTracker[clientId][_packageRemove].startDate) {
                invoice.newPayload.valid = false;
                refundObject.newStartDate = clientPackageTracker[clientId][_packageRemove].startDate;
              }
              if (refundObject.endDate < clientPackageTracker[clientId][_packageRemove].endDate) {
                invoice.newPayload.valid = false;
                refundObject.newEndDate = clientPackageTracker[clientId][_packageRemove].endDate;
              }
              clientPackageTracker[clientId][_packageRemove].startDate = null;
              clientPackageTracker[clientId][_packageRemove].endDate = null;
            } else {
              refundObject.newStartDate = null;
              refundObject.newEndDate = null;
              invoice.newPayload.valid = false;
            }

            invoice.newPayload.refunds.push(refundObject);
          }
        }
      }
    }
    // const subscriptions = await subscriptionRepository.getList({ client: incomingClientId });
    // const packages = await packageRepository.getList({});
    // const providers = await ottProviderRepository.getList({});
    // const packageDict = packages.reduce((obj, item) => {
    //   // eslint-disable-next-line no-param-reassign
    //   if (item._id) {
    //     obj[item._id.toString()] = item;
    //   }
    //   return obj;
    // }, {});
    // const clientDict = clients.reduce((obj, item) => {
    //   // eslint-disable-next-line no-param-reassign
    //   if (item._id) {
    //     obj[item._id.toString()] = item;
    //   }
    //   return obj;
    // }, {});
    // const providerDict = providers.reduce((obj, item) => {
    //   // eslint-disable-next-line no-param-reassign
    //   if (item._id) {
    //     obj[item._id.toString()] = item;
    //   }
    //   return obj;
    // }, {});
    const invoicesDict = invoices.reduce((obj, item) => {
      // eslint-disable-next-line no-param-reassign
      if (!obj[item.client.toString()]) {
        obj[item.client.toString()] = [];
      }
      obj[item.client.toString()].push(item);
      return obj;
    }, {});
    // const newSubscriptionsDict = subscriptions;
    // .filter((r) => !r.migrated)
    // .reduce((obj, item) => {
    //   // eslint-disable-next-line no-param-reassign
    //   if (!obj[item.client.toString()]) {
    //     obj[item.client.toString()] = [];
    //   }
    //   obj[item.client.toString()].push(item);
    //   return obj;
    // }, {});
    const response = { clients: [] };
    // eslint-disable-next-line no-restricted-syntax
    for (const client of clients) {
      const clientObject = {
        clientId: client._id.toString(),
        clientName: `${client.personalInfo.firstname} ${client.personalInfo.lastname}`,
        invoices: [],
      };
      const clientInvoices = invoicesDict[client._id.toString()];
      for (const clientInvoice of clientInvoices) {
        const invoiceObject = {
          invoiceId: clientInvoice._id.toString(),
          invoiceNumber: clientInvoice.number,
          invoiceDate: clientInvoice.createdAt,
          newPayload: clientInvoice.newPayload,
        };
        clientObject.invoices.push(invoiceObject);
      }
      response.clients.push(clientObject);
    }
    return response;
  }
}

module.exports = StatisticService;
