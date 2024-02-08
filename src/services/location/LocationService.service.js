const { repositories } = require('ottstream.dataaccess');

// const clientLocationRepository = require('../../repository/client/client_location.repository');
const { subscriptionRepository, clientLocationRepository } = repositories;
const SubscriptionService = require('../subscription/subscription.service');

class LocationService {
  static async UpdateLocationPause(locationId, pauseState) {
    const clientLocation = await clientLocationRepository.getClientLocationById(locationId);

    if (clientLocation && clientLocation.isPauseSubscriptions !== pauseState) {
      const updatedLocation = await clientLocationRepository.pauseClientLocationById(locationId, pauseState);
      const isPausing = updatedLocation.isPauseSubscriptions;
      if (isPausing) {
        const startDate = new Date();
        clientLocation.pauses.push({
          startDate,
          endDate: null,
        });
        await clientLocationRepository.updateClientLocationById(clientLocation._id.toString(), clientLocation);
      } else if (clientLocation.pauses.length) {
        clientLocation.pauses[clientLocation.pauses.length - 1].endDate = new Date();
        const lastPause = clientLocation.pauses[clientLocation.pauses.length - 1];
        const diffInTime = lastPause.endDate.getTime() - lastPause.startDate.getTime();
        const locationSubscriptions = await subscriptionRepository.getLocationSubscriptions(clientLocation._id.toString());
        if (locationSubscriptions) clientLocation.subscriptionState = 1;
        // eslint-disable-next-line no-restricted-syntax
        for (const subscription of locationSubscriptions) {
          subscription.endDate = new Date(subscription.endDate.getTime() + diffInTime);
          // eslint-disable-next-line no-await-in-loop
          await subscriptionRepository.updateSubscriptionById(subscription._id.toString(), {
            endDate: subscription.endDate,
          });
        }
        // eslint-disable-next-line no-await-in-loop
        await clientLocationRepository.updateClientLocationById(clientLocation._id.toString(), clientLocation);
      }

      // eslint-disable-next-line no-await-in-loop
      await SubscriptionService.updateSubscriptionStates(
        clientLocation.clientId?._id ? clientLocation.clientId.toString() : clientLocation.clientId
      );
    }
    return clientLocation;
  }
}

module.exports = LocationService;
