const { WebServiceClient } = require('@maxmind/geoip2-node');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const { geoipRepository } = repositories;

class GeoIpService {
  static getIp(req) {
    let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
    // eslint-disable-next-line no-const-assign
    // ip = '45.146.38.206';
    ip = ip.toString().replace('::ffff:', '');
    if (ip === '::1' || ip === '127.0.0.1') {
      req.geoIpInfo = {
        realIp: '127.0.0.1',
        countryCode: 'Local',
        country: 'Local',
        city: 'Local',
        timezone: 'Local',
      };
    }
    ip = '127.0.0.1';
    return ip;
  }

  static async look(ip) {
    const credentials = { login: '134683', pass: 'iot1Z25kLlyMhzAY' };
    return new Promise((resolve) => {
      const client = new WebServiceClient(credentials.login, credentials.pass);
      if (ip === '127.0.0.1') {
        resolve({
          realIp: ip,
        });
      } else {
        geoipRepository.getGeoipByIp(ip).then((geoip) => {
          if (geoip) {
            resolve(geoip.geoIpInfo);
          } else {
            client
              .insights(ip)
              .then((response) => {
                const geoIpInfo = {
                  realIp: ip,
                  countryCode: response?.country?.isoCode || '',
                  country: response?.country || '',
                  city: response?.city || '',
                  domain: response?.traits?.domain || '',
                  network: response?.traits?.network || '',
                  isp: response?.traits?.isp || '',
                  organization: response?.traits?.organization || '',
                  location: response?.location || '',
                  timezone: response?.location.timeZone || '',
                  postalCode: 'in future',
                };
                geoipRepository.createGeoip({ ip, geoIpInfo }).then((created) => {
                  resolve(created.geoIpInfo);
                });
              })
              .catch((err) => {
                logger.error(err);
                resolve({
                  realIp: ip,
                });
              });
          }
        });
      }
    });
  }
}

module.exports = GeoIpService;
