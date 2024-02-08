/*
const { Reader } = require('@maxmind/geoip2-node');
const logger = require('../logger/logger');
const options = {
  // you can use options like `cache` or `watchForUpdates`
};

Reader.open('/opt/storage/GeoIP/GeoIP2-Country.mmdb', options).then((reader) => {
  console.log(JSON.stringify(reader.country('142.1.1.1'), undefined, 2));
  //logger.info(reader.country('142.1.1.1'));
});
*/

const { WebServiceClient } = require('@maxmind/geoip2-node');

const client = new WebServiceClient('134683', 'iot1Z25kLlyMhzAY');

client.insights('142.1.1.1').then((response) => {
  // eslint-disable-next-line no-unused-vars
  const geoIpInfo = {
    realIp: '',
    countryCode: response?.country?.isoCode || '',
    city: response?.city || '',
    domain: response?.traits?.domain || '',
    network: response?.traits?.network || '',
    isp: response?.traits?.isp || '',
    organization: response?.traits?.organization || '',
    location: 'in future',
    postalCode: 'in future',
  };
});
