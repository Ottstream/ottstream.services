const queue = require('queue');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../../utils/logger/logger');

const {
  ottProviderRepository,
  priceGroupRepository,
  clientLocationRepository,
  packageRepository,
  subscriptionRepository,
  commentRepository,
  userRepository,
  ottProviderEmailRepository,
  ottProviderPhoneRepository,
  clientRepository,
  generateRandomNumber,
} = repositories;
const AxiosService = require('../../shared/axios.service');
// const userRepository = require('../../../repository/user/user.repository');
const TimezoneService = require('../../shared/timezone.service');
// const ottProviderEmailRepository = require('../../../repository/ottprovider/ottprovider_email.repository');
// const ottProviderPhoneRepository = require('../../../repository/ottprovider/ottprovider_phone.repository');
// const clientRepository = require('../../../repository/client/client.repository');
const config = require('../../../config/config');
// const { generateRandomNumber } = require('../../../repository/client/client_location.repository');

const q = queue({ results: [], autostart: true, timeout: 0, concurrency: 1 });

q.on('timeout', function (next, job) {
  logger.warn('task timed out:', job.toString().replace(/\n/g, ''));
  next();
});

// get notified when jobs complete
q.on('success', function (result, job) {
  logger.info('live sync task finished processing:', job.toString().replace(/\n/g, ''));
  // logger.info('The result is:', result);
});

// TODO smarter sync not to delete all, just update and keep numeric ids
class LiveSyncService {
  static async savePriceGroup(incomingPriceGroup, providerId) {
    const finalResponse = {
      status: true,
      messages: [],
    };
    const createdPriceGroup = await priceGroupRepository.createPriceGroup({
      type: 2,
      name: [{ lang: 'en', name: incomingPriceGroup.name }],
      provider: providerId,
      middlewareId: incomingPriceGroup.priceGroupId,
      providerMiddlewareId: incomingPriceGroup.providerMiddlewareId,
      migrated: true,
    });
    if (!createdPriceGroup) {
      finalResponse.status = false;
      finalResponse.messages.push(`savePriceGroup() unable to create user`);
      return finalResponse;
    }

    if (createdPriceGroup.providerMiddlewareId) {
      await ottProviderRepository.updateAll(
        { middlewareId: parseInt(createdPriceGroup.providerMiddlewareId, 10) },
        { priceGroup: createdPriceGroup._id }
      );
    }
    return finalResponse;
  }

  static async saveOttProvider(incomingProvider, providerId, existingClients, existingLocations) {
    const existingPackages = await packageRepository.getList({ migrated: true });
    const existingProviders = await ottProviderRepository.getList({ migrated: true });
    const existingUsers = await userRepository.getList({ migrated: true });
    const finalResponse = {
      status: true,
      messages: [],
    };
    if (!incomingProvider) {
      finalResponse.status = false;
      finalResponse.messages.push(`saveOttProvider(incomingProvider, user, providerId) ott provider is null`);
      return finalResponse;
    }

    if (!incomingProvider.users.length) {
      finalResponse.status = false;
      finalResponse.messages.push(`saveOttProvider(incomingProvider, user, providerId) provider have no users`);
      return finalResponse;
    }

    // find ott
    const exisitingsFound = existingProviders.filter(
      (r) =>
        r.syncIdentifier && r.syncIdentifier !== '' && r.syncIdentifier === incomingProvider.syncIdentifier && r.status === 1
    );
    let createdProvider = exisitingsFound.length ? exisitingsFound[0] : null;
    // save users
    const createdUsers = [];
    if (createdProvider) {
      // find user
      const exisitingsUserFound = existingUsers.filter((r) => r.provider.toString() === createdProvider._id.toString());
      if (exisitingsUserFound.length) {
        createdUsers.push(exisitingsUserFound[0]);
      } else {
        logger.error(`provider user not found ${createdProvider._id}`);
      }
    }
    if (!createdProvider || !createdUsers.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const incomingUser of incomingProvider.users) {
        if (!incomingUser.email || incomingUser.email === '') {
          incomingUser.email = `no_user_email_${generateRandomNumber()}@ottstream.live`;
        }
        // find user
        const exisitingUserFound = existingUsers.filter((r) => r.email === incomingUser.email && r.status === 1);
        if (exisitingUserFound.length) {
          if (createdProvider) {
            // eslint-disable-next-line no-await-in-loop
            const updatedUser = await userRepository.updateUserById(exisitingUserFound[0]._id, {
              provider: createdProvider._id,
            });
            createdUsers.push(updatedUser);
          } else {
            createdUsers.push(exisitingUserFound[0]);
          }
        } else {
          const userBody = {
            email: incomingUser.email,
            password: 'asdASD#2!',
            timezone: TimezoneService.GetTimeZoneFromWindowsName(incomingUser.timezone) ?? '',
            firstname: incomingUser.firstname,
            lastname: incomingUser.lastname,
            phone: incomingUser.phone,
            migrated: true,
            state: 1,
            geoInfo: {},
          };
          if (createdProvider) {
            userBody.provider = createdProvider._id.toString();
          }
          // eslint-disable-next-line no-await-in-loop
          const newUser = await userRepository.createUser(userBody);
          if (!newUser) {
            finalResponse.status = false;
            finalResponse.messages.push(`saveOttProvider(incomingProvider, user, providerId) unable to create user`);
            return finalResponse;
          }
          createdUsers.push(newUser);
        }
      }
    }

    const { subProviders } = incomingProvider;
    if (!createdProvider) {
      createdProvider = await ottProviderRepository.createOttProvider(
        {
          // email: incomingProvider.emails.length ? incomingProvider.emails[0] : null, // todo save all emails not 1
          name: incomingProvider.name,
          // phone: incomingProvider.phones.length ? incomingProvider.phones[0] : null,
          website: incomingProvider.website,
          balance: incomingProvider.balance,
          timezone: TimezoneService.GetTimeZoneFromWindowsName(incomingProvider.timezone) ?? '',
          comment: incomingProvider.comment,
          clientAmount: incomingProvider.clientAmount,
          channelAmount: incomingProvider.channelAmount,
          description: incomingProvider.description,
          migrated: true,
          syncIdentifier: incomingProvider.syncIdentifier,
          parent: providerId,
          middlewareId: incomingProvider.middlewareId,
          migrationFails: [],
          type: 1,
          state: incomingProvider.state,
        },
        createdUsers[0]
      );
    }
    if (!createdProvider) {
      finalResponse.status = false;
      finalResponse.messages.push(`saveOttProvider(incomingProvider, user, providerId) unable to create ott provider`);
      return finalResponse;
    }

    // eslint-disable-next-line no-restricted-syntax
    if (!exisitingsFound.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const currentEmail of incomingProvider.emails) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await ottProviderEmailRepository.createOttProviderEmail({
            providerId: createdProvider._id,
            inUse: true,
            isMain: true,
            address: currentEmail.address,
          });
        } catch (ex) {
          createdProvider.migrationFails.push({
            type: 'email',
            value: currentEmail.address,
            message: ex.message,
          });
        }
      }
    }
    // eslint-disable-next-line no-restricted-syntax
    if (!exisitingsFound.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const currentPhone of incomingProvider.phones) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await ottProviderPhoneRepository.createOttProviderPhone({
            providerId: createdProvider._id,
            inUse: true,
            isMain: true,
            number: currentPhone.number,
          });
        } catch (ex) {
          createdProvider.migrationFails.push({
            type: 'phone',
            value: currentPhone.number,
            message: ex.message,
          });
        }
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const client of incomingProvider.clients) {
      const clientBody = { ...client };
      clientBody.user = createdUsers[0]._id;
      clientBody.provider = createdProvider._id;
      clientBody.balance = client.balance;
      clientBody.migrated = true;
      clientBody.subscriptionState = 0;
      if (clientBody.locations.filter((r) => r.subscriptions.length).length) {
        clientBody.subscriptionState = 1;
        if (
          clientBody.locations.filter((r) => r.subscriptions.length && r.subscriptions.filter((a) => a.isActive).length)
            .length
        )
          clientBody.subscriptionState = 3;
      }
      delete clientBody.locations;
      delete clientBody.comments;
      try {
        let newClient = null;
        const existingClientsList = existingClients.filter(
          (r) => clientBody.middlewareId === r.middlewareId && r.provider.toString() === createdProvider._id.toString()
        );
        if (existingClientsList.length) {
          if (existingClientsList.length !== 1)
            logger.error(`live sync: existing clients more than 1: client: ${existingClientsList[0]._id.toString()}`);
          // eslint-disable-next-line prefer-destructuring
          newClient = existingClientsList[0];
          // eslint-disable-next-line no-await-in-loop
          await clientRepository.updateClientById(newClient._id.toString(), {
            balance: clientBody.balance,
            subscriptionState: clientBody.subscriptionState,
          });
        } else {
          // eslint-disable-next-line no-await-in-loop
          newClient = await clientRepository.createClient(clientBody);
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const incomingComment of client.comments) {
          try {
            incomingComment.user = createdUsers[0]._id;
            incomingComment.migrated = true;
            incomingComment.client = newClient._id.toString();
            // eslint-disable-next-line no-await-in-loop
            await commentRepository.createComment(incomingComment, createdUsers[0]);
          } catch (ex) {
            logger.error(ex);
          }
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const incomingLocation of client.locations) {
          try {
            const saveLocation = { ...incomingLocation };
            saveLocation.provider = createdProvider._id;
            saveLocation.user = createdUsers[0]._id;
            saveLocation.migrated = true;
            saveLocation.clientId = newClient._id.toString();
            saveLocation.syncState = 2;
            saveLocation.isBlockLocation = false;
            saveLocation.autostartStatus = 0;
            saveLocation.subscriptionState = 0;
            if (saveLocation.subscriptions && saveLocation.subscriptions.length) {
              if (saveLocation.subscriptions.filter((a) => a.isActive).length) saveLocation.subscriptionState = 3;
              else saveLocation.subscriptionState = 1;
            }
            if (saveLocation.subscriptionState === 3) {
              saveLocation.startDate = incomingLocation.subscriptions[0].startDate;
              saveLocation.endDate = incomingLocation.subscriptions[0].endDate;
            }
            delete saveLocation.subscriptions;
            let newLocation = null;
            const existingLocationsList = existingLocations.filter(
              // eslint-disable-next-line no-loop-func
              (r) => saveLocation.middlewareId === r.middlewareId && r.clientId.toString() === newClient._id.toString()
            );
            if (existingLocationsList.length) {
              if (existingLocationsList.length !== 1)
                logger.error(`live sync: existing location more than 1: client: ${existingLocationsList[0]._id.toString()}`);
              // eslint-disable-next-line prefer-destructuring
              newLocation = existingLocationsList[0];
              // eslint-disable-next-line no-await-in-loop
              await clientLocationRepository.updateClientLocationById(newLocation._id.toString(), {
                subscriptionState: saveLocation.subscriptionState,
                syncState: saveLocation.syncState,
                settingsUpdateUts: 0,
              });
            } else {
              // eslint-disable-next-line no-await-in-loop
              newLocation = await clientLocationRepository.createClientLocation(saveLocation, {}, {});
            }
            // eslint-disable-next-line no-await-in-loop,no-unused-vars
            let basePlusPlusAdded = false;
            const changeChannels = [0, 8, 12, 29, 31];
            // eslint-disable-next-line no-restricted-syntax
            for (const incomingSubscription of incomingLocation.subscriptions) {
              try {
                incomingSubscription.provider = createdProvider._id;
                incomingSubscription.user = createdUsers[0]._id;
                incomingSubscription.migrated = true;
                incomingSubscription.state = 1;
                incomingSubscription.recurringPayment = saveLocation.recurringPayment;
                incomingSubscription.client = newClient._id.toString();
                // eslint-disable-next-line no-use-before-define
                incomingSubscription.location = newLocation._id.toString();
                if (changeChannels.includes(incomingSubscription.packageMiddlewareId)) {
                  incomingSubscription.packageMiddlewareId = 28; // base++ id
                }
                // eslint-disable-next-line no-empty
                if (incomingSubscription.packageMiddlewareId !== 28 || !basePlusPlusAdded) {
                  const findPackages = existingPackages.filter(
                    (r) => r.middlewareId === incomingSubscription.packageMiddlewareId
                  );
                  if (findPackages.length) {
                    incomingSubscription.package = findPackages[0]._id.toString();
                  }
                  // eslint-disable-next-line no-await-in-loop
                  await subscriptionRepository.createSubscription(incomingSubscription);
                  if (incomingSubscription.packageMiddlewareId === 28) {
                    basePlusPlusAdded = true;
                  }
                }
              } catch (ex) {
                logger.error(ex);
              }
            }
          } catch (ex) {
            logger.error(ex);
          }
        }
      } catch (exc) {
        logger.error(exc);
      }
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const subProvider of subProviders) {
      // eslint-disable-next-line no-await-in-loop
      const curResp = await LiveSyncService.saveOttProvider(
        subProvider,
        createdProvider._id.toString(),
        existingClients,
        existingLocations
      );
      if (!curResp.status) {
        finalResponse.status = !curResp.status;
        finalResponse.messages = finalResponse.messages.concat(curResp.messages);
      }
    }
    return finalResponse;
  }

  static async syncLive(user) {
    const func = async (cb) => {
      try {
        const response = {
          status: false,
          messages: [],
        };
        const axiosService = new AxiosService();
        const axiosResponse = await axiosService.read(config.sync.live_url);
        const incomingResponse = axiosResponse.data;
        const incomingProviders = incomingResponse.ottProviders;
        // const incomingPriceGroups = incomingResponse.priceGroups;
        response.data = incomingResponse;
        const migratedProviders = await ottProviderRepository.getOttProviders({ migrated: true });
        const existingUsers = await userRepository.getAllUsers({ migrated: true });
        const existingClients = await clientRepository.getAll({ migrated: true });
        const existingLocations = await clientLocationRepository.getAll({ migrated: true });
        const existingPriceGroups = await priceGroupRepository.getList({ migrated: true });
        const existingSubsciptions = await subscriptionRepository.getList({ migrated: true });
        const baseProviderId = user.provider._id.toString();

        // const mainProvider = await ottProviderRepository.getBaseOttProvider();
        // const mainProviderId = mainProvider._id.toString();
        // const incomingProvidersHierarchy = [];

        // eslint-disable-next-line no-unreachable
        logger.info(`incoming providers count: ${incomingProviders.length}`);
        logger.info(`removing existing providers count: ${migratedProviders.length}`);
        logger.info(`removing existing users count: ${existingUsers.length}`);
        logger.info(`removing existing clients count: ${existingClients.length}`);
        logger.info(`removing existing locations count: ${existingLocations.length}`);
        logger.info(`removing existing price groups: ${existingPriceGroups.length}`);
        logger.info(`removing existing subscriptions groups: ${existingSubsciptions.length}`);

        // remove all ottProviders
        // eslint-disable-next-line no-unused-vars,no-restricted-syntax
        for (const existingProvider of migratedProviders) {
          // eslint-disable-next-line no-await-in-loop
          // const ottId = existingProvider._id.toString();
          // // eslint-disable-next-line no-await-in-loop
          // await ottProviderRepository.deleteOttProviderById(ottId);
          // // eslint-disable-next-line no-await-in-loop
          // await ottProviderEmailRepository.removeOttEmails(ottId);
          // // eslint-disable-next-line no-await-in-loop
          // await ottProviderPhoneRepository.removeOttPhones(ottId);
          // // eslint-disable-next-line no-await-in-loop
          // await priceGroupRepository.removePriceGroups(ottId);
        }

        // eslint-disable-next-line no-restricted-syntax
        // for (const existingUser of existingUsers) {
        //   if (!existingUser.provider || existingUser.provider.toString() !== baseProviderId) {
        //     // eslint-disable-next-line no-await-in-loop
        //     await userRepository.deleteUserById(existingUser._id.toString());
        //   }
        // }

        // remove users and clients
        // await clientRepository.deleteMany({ migrated: true });
        // await clientLocationRepository.deleteMany({ migrated: true });
        await subscriptionRepository.deleteMany({ migrated: true });
        await commentRepository.deleteMany({ migrated: true });

        // eslint-disable-next-line no-unused-vars,no-restricted-syntax
        for (const incomingProvider of incomingProviders) {
          // eslint-disable-next-line no-await-in-loop
          await LiveSyncService.saveOttProvider(incomingProvider, baseProviderId, existingClients, existingLocations);
        }
        // eslint-disable-next-line no-unused-vars,no-restricted-syntax
        // for (const incomingProvider of incomingPriceGroups) {
        //   // eslint-disable-next-line no-await-in-loop
        //   await LiveSyncService.savePriceGroup(incomingProvider, baseProviderId);
        // }
        logger.info(axiosResponse, false);
        cb(null, response);
      } catch (ex) {
        logger.error(ex);
      }
    };
    if (q.length) {
      logger.warn(`live sync task is already running...`);
      return {
        success: true,
        message: `live sync task is already running...`,
      };
    }
    q.push(func);
    return {
      success: true,
      message: `live sync task started...`,
    };
  }
}

module.exports = LiveSyncService;
