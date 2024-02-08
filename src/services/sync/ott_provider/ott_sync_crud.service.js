const request = require('request');
const logger = require('../../../utils/logger/logger');
const AxiosService = require('../../shared/axios.service');
const config = require('../../../config/config');

const statistic = {
  locationWithoutProviderId: 0,
  locations: [],
  providers: [],
};

class OttSyncCrudService {
  static providerUrl() {
    return `https://iptv.ottstream.live/api_test/ottstream/providers`;
  }

  static constructProviderQuery(withDevices) {
    let query = `use_new_billing=1&`;
    if (withDevices) {
      query += `with_devices&`;
    }
    return `${OttSyncCrudService.providerUrl()}?${query}`;
  }

  static async getProviders() {
    if (statistic.providers && statistic.providers.length) {
      const currentDate = new Date();
      const secondsPass = (currentDate.getTime() - statistic.lastUpdate.getTime()) / 1000;
      if (secondsPass < config.sync.provider_pull_time) return statistic.providers;
      logger.warn(`ott sync service: provider remote list needs to pull again (old Data) seconds pass: ${secondsPass}`);
    }
    const url = OttSyncCrudService.constructProviderQuery(false);

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      request(url, { json: true }, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            logger.info(`ott sync service: new remote providers fetched`);
            statistic.providers = body.providers;
            statistic.lastUpdate = new Date();
          } else {
            logger.warn(`getProviders() statusCode: ${res.statusCode}`);
          }

          resolve(body.providers || []);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async deleteProvider(numericId) {
    const url = OttSyncCrudService.providerUrl();
    const body = {
      id: numericId,
    };

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .delete(url, body)
        .then((data) => {
          if (data.status === 200 && data.data?.message) {
            if (data.data.message !== 'OK') logger.warn(`deleteProvider() response is not OK`);
            resolve(data.data);
          } else {
            logger.warn(`deleteProvider() statusCode: ${data.status}`);
            resolve({});
          }
        })
        .catch((error) => {
          logger.warn(`deleteProvider() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }

  static async updateProvider(body) {
    const url = OttSyncCrudService.providerUrl();

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .put(url, body)
        .then((data) => {
          if (data.status === 200 && data.data?.affected_providers?.length) resolve(data.data?.affected_providers);
          else {
            logger.warn(`updateProvider() statusCode: ${data.status}`);
            resolve({});
          }
        })
        .catch((error) => {
          logger.warn(`updateProvider() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }

  static async createProvider(body) {
    const url = OttSyncCrudService.providerUrl();

    const axiosService = new AxiosService();

    return new Promise((resolve) => {
      return axiosService
        .post(url, body)
        .then((data) => {
          if (data.status === 200 && data.data) resolve(data.data);
          else {
            logger.warn(`createProvider() statusCode: ${data.status}`);
            resolve({});
          }
        })
        .catch((error) => {
          logger.warn(`createProvider() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
          resolve(null);
        });
    });
  }
}

module.exports = OttSyncCrudService;
