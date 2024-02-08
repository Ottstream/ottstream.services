/* eslint-disable no-restricted-syntax */
const { repositories } = require('ottstream.dataaccess');
const config = require('../../config/config');

const priceUtils = require('../../utils/price/price_utils');

const {
  subscriptionRepository,
  clientLocationRepository,
  clientPaymentMethodRepository,
  packageRepository,
  ottProviderRepository,
  equipmentSubscriptionRepository,
  equipmentRepository,
  // discountRepository,
  transactionRepository,
  updateLocationById,
  updateClientById,
  ottProviderPaymentGatewayRepository,
  updateClientLocationInfo,
} = repositories;
const logger = require('../../utils/logger/logger');
// const { updateLocationById } = require('../../repository/client/client_location.repository');
// const { updateClientById } = require('../../repository/client/client.repository');
// const NotificationService = require('../notification/notification.service');
// const ottProviderPaymentGatewayRepository = require('../../repository/ottprovider/ottprovider_payment_gateway.repository');
// const { updateClientLocationInfo } = require('../../repository/client/client.shared.repository');

const getMaxExpireSubscription = (subscriptions) => {
  const maxDate = subscriptions.length ? subscriptions[0].endDate : new Date();
  let subscription = null;
  if (subscriptions && subscriptions.length) {
    subscriptions.forEach((item) => {
      if (item.endDate >= maxDate) {
        subscription = item;
      }
    });
  }
  return subscription;
};

class SubscriptionService {
  constructor() {
    logger.info(`InvoiceService() initiated`);
  }

  static async locationFirstTimeLogin(dbLocation, remoteLocation) {
    // TODO if else handling
    if (dbLocation.login === remoteLocation.login && remoteLocation.autostart_status === -1) {
      const locationSubscriptions = await subscriptionRepository.getLocationSubscriptions(dbLocation._id.toString());
      if (locationSubscriptions.length && !locationSubscriptions.filter((r) => r.isActive).length) {
        const biggerDevices = remoteLocation.devices.filter(
          (r) => r.time_update > remoteLocation.packet_start || r.time_create > remoteLocation.packet_start
        );
        let minimumAutoStart = new Date().getTime() / 1000;
        const compareDate = remoteLocation.packet_start;
        let diff = remoteLocation.packet_expire;
        // eslint-disable-nex0t-line guard-for-in,no-restricted-syntax
        // eslint-disable-next-line no-restricted-syntax
        for (const device of biggerDevices) {
          if (device.time_create >= compareDate && device.time_create - compareDate < diff) {
            diff = device.time_create - compareDate;
            minimumAutoStart = device.time_create;
          }
          if (device.time_update >= compareDate && device.time_update - compareDate < diff) {
            diff = device.time_update - compareDate;
            minimumAutoStart = device.time_update;
          }
        }
        logger.info(`updating autostart from ${remoteLocation.packet_start} to ${minimumAutoStart}`);
        const minimumAutoStartDate = new Date(minimumAutoStart * 1000);
        // eslint-disable-next-line no-unused-vars,no-restricted-syntax
        for (const locationSubscription of locationSubscriptions) {
          const endDate = new Date().setTime(
            minimumAutoStartDate.getTime() +
              (locationSubscription.endDate.getTime() - locationSubscription.startDate.getTime())
          );
          const updateBody = {
            isActive: true,
            startDate: minimumAutoStartDate,
            endDate,
          };
          // TODO shift time and test
          // eslint-disable-next-line no-await-in-loop
          await subscriptionRepository.updateSubscriptionById(locationSubscription._id.toString(), updateBody);
        }
        if (dbLocation.clientId) {
          await SubscriptionService.updateSubscriptionStates(dbLocation.clientId?._id.toString());
        }
      }
    }
  }

  static async updateSubscriptionStates(clientId, cancelList = []) {
    try {
      const clientLocations = await clientLocationRepository.getClientLocations({ clientId });
      let allLocationsFree = true;
      let hasActiveSubscription = false;
      const cancelLocations = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const clientLocation of clientLocations) {
        const packageSubscriptions = [];
        let expireDate = null;
        let hasSubscriptions = false;
        // eslint-disable-next-line no-await-in-loop
        const locationSubscriptions = await subscriptionRepository.getLocationSubscriptions(clientLocation._id.toString());
        const locationSubscriptionHaveActive = locationSubscriptions.filter((r) => r.isActive).length;
        let isRecurring = false;
        let isCancel = false;
        if (locationSubscriptions.length) {
          hasSubscriptions = true;
          allLocationsFree = false;
          isRecurring = false;
          for (const locSub of locationSubscriptions) {
            if (locSub.endDate > expireDate) expireDate = locSub.endDate;
            if (locSub.isRecurring) isRecurring = true;
            packageSubscriptions.push({
              name: locSub.package?.name,
              expireDate,
              isRecurring,
            });
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          const locationInactiveSubscriptions = await subscriptionRepository.getList(
            { location: clientLocation._id.toString() },
            [
              {
                path: 'package',
              },
              {
                path: 'client',
              },
              {
                path: 'location',
              },
            ]
          );
          if (locationInactiveSubscriptions.length) {
            const firstDateSorted = locationInactiveSubscriptions.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            const locationInactiveSubscriptionsDict = locationInactiveSubscriptions.reduce((obj, item) => {
              // eslint-disable-next-line no-param-reassign
              let key = 'undefined';
              if (item.invoice) key = item.invoice.toString();
              if (!obj[key]) {
                // eslint-disable-next-line no-param-reassign
                obj[key] = [];
              }
              obj[key].push(item);
              return obj;
            }, {});
            let measureKey = 'undefined';
            if (firstDateSorted[0].invoice) measureKey = firstDateSorted[0].invoice.toString();
            const measureSubscriptions = locationInactiveSubscriptionsDict[measureKey];
            if (firstDateSorted[0].returnInvoice) isCancel = true;
            // eslint-disable-next-line prefer-destructuring
            expireDate = measureSubscriptions[0].expireDate;
            isRecurring = false;
            for (const locSub of measureSubscriptions) {
              if (locSub.endDate > expireDate) expireDate = locSub.endDate;
              if (locSub.isRecurring) isRecurring = true;
              packageSubscriptions.push({
                name: locSub.package?.name,
                expireDate,
                isRecurring,
              });
            }
          }
        }
        let subscriptionState = 0;
        if (!hasSubscriptions) subscriptionState = 0;
        if (hasSubscriptions && locationSubscriptionHaveActive) {
          hasActiveSubscription = true;
          subscriptionState = 3;
        }
        const locationUpdateObject = {
          subscriptionState,
          syncState: 2,
          isRecurring,
        };
        if (hasSubscriptions && !locationSubscriptionHaveActive) {
          locationUpdateObject.subscriptionState = 1;
          if (!clientLocations.subscriptionPendingDate) locationUpdateObject.subscriptionPendingDate = new Date();
        }
        if (subscriptionState === 3 && subscriptionState !== clientLocation.subscriptionState)
          locationUpdateObject.subscriptionActivationDate = new Date();
        if (
          !hasSubscriptions &&
          ((cancelList && cancelList.filter((r) => r === clientLocation._id.toString()).length) || isCancel)
        ) {
          if (cancelList && cancelList.filter((r) => r === clientLocation._id.toString()).length)
            locationUpdateObject.subscriptionCancelDate = new Date();
          locationUpdateObject.subscriptionState = 2;
          cancelLocations.push(locationUpdateObject);
        }
        if (expireDate) {
          locationUpdateObject.subscriptionExpireDate = expireDate;
        }
        // eslint-disable-next-line no-await-in-loop
        const updatedLocation = await updateLocationById(clientLocation._id.toString(), locationUpdateObject);
        // eslint-disable-next-line no-await-in-loop
        await updateClientLocationInfo(updatedLocation, false, packageSubscriptions);
        // broadcast
        // if (clientLocation.subscriptionState !== locationUpdateObject.subscriptionState) {
        //   // eslint-disable-next-line no-await-in-loop
        //   await NotificationService.GenerateLocationStatusNotification(updatedLocation);
        // }
      }
      let clientSubscriptionState = 1;
      if (allLocationsFree) clientSubscriptionState = 0;
      if (hasActiveSubscription) clientSubscriptionState = 3;
      const clientUpdateObject = {
        subscriptionState: clientSubscriptionState,
      };
      if (allLocationsFree && (cancelList.length || cancelLocations.length)) {
        if (cancelList.length) clientUpdateObject.subscriptionCancelDate = new Date();
        clientUpdateObject.subscriptionState = 2;
      }
      if (!allLocationsFree && !hasActiveSubscription) {
        clientUpdateObject.subscriptionPendingDate = new Date();
        clientUpdateObject.subscriptionState = 1;
      }
      if (clientSubscriptionState === 3) clientUpdateObject.subscriptionActivationDate = new Date();

      await updateClientById(clientId, clientUpdateObject);
    } catch (ex) {
      logger.error(ex);
    }
  }

  // eslint-disable-next-line no-unused-vars
  static async calculateSubscription(forEdit, payload, provider) {
    // Get the initial high-resolution time
    const startTime = process.hrtime();
    let endTime = null;
    const totalResponse = {
      client: payload.client,
      totalPrice: 0,
      price: 0,
      toResaleTotalPrice: 0,
      locationTax: 0,
      equipmentTax: 0,
      refund: false,
      lastPaymentType: '',
      availablePaymentTypes: {
        balance: true,
        card: true,
        saved: [],
        bankTransfer: true,
        cash: true,
        check: true,
        moneyOrder: true,
        fastCredit: true,
      },
      totalTax: 0,
      bankFee: 0,
      locations: [],
      equipment: {
        equipments: await equipmentSubscriptionRepository.getEquipmentSubscriptionsByClientId(payload.client), // get current equipments and add to list;
        equipmentInfos: [],
        totalPrice: 0,
      },
    };
    const savedPaymentMethods = await clientPaymentMethodRepository.getClientPaymentMethodByClientId(totalResponse.client);
    // get gateways

    const paymentGateWays = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(
      provider._id.toString()
    );
    const paymentGateway = paymentGateWays.length ? paymentGateWays[0] : null;
    let providerHasValidCardGateway = false;
    let providerHasValidBankGateway = false;
    let bankFeePercent = 0;
    let bankFeeFixed = 0;
    if (paymentGateway?.cardsFee?.percent) {
      // eslint-disable-next-line no-unused-vars
      bankFeePercent = paymentGateway?.cardsFee?.percent;
    }
    if (paymentGateway?.cardsFee?.fixed) {
      // eslint-disable-next-line no-unused-vars
      bankFeeFixed = paymentGateway?.cardsFee?.fixed;
    }
    const refundInvoices = [];

    if (paymentGateway?.cards === 'clover' && paymentGateway?.clover?.isValid) {
      providerHasValidCardGateway = true;
    }
    if (paymentGateway?.cards === 'square' && paymentGateway?.square?.isValid) {
      providerHasValidCardGateway = true;
    }
    if (paymentGateway?.cards === 'stripe' && paymentGateway?.stripe?.isValid) {
      providerHasValidCardGateway = true;
    }
    if (paymentGateway?.cards === 'authorize' && paymentGateway?.authorize?.isValid) {
      providerHasValidCardGateway = true;
    }
    if (paymentGateway?.bank === 'square' && paymentGateway?.square?.isValid) {
      providerHasValidBankGateway = true;
    }
    if (paymentGateway?.bank === 'stripe' && paymentGateway?.stripe?.isValid) {
      providerHasValidBankGateway = true;
    }
    if (paymentGateway?.bank === 'authorize' && paymentGateway?.authorize?.isValid) {
      providerHasValidBankGateway = true;
    }

    const hasParent = !!provider.parent; // provider

    // eslint-disable-next-line no-await-in-loop
    const parentOtts = await ottProviderRepository.getOttParents(provider._id.toString());

    const parentOttPackages = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const parentOtt of parentOtts) {
      const parentOttKey = parentOtt._id.toString();
      // eslint-disable-next-line no-await-in-loop
      const currentParentPackages = await packageRepository.getPackageOptions(parentOtt._id.toString());
      const currentParentPackagesDict = currentParentPackages.reduce((obj, item) => {
        // eslint-disable-next-line no-param-reassign
        obj[item.package.toString()] = item;
        return obj;
      }, {});
      parentOttPackages[parentOttKey] = currentParentPackagesDict;
    }

    let isActionNormalForCalculation = false;
    // eslint-disable-next-line prefer-const
    if (payload.locations.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const body of payload.locations) {
        // eslint-disable-next-line no-continue
        if (payload.selectedLocation && payload.selectedLocation !== body.locationId) continue;
        // eslint-disable-next-line prefer-const
        let { room, packageInfos, globalAction, recurringPaymentInfos, packageRemoves } = body;
        let oldPackageInfos = [];
        if (!packageRemoves) packageRemoves = [];

        // eslint-disable-next-line no-await-in-loop
        const location = await clientLocationRepository.getClientLocationById(body.locationId);
        if (!location) {
          if (forEdit) {
            throw new Error('location not found');
          } else {
            // eslint-disable-next-line no-continue
            continue;
          }
        }

        const response = {
          globalAction,
          locationId: location._id.toString(),
          locationName: location.locationName,
          locationLogin: location.login,
          room,
          packageInfos: packageInfos ?? [],
          packageRemoves: packageRemoves ?? [],
          totalPrice: 0,
          packages: [],
        };
        if (response.globalAction === 1) {
          response.day = body.day;
          response.month = body.month;
        }
        if (response.globalAction === 3) {
          response.subscribeToDate = body.subscribeToDate;
        }
        // do calculation
        if (!room) room = location.roomsCount;
        response.room = room;

        // eslint-disable-next-line no-await-in-loop
        const subscriptions = await subscriptionRepository.queryLocationSubscriptions(body.locationId);

        const maxExpireSubscription = getMaxExpireSubscription(
          subscriptions.filter(
            (r) => !packageRemoves.filter((a) => a === r.package._id.toString()).length && !r?.invoice?.canceledExecuted
          )
        );
        let globalStartDate = new Date();
        if (maxExpireSubscription && !maxExpireSubscription.isActive) {
          globalStartDate = new Date(maxExpireSubscription.startDate.valueOf());
        }
        let globalEndDate = new Date(globalStartDate);
        // test
        if (
          maxExpireSubscription === null &&
          (globalAction === 2 ||
            (globalAction === 1 &&
              subscriptions.filter((r) => !packageRemoves.filter((a) => a === r.package._id.toString()).length).length))
        ) {
          response.packageInfos = [];
          packageInfos = [];
          // throw new ApiError(400, 'no active subscription but global action is 2');
        }
        if (maxExpireSubscription != null) {
          if (globalAction === 1) {
            globalEndDate = new Date(maxExpireSubscription.endDate.valueOf());
          }
          if (globalAction === 2) {
            globalEndDate = new Date(maxExpireSubscription.endDate.valueOf());
            isActionNormalForCalculation = true;
          }
        }

        if (globalAction === 3 && body.subscribeToDate) {
          isActionNormalForCalculation = true;
          globalEndDate = new Date(body.subscribeToDate.valueOf());
        }

        if (globalAction === 1) {
          if (body.month) {
            globalEndDate = priceUtils.addMonths(globalEndDate, body.month);
            isActionNormalForCalculation = true;
          }
          if (body.day) {
            globalEndDate = priceUtils.addUTCDays(globalEndDate, body.day);
            isActionNormalForCalculation = true;
          }
        }

        if (packageRemoves?.length) isActionNormalForCalculation = true;
        let filteredLatest = [];
        let oldSubscriptions = [];
        // let latestSubscriptionEndDate = null;

        if (maxExpireSubscription === null) {
          let itemWithHighestCreatedAt = null;
          let itemWithHighestReturnCreatedAt = null;
          // eslint-disable-next-line no-await-in-loop
          oldSubscriptions = await subscriptionRepository.getList(
            {
              location: body.locationId,
              state: 0,
            },
            [
              { path: 'invoice', select: 'id number payloadCalculated amount totalAmount createdAt' },
              { path: 'returnInvoice', select: 'id number payloadCalculated amount totalAmount createdAt' },
            ]
          );
          const drawOldPackages =
            (location.subscriptionState === 0 || location.subscriptionState === 2) &&
            (!response.packageInfos.length || !isActionNormalForCalculation) &&
            !response.packageRemoves.length &&
            oldSubscriptions.length;
          if (oldSubscriptions.length) {
            itemWithHighestCreatedAt = oldSubscriptions.reduce((max, item) => {
              if (!max.invoice) return item;
              return item.invoice?.createdAt?.getTime() > max.invoice?.createdAt?.getTime() ? item : max;
            });
            itemWithHighestReturnCreatedAt = oldSubscriptions.reduce((max, item) => {
              if (!max.returnInvoice) return item;
              return item.returnInvoice?.createdAt?.getTime() > max.returnInvoice?.createdAt?.getTime() ? item : max;
            });
            if (
              (itemWithHighestCreatedAt.invoice &&
                itemWithHighestReturnCreatedAt.returnInvoice &&
                itemWithHighestReturnCreatedAt?.returnInvoice?.createdAt.getTime() >
                  itemWithHighestCreatedAt?.invoice?.createdAt.getTime()) ||
              (itemWithHighestReturnCreatedAt.returnInvoice && !itemWithHighestCreatedAt.invoice)
            ) {
              oldSubscriptions = oldSubscriptions.filter(
                (r) => r.returnInvoice?.id === itemWithHighestReturnCreatedAt?.returnInvoice?.id
              );

              if (drawOldPackages) {
                filteredLatest = oldSubscriptions.filter(
                  (r) => r.returnInvoice?.id === itemWithHighestReturnCreatedAt.returnInvoice?.id
                );
              }
            } else if (
              (itemWithHighestCreatedAt.invoice &&
                itemWithHighestReturnCreatedAt.returnInvoice &&
                itemWithHighestReturnCreatedAt?.returnInvoice?.createdAt.getTime() <=
                  itemWithHighestCreatedAt?.invoice?.createdAt.getTime()) ||
              (!itemWithHighestReturnCreatedAt.returnInvoice && itemWithHighestCreatedAt.invoice)
            ) {
              oldSubscriptions = oldSubscriptions.filter((r) => r.invoice?.id === itemWithHighestCreatedAt?.invoice?.id);
              if (drawOldPackages)
                filteredLatest = oldSubscriptions.filter((r) => r.invoice?.id === itemWithHighestCreatedAt.invoice?.id);
            } else if (drawOldPackages)
              filteredLatest = oldSubscriptions.filter((r) => r.invoice?.id === itemWithHighestCreatedAt.invoice?.id);

            oldPackageInfos = [...new Set(filteredLatest)].map((r) => r.package.toString());
          }
        }

        if (maxExpireSubscription && maxExpireSubscription.room !== body.room && body.room)
          isActionNormalForCalculation = true;

        // if (
        //   subscriptions.length &&
        //   packageRemoves.filter((a) => subscriptions.filter((r) => r.package._id.toString() === a).length).length
        // )
        //   isActionNormalForCalculation = false;
        // set time of global start time ot global end time
        // globalEndDate.setHours(
        //   globalStartDate.getHours(),
        //   globalStartDate.getMinutes(),
        //   globalStartDate.getSeconds(),
        //   globalStartDate.getMilliseconds()
        // );

        const hasBadPrice = (option) => {
          return (
            !(Array.isArray(option) ? option.length : option?.prices?.length) ||
            !(option?.prices?.length && option?.prices.filter((r) => !r.clientType)[0]?.priceItems?.length)
          );
        };
        const parentOttParents = [];

        // calculate to parent prices
        for (const parentOtt of parentOtts) {
          // eslint-disable-next-line no-await-in-loop
          // const currentParentPackages = await packageRepository.getPackageOptions(parentOtt._id.toString());

          // const currentParentPackagesDict = currentParentPackages.reduce((obj, item) => {
          //   // eslint-disable-next-line no-param-reassign
          //   obj[item.package.toString()] = item;
          //   return obj;
          // }, {});

          parentOttParents.push({ parentOtt, currentParentPackagesDict: parentOttPackages[parentOtt._id.toString()] });
        }

        // eslint-disable-next-line no-await-in-loop
        const currentPackageOptions = await packageRepository.getPackageOptions(provider._id.toString());
        const currentPackageOptionsDict = currentPackageOptions.reduce((obj, item) => {
          // eslint-disable-next-line no-param-reassign
          obj[item.package.toString()] = item;
          return obj;
        }, {});

        // get all packages
        // eslint-disable-next-line no-await-in-loop
        const _packages = await packageRepository.getList({});
        // eslint-disable-next-line no-loop-func,no-restricted-syntax
        for (const _package of _packages) {
          const currentPackage = {
            package: _package,
            totalPrice: 0,
          };

          // send selected recurringPayment, first step when hasn't subscriptions
          const subscriptionPackages = subscriptions.filter(
            (r) => r.package && r.package.toString() === _package._id.toString() && r.state === 1
          );
          if (subscriptionPackages.length) {
            if (subscriptionPackages.length > 1)
              logger.error(
                `package has more subscription than 1 for one location ${subscriptionPackages[0]._id.toString()}`
              );
            // eslint-disable-next-line prefer-destructuring
            currentPackage.subscription = subscriptionPackages[0];
            totalResponse.lastPaymentType = currentPackage.subscription.lastPaymentType;
            if (location.isPauseSubscriptions) {
              const lastPause = location.pauses[location.pauses.length - 1];
              let diffInTime = 0;
              if (lastPause) {
                diffInTime = new Date().getTime() - lastPause.startDate.getTime();
              }
              currentPackage.subscription.endDate = new Date(currentPackage.subscription.endDate.getTime() + diffInTime);
              currentPackage.paused = true;
              currentPackage.pauseStartDate = lastPause?.startDate;
              response.pauseStartDate = lastPause?.startDate;
              response.paused = true;
              const diff = new Date().getDate() - lastPause?.startDate;
              response.pauseDuration = Math.floor(diff / 1000 / 60);
              currentPackage.pauseDuration = Math.floor(diff / 1000 / 60);
            }
          }
          currentPackage.parentHasNormalPrice = true;
          currentPackage.hasNormalPrice = true;
          currentPackage.parentEnabled = true;
          // :disabled="!actionType || (actionType === 1 && (!item.expireDate || item.expired) && !dayMonthValue)"

          // calculate to parent prices
          for (const parentOttObj of parentOttParents) {
            const { currentParentPackagesDict } = parentOttObj;

            if (hasBadPrice(currentParentPackagesDict[_package._id.toString()])) {
              currentPackage.parentHasNormalPrice = false;
            }

            if (
              !currentParentPackagesDict[_package._id.toString()] ||
              currentParentPackagesDict[_package._id.toString()].state !== 1
            )
              currentPackage.parentEnabled = false;
          }
          currentPackage.hasNormalPrice = hasBadPrice(currentPackageOptionsDict[_package._id.toString()]);

          currentPackage.selfEnabled =
            currentPackageOptionsDict[_package._id.toString()] &&
            currentPackageOptionsDict[_package._id.toString()].state === 1;
          if (currentPackage.subscription) {
            currentPackage.expireDate = currentPackage.subscription.endDate;
            currentPackage.startDate = currentPackage.subscription.startDate;

            currentPackage.recurringPayment = currentPackage.subscription.recurringPayment;
            // currentStartDate = new Date(currentPackage.subscription.endDate.valueOf());
          } else if (!subscriptions.filter((r) => r.state === 1).length) {
            const subscriptionPackagesInactive = oldSubscriptions.filter(
              (r) => r.package && r.package.toString() === _package._id.toString() && r.state === 0
            );
            if (subscriptionPackagesInactive.length) {
              const metricInactiveSubscription = subscriptionPackagesInactive[subscriptionPackagesInactive.length - 1];

              currentPackage.expireDate = metricInactiveSubscription.endDate;
              currentPackage.startDate = new Date(); // metricInactiveSubscription.startDate;

              currentPackage.recurringPayment = metricInactiveSubscription.recurringPayment;
            }
          }

          if (recurringPaymentInfos) {
            // isActionNormalForCalculation
            const filtered = recurringPaymentInfos.filter(
              (r) => r.packageId && r.packageId.toString() === _package._id.toString()
            );
            if (filtered.length) {
              currentPackage.recurringPayment = filtered.length ? filtered[0].recurringPayment : undefined;
            }
          }
          if (currentPackage.package) {
            currentPackage.packageId = currentPackage.package._id.toString();
            currentPackage.packageName = currentPackage.package.name;
            currentPackage.packageType = currentPackage.package.type;
          }

          const isPackageSubscribed = subscriptions.filter(
            (r) => r.package && r.package.toString() === _package._id.toString()
          ).length;
          if (
            (!currentPackage.parentHasNormalPrice || !currentPackage.parentEnabled || !currentPackage.selfEnabled) &&
            !isPackageSubscribed
          ) {
            packageInfos = packageInfos.filter((r) => r !== _package._id.toString());
            currentPackage.disabled = true;
            currentPackage.hide = true;
          }
          if (!isActionNormalForCalculation && !isPackageSubscribed) {
            packageInfos = packageInfos.filter((r) => r !== _package._id.toString());
            currentPackage.disabled = true;
          }
          const isPackageSelected = packageInfos.filter((r) => r === _package._id.toString()).length;

          let isPackageRemoved = packageRemoves.filter((r) => r === _package._id.toString()).length;

          if (!isPackageSubscribed && isPackageRemoved) isPackageRemoved = false;

          currentPackage.currentPrice = priceUtils.getMonthPrice(
            currentPackageOptionsDict[_package._id.toString()],
            room,
            true,
            location.clientId?.finance?.priceGroup,
            null
          );

          const discount = null;
          // try {
          //   // active discount
          //   const discounts = discountRepository.getActiveDiscountsForClient(
          //     _package._id.toString(),
          //     location.clientId?.finance?.priceGroup
          //   );
          //   discount = discounts.length ? discounts[discounts.length - 1] : null;
          // } catch (exception) {
          //   logger.error(exception);
          // }

          // expirenew and total price calculations
          if (isActionNormalForCalculation) {
            // calculate or not
            if (isPackageSelected && isActionNormalForCalculation) {
              const calculateEndDate = globalEndDate;

              if (
                currentPackage.parentHasNormalPrice &&
                currentPackage.parentEnabled &&
                currentPackage.selfEnabled &&
                currentPackage.currentPrice > 0
              ) {
                currentPackage.expireNew = globalEndDate;
                if (
                  currentPackage.subscription &&
                  currentPackage.subscription.endDate.getTime() > calculateEndDate.getTime()
                ) {
                  currentPackage.stop = true;
                }

                // eslint-disable-next-line no-lonely-if
                if (currentPackage.subscription) {
                  const curTotal = priceUtils.calculateDateIntervalPrice(
                    currentPackageOptionsDict[_package._id.toString()],
                    globalStartDate,
                    currentPackage.subscription.endDate,
                    currentPackage.subscription.room,
                    true,
                    location.clientId?.finance?.priceGroup,
                    discount
                  );
                  currentPackage.totalPrice = curTotal !== null ? -curTotal : 0;
                  currentPackage.stopPrice = currentPackage.totalPrice;

                  currentPackage.toParents = {};
                  let currentPayer = provider._id.toString();
                  // eslint-disable-next-line no-restricted-syntax
                  for (const parentOtt of parentOtts) {
                    const parentOttKey = parentOtt._id.toString();
                    currentPackage.toParents[parentOttKey] = { amount: 0 };

                    const currentParentPackagesDict = parentOttPackages[parentOttKey];

                    const curCalc = priceUtils.calculateDateIntervalPrice(
                      currentParentPackagesDict[_package._id.toString()],
                      globalStartDate,
                      currentPackage.subscription.endDate,
                      currentPackage.subscription.room,
                      false,
                      parentOtt.priceGroup,
                      null
                    );
                    currentPackage.toParents[parentOttKey].amount = curCalc !== null ? -curCalc : 0;
                    currentPackage.toParents[parentOttKey].from = currentPayer;
                    currentPayer = parentOttKey;
                  }

                  const totalPlus = priceUtils.calculateDateIntervalPrice(
                    currentPackageOptionsDict[_package._id.toString()],
                    globalStartDate,
                    currentPackage.stop ? globalEndDate : currentPackage.subscription.endDate,
                    room,
                    true,
                    location.clientId?.finance?.priceGroup,
                    discount
                  );
                  currentPackage.totalPrice += totalPlus !== null ? totalPlus : 0;
                }
                if (!currentPackage.stop) {
                  const totalPlus = priceUtils.calculateDateIntervalPrice(
                    currentPackageOptionsDict[_package._id.toString()],
                    currentPackage.subscription ? currentPackage.subscription.endDate : globalStartDate,
                    globalEndDate,
                    room,
                    true,
                    location.clientId?.finance?.priceGroup,
                    discount
                  );
                  currentPackage.totalPrice += totalPlus !== null ? totalPlus : 0;
                }
                if (hasParent) {
                  if (currentPackage.subscription) {
                    if (!currentPackage.toParents) currentPackage.toParents = {};
                    let currentPayer = provider._id.toString();
                    let curPriceGroup = provider.priceGroup;
                    // eslint-disable-next-line no-restricted-syntax
                    for (const parentOtt of parentOtts) {
                      const parentOttKey = parentOtt._id.toString();
                      currentPackage.toParents[parentOttKey] = { amount: 0 };

                      const currentParentPackagesDict = parentOttPackages[parentOttKey];

                      const curPrice = priceUtils.calculateDateIntervalPrice(
                        currentParentPackagesDict[_package._id.toString()],
                        globalStartDate,
                        currentPackage.stop ? globalEndDate : currentPackage.subscription.endDate,
                        room,
                        false,
                        curPriceGroup,
                        null
                      );
                      currentPackage.toParents[parentOttKey].amount = curPrice !== null ? curPrice : 0;
                      currentPackage.toParents[parentOttKey].from = currentPayer;
                      currentPayer = parentOttKey;
                      curPriceGroup = parentOtt.priceGroup;
                    }
                  }

                  if (!currentPackage.stop) {
                    if (!currentPackage.toParents) currentPackage.toParents = {};
                    let currentPayer = provider._id.toString();
                    let curPriceGroup = provider.priceGroup;
                    // eslint-disable-next-line no-restricted-syntax
                    for (const parentOtt of parentOtts) {
                      const parentOttKey = parentOtt._id.toString();
                      currentPackage.toParents[parentOttKey] = { amount: 0 };

                      const currentParentPackagesDict = parentOttPackages[parentOttKey];

                      const curPlus = priceUtils.calculateDateIntervalPrice(
                        currentParentPackagesDict[_package._id.toString()],
                        currentPackage.subscription ? currentPackage.subscription.endDate : globalStartDate,
                        globalEndDate,
                        room,
                        false,
                        curPriceGroup,
                        null
                      );
                      currentPackage.toParents[parentOttKey].amount = +(curPlus !== null ? curPlus : 0);
                      currentPackage.toParents[parentOttKey].from = currentPayer;
                      currentPayer = parentOttKey;
                      curPriceGroup = parentOtt.priceGroup;
                    }
                  }
                  // case when parent removed price
                  // if (
                  //   currentPackage.toResaleTotalPrice < 0 &&
                  //   (isPackageSubscribed ? currentPackage.expireNew >= currentPackage.expireDate : true) &&
                  //   isPackageSubscribed
                  //     ? body.room >= currentPackage.subscription.room
                  //     : true
                  // ) {
                  //   delete currentPackage.expireNew;
                  //   currentPackage.totalPrice = 0;
                  //   currentPackage.toResaleTotalPrice = 0;
                  // }
                }
              } else if (currentPackage.expireDate) currentPackage.expireNew = currentPackage.expireDate;
            }
          }
          // add package to selected list or remove package subscription
          if (!isPackageSelected && isPackageSubscribed && !isPackageRemoved) {
            if (!isActionNormalForCalculation) {
              response.packageInfos.push(_package._id.toString());
            }
          }
          if (isPackageRemoved && isPackageSubscribed) {
            currentPackage.canceled = true;
            // if (currentPackage.subscription && currentPackage.subscription.updates.length) {
            //   const stopPrices = priceUtils.calculateSubscriptionStopPrice(currentPackage.subscription);
            //   currentPackage.totalPrice = stopPrices.totalPrice;
            //   currentPackage.stopPrice = stopPrices.totalPrice;
            //   currentPackage.toResaleTotalPrice = stopPrices.toResaleTotalPrice;
            //   currentPackage.toResaleStopPrice = stopPrices.toResaleTotalPrice;
            //   currentPackage.stop = true;
            // }
            // eslint-disable-next-line no-lone-blocks
            if (currentPackage.subscription) {
              const totPrice = priceUtils.calculateDateIntervalPrice(
                currentPackageOptionsDict[_package._id.toString()],
                new Date(),
                currentPackage.subscription.endDate,
                room,
                true,
                location.clientId?.finance?.priceGroup,
                discount
              );
              if (!currentPackage.toParents) currentPackage.toParents = {};
              let currentPayer = provider._id.toString();
              let curPriceGroup = provider.priceGroup;
              // eslint-disable-next-line no-restricted-syntax
              for (const parentOtt of parentOtts) {
                const parentOttKey = parentOtt._id.toString();
                const currentParentPackagesDict = parentOttPackages[parentOttKey];
                currentPackage.toParents[parentOttKey] = { amount: 0 };

                const curCalc = priceUtils.calculateDateIntervalPrice(
                  currentParentPackagesDict[_package._id.toString()],
                  new Date(),
                  currentPackage.subscription.endDate,
                  room,
                  false,
                  curPriceGroup,
                  null
                );
                currentPackage.toParents[parentOttKey].amount -= curCalc !== null ? curCalc : 0;
                currentPackage.toParents[parentOttKey].from = currentPayer;
                currentPayer = parentOttKey;
                curPriceGroup = parentOtt.priceGroup;
              }
              currentPackage.totalPrice = totPrice !== null ? -totPrice : 0;
              currentPackage.stopPrice = totPrice !== null ? -totPrice : 0;
              currentPackage.stop = true;

              refundInvoices.push(currentPackage.subscription.invoice);
            }

            // TODO calculate minus price
          }
          // removing selected packageInfo if no action exists or total price is 0
          if (globalAction !== -1 && (globalAction === 1 ? body.day || body.month : true)) {
            if (currentPackage.totalPrice === 0) {
              if (!isPackageSubscribed && !isActionNormalForCalculation) {
                response.packageInfos = response.packageInfos.filter((r) => r !== _package._id.toString());
              }
            }
          }

          if (
            (location.subscriptionState === 0 || location.subscriptionState === 2) &&
            !isActionNormalForCalculation &&
            oldPackageInfos.filter((r) => r === _package._id.toString()).length
          ) {
            currentPackage.expired = true;
            currentPackage.expireDate = filteredLatest[0].endDate;
            if (filteredLatest[0].returnInvoice) {
              currentPackage.canceled = true;
            }
            response.packageInfos = oldPackageInfos;
          }
          // if (!isActionNormalForCalculation && (currentPackage.expired || !currentPackage || !isPackageSubscribed) && )
          // currentPackage.disabled =
          //   globalAction === -1 ||
          //   (globalAction === 1 &&
          //     (currentPackage.expired || !currentPackage || !isPackageSubscribed) &&
          //     !isActionNormalForCalculation);
          // if (currentPackage.totalPrice !== 0) {
          //   if (!isPackageSubscribed) {
          //     response.packageInfos = response.packageInfos.filter((r) => r !== _package._id.toString());
          //   }
          // }
          currentPackage.totalPrice = priceUtils.roundFloat(currentPackage.totalPrice);

          if (
            currentPackage.totalPrice === 0 &&
            isPackageSubscribed &&
            typeof currentPackage.recurringPayment !== 'undefined' &&
            currentPackage.recurringPayment !== currentPackage.subscription.recurringPayment
          ) {
            // eslint-disable-next-line no-await-in-loop
            await subscriptionRepository.updateSubscriptionById(currentPackage.subscription._id.toString(), {
              recurringPayment: currentPackage.recurringPayment,
            });
          }
          if (typeof currentPackage.recurringPayment === 'undefined') {
            currentPackage.recurringPayment = isPackageSubscribed ? currentPackage.subscription.recurringPayment : false;
          }

          delete currentPackage.subscription;
          delete currentPackage.package;
          // TODO check if has money here
          if (
            ((currentPackage.currentPrice > 0 && true) || currentPackage.expireDate) &&
            (currentPackage.parentHasNormalPrice || currentPackage.expireDate) &&
            !currentPackage.hide
          ) {
            response.totalPrice += currentPackage.totalPrice;

            if (!response.toParents) response.toParents = {};
            if (currentPackage.toParents) {
              for (const curKey of Object.keys(currentPackage.toParents)) {
                if (!response.toParents[curKey]) response.toParents[curKey] = currentPackage.toParents[curKey];
                else response.toParents[curKey].amount += currentPackage.toParents[curKey].amount;
              }
            }
            if (globalAction === 0 || globalAction === 4) {
              if (currentPackage.expireDate) {
                if (forEdit) {
                  response.packages.push(currentPackage);
                } else if (currentPackage.totalPrice !== 0) {
                  response.packages.push(currentPackage);
                }
              }
            } else if (forEdit) {
              response.packages.push(currentPackage);
            } else if (
              isActionNormalForCalculation &&
              (isPackageSelected || isPackageRemoved || currentPackage.totalPrice !== 0)
            ) {
              response.packages.push(currentPackage);
            }
          }
        }

        // if (!endTime) endTime = process.hrtime(startTime);
        // // Calculate the execution time in milliseconds
        // const executionTime = endTime[0] * 1000 + endTime[1] / 1e6;
        // logger.info(`Function execution time: ${executionTime} milliseconds`);
        // logger.info(`${_packages.length}`);

        totalResponse.price += response.totalPrice;

        if (!totalResponse.toParents) totalResponse.toParents = {};
        if (response.toParents) {
          for (const curKey of Object.keys(response.toParents)) {
            if (!totalResponse.toParents[curKey]) totalResponse.toParents[curKey] = response.toParents[curKey];
            else totalResponse.toParents[curKey].amount += response.toParents[curKey].amount;
          }
        }

        if (forEdit) {
          totalResponse.locations.push(response);
        } else if (response.totalPrice.totalPrice !== 0) {
          totalResponse.locations.push(response);
        }

        response.packages = response.packages.sort((a, b) => a.packageType - b.packageType);
      }
    }

    let equipmentTotal = 0;

    if (!endTime) endTime = process.hrtime(startTime);

    // eslint-disable-next-line prefer-const
    if (payload.equipments && payload.equipments.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const equipment of payload.equipments) {
        equipmentTotal += equipment.price;
        const equipmentId = equipment.equipment;
        // eslint-disable-next-line no-await-in-loop
        const dbEquipment = await equipmentRepository.getEquipmentById(equipmentId);
        if (!dbEquipment) {
          throw new Error('equipment not found');
        }
        equipment.equipment = dbEquipment.toJSON();
        totalResponse.equipment.equipments.push(equipment);
        totalResponse.equipment.equipmentInfos.push(equipment.equipment.id);
      }
    }
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i <= totalResponse.equipment.equipments.length - 1; i++) {
      const purchaseDate = new Date(totalResponse.equipment.equipments[i].createdAt);
      if (totalResponse.equipment.equipments[i].constructor.name === 'model') {
        totalResponse.equipment.equipments[i] = totalResponse.equipment.equipments[i].toJSON();
      }
      totalResponse.equipment.equipments[i].purchaseDate = purchaseDate;
    }
    totalResponse.equipment.totalPrice = priceUtils.roundFloat(equipmentTotal);

    if (payload.returnEquipments?.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const returnEquipment of payload.returnEquipments) {
        const foundList = totalResponse.equipment.equipments.filter((r) => r.id === returnEquipment.equipment);
        if (foundList.length) {
          const currentEquipmentOrder = foundList[0];
          if (currentEquipmentOrder.id && typeof currentEquipmentOrder.price !== 'undefined') {
            totalResponse.equipment.totalPrice -= currentEquipmentOrder.price;
          }
          currentEquipmentOrder.returnDate = new Date();
          // totalResponse.equipment.equipments = totalResponse.equipment.equipments.filter(
          //   (r) => r.id !== equipmentId
          // );
        }
      }
    }

    const equipmentFilter = {
      status: 1,
      count: { $gt: 0 },
    };
    if (config.global.equipment_per_provider) {
      equipmentFilter.provider = provider._id.toString();
    }
    totalResponse.price += totalResponse.equipment.totalPrice;
    totalResponse.totalPrice = totalResponse.price;
    let btnType;
    let btnText;
    if (totalResponse.totalPrice > 0) {
      btnType = 1;
    }
    if (totalResponse.totalPrice < 0) {
      btnType = 2;
    }
    if (totalResponse.totalPrice === 0) {
      btnType = 0;
    }
    let allowCheckout = isActionNormalForCalculation;
    switch (btnType) {
      case 0:
        btnText = '';
        totalResponse.refund = false;
        delete totalResponse.availablePaymentTypes.saved;
        delete totalResponse.availablePaymentTypes.card;
        delete totalResponse.availablePaymentTypes.bankTransfer;
        break;
      case 1:
        btnText = 'Checkout';
        totalResponse.refund = false;
        allowCheckout = true;
        if (!providerHasValidCardGateway || !savedPaymentMethods.length) delete totalResponse.availablePaymentTypes.saved;
        if (!providerHasValidCardGateway) delete totalResponse.availablePaymentTypes.card;
        if (!providerHasValidBankGateway) delete totalResponse.availablePaymentTypes.bankTransfer;
        break;
      case 2:
        btnText = 'Refund';
        totalResponse.refund = true;
        allowCheckout = true;
        // eslint-disable-next-line no-case-declarations
        const invoiceIds = refundInvoices.map((r) => r && r.id);
        // eslint-disable-next-line no-case-declarations
        const invoiceTransactions = await transactionRepository.getList({
          invoice: { $in: invoiceIds },
          state: 1,
          source_type: 'PAY_INVOICE',
          transaction_type: 'C_TO_A',
        });
        if (!invoiceTransactions.length) delete totalResponse.availablePaymentTypes.saved;
        else {
          totalResponse.availablePaymentTypes.saved = [];
          invoiceTransactions.forEach((trans) => {
            totalResponse.availablePaymentTypes.saved.push({
              amount: trans.totalAmount,
              sourcePay: trans.sourcePay,
            });
          });
        }
        delete totalResponse.availablePaymentTypes.card;
        delete totalResponse.availablePaymentTypes.bankTransfer;
        // delete totalResponse.availablePaymentTypes.check;
        delete totalResponse.availablePaymentTypes.moneyOrder;
        delete totalResponse.availablePaymentTypes.fastCredit;
        break;
      default:
        btnText = '';
        totalResponse.refund = false;
        delete totalResponse.availablePaymentTypes.saved;
        delete totalResponse.availablePaymentTypes.card;
        delete totalResponse.availablePaymentTypes.bankTransfer;
    }
    // if ((totalResponse.availablePaymentTypes.card || totalResponse.availablePaymentTypes.saved) && !forEdit) {
    //   totalResponse.bankFee = (totalResponse.price * bankFeePercent) / 100 + bankFeeFixed;
    //   totalResponse.totalPrice += totalResponse.bankFee;
    // }
    if (hasParent) {
      // allowCheckout = ottProvider.balance >= totalResponse.toResaleTotalPrice || btnType === 0;
    }
    totalResponse.btnText = btnText;
    totalResponse.allowCheckout = allowCheckout;
    return totalResponse;
  }
}

module.exports = SubscriptionService;
