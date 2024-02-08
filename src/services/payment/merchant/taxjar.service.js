const Taxjar = require('taxjar');
const config = require('../../../config/config');
const logger = require('../../../utils/logger/logger');

class TaxjarService {
  constructor() {
    logger.info(`TaxjarService() initiated`);

    this.taxJarClient = new Taxjar({
      apiKey: config.taxJar.token,
    });
  }

  async getCategories() {
    return new Promise((resolve, reject) => {
      this.taxJarClient
        .categories()
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async validateAddress(country, state, zip, city, street) {
    return new Promise((resolve, reject) => {
      this.taxJarClient
        .validateAddress({
          country,
          state,
          zip,
          city,
          street,
        })
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

module.exports = TaxjarService;
