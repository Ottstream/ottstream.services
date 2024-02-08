const request = require('request');
const logger = require('../../../../utils/logger/logger');
const AxiosService = require('../../../shared/axios.service');
const config = require('../../../../config/config');

const statistic = {
  locationWithoutProviderId: 0,
  locations: [],
  providers: [],
};

class LocationUsedDeviceSyncCrudService {
  static providerUrl() {
    return `https://iptv.ottstream.live/api_test/ottstream/locations`;
  }

  static constructProviderQuery(withDevices) {
    let query = `use_new_billing=1&`;
    if (withDevices) {
      query += `with_devices&`;
      query += `with_cdn_sessions&`;
    }
    return `${LocationUsedDeviceSyncCrudService.providerUrl()}?${query}`;
  }

  static async getLocations() {
    if (statistic.locations && statistic.locations.length) {
      const currentDate = new Date();
      const secondsPass = (currentDate.getTime() - statistic.lastUpdate.getTime()) / 1000;
      if (secondsPass < config.sync.locations_pull_time) return statistic.locations;
      logger.warn(`location sync service: location remote list needs to pull again (old Data) seconds pass: ${secondsPass}`);
    }
    const url = LocationUsedDeviceSyncCrudService.constructProviderQuery(true);

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      request(url, { json: true }, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            statistic.locations = body.locations;
            statistic.lastUpdate = new Date();
          } else {
            logger.warn(`getLocations() statusCode: ${res.statusCode}`);
          }

          resolve(body.locations || []);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static resetLocations() {
    statistic.locations = [];
  }

  static async deleteLocation(login) {
    const url = LocationUsedDeviceSyncCrudService.providerUrl();
    const body = {
      login,
    };

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .delete(url, body)
        .then((data) => {
          if (data.status === 200 && data.data?.message) {
            if (data.data.message !== 'OK') logger.warn(`deleteLocation() response is not OK`);
            resolve(data.data);
          } else {
            logger.warn(`deleteLocation() statusCode: ${data.status}`);
            resolve({});
          }
        })
        .catch((error) => {
          logger.warn(`deleteLocation() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }

  static async updateLocation(body) {
    const url = LocationUsedDeviceSyncCrudService.providerUrl();

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .put(url, body)
        .then((data) => {
          if (data.status === 200 && data.data?.affected_locations?.length) resolve(data.data?.affected_locations);
          else {
            logger.warn(`updateLocation() statusCode: ${data.status}`);
            resolve([]);
          }
        })
        .catch((error) => {
          logger.warn(`updateLocation() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }

  static async updateUsedDevice(body) {
    const url = LocationUsedDeviceSyncCrudService.providerUrl();

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .put(url, body)
        .then((data) => {
          if (data.status === 200 && data.data?.affected_locations?.length) resolve(data.data?.affected_locations);
          else {
            logger.warn(`updateLocation() statusCode: ${data.status}`);
            resolve([]);
          }
        })
        .catch((error) => {
          logger.warn(`updateLocation() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }

  static async createLocation(body) {
    const url = LocationUsedDeviceSyncCrudService.providerUrl();

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .post(url, body)
        .then((data) => {
          if (data.status === 200 && data.data) resolve(data.data);
          else {
            logger.warn(`createLocation() statusCode: ${data.status}`);
            resolve({});
          }
        })
        .catch((error) => {
          if (error.response?.status === 409) {
            logger.warn(`conflicting login detected ${body.login}`);
            resolve({ login: body.login, conflict: true });
          } else {
            logger.warn(`createLocation() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
            resolve(null);
          }
        });
    });
  }
}

module.exports = LocationUsedDeviceSyncCrudService;
