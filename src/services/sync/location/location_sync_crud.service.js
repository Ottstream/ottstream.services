const request = require('request');
const logger = require('../../../utils/logger/logger');
const AxiosService = require('../../shared/axios.service');
const config = require('../../../config/config');

const statistic = {
  locationWithoutProviderId: 0,
  locations: [],
  providers: [],
  lastUpdate: new Date('1970-01-01'),
};

class LocationSyncCrudService {
  static providerUrl() {
    return `https://iptv.ottstream.live/api_test/ottstream/locations`;
  }

  static constructProviderQuery(withDevices, withCdn, login) {
    // let query = ``;
    let query = `use_new_billing=1&`;
    if (withDevices) {
      query += `with_devices&`;
    }
    if (login) {
      query += `with_cdn_sessions&login=${login}`;
    }
    return `${LocationSyncCrudService.providerUrl()}?${query}`;
  }

  static constructCdnQuery(login, roomN) {
    return `https://iptv.ottstream.live/api_test/ottstream/cdn_sessions?login=${login}&room_n=${roomN}`;
  }

  static async getLocation(login, with_cdn_sessions = false) {
    await LocationSyncCrudService.resetCache(); // reset cache before single update not to update back wrong
    const url = LocationSyncCrudService.constructProviderQuery(true, with_cdn_sessions, login);

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      request(url, { json: true }, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            logger.info(`middleware: getLocation ${login} success..`);
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

  static async getCdnSessions(login, roomN) {
    const url = LocationSyncCrudService.constructCdnQuery(login, roomN);

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      request(url, { json: true }, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            logger.info(`middleware: getLocation ${login} success..`);
          } else {
            logger.warn(`getLocations() statusCode: ${res.statusCode}`);
          }

          resolve(body || {});
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async resetCache() {
    logger.info(`cleaning lcations cache...done`);
    statistic.lastUpdate = new Date('1970-01-01');
  }

  static async getLocations() {
    if (statistic.locations && statistic.locations.length) {
      const currentDate = new Date();
      const secondsPass = (currentDate.getTime() - statistic.lastUpdate.getTime()) / 1000;
      if (secondsPass < config.sync.locations_pull_time) return statistic.locations;
      logger.warn(`location sync service: location remote list needs to pull again (old Data) seconds pass: ${secondsPass}`);
    }
    const url = LocationSyncCrudService.constructProviderQuery(true, false);

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
            logger.info(`middleware: getLocations success`);
          } else {
            logger.warn(`middleware: getLocations statusCode: ${res.statusCode}`);
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
    const url = LocationSyncCrudService.providerUrl();
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
    const url = LocationSyncCrudService.providerUrl();

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
    const url = LocationSyncCrudService.providerUrl();

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
    const url = LocationSyncCrudService.providerUrl();

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
            // TODO return error message
            logger.warn(`createLocation() failed statusCode: ${error.response?.status} ${error.response?.statusText}`);
            resolve(null);
          }
        });
    });
  }
}

module.exports = LocationSyncCrudService;
