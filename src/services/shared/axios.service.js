const axios = require('axios');
const logger = require('../../utils/logger/logger');

class AxiosService {
  // constructor() {
  //   logger.info(`AxiosService() initiated`);
  // }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  post(url, data, headers = {}) {
    const config = {
      headers,
    };
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      axios
        .post(url, data, config)
        .then(function (response) {
          resolve(response);
        })
        .catch(function (error) {
          logger.error(error);
          reject(error);
        });
    });
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  put(url, data, headers = {}) {
    const config = {
      headers,
    };
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      axios
        .put(url, data, config)
        .then(function (response) {
          resolve(response);
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  delete(url, data = {}, headers = {}) {
    const config = {
      headers,
    };
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      axios
        .delete(url, { ...config, data })
        .then(function (response) {
          resolve(response);
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  read(url, headers = {}) {
    const config = {
      headers,
    };
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      axios
        .get(url, config)
        .then(function (response) {
          resolve(response);
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }
}
module.exports = AxiosService;
