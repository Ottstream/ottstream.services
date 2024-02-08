const axios = require('axios');
const logger = require('../../utils/logger/logger');
const config = require('../../config/config');

class StreetService {
  static async isValidKey(key) {
    const response = {
      status: false,
      message: '',
      list: [],
    };

    try {
      const url = 'https://us-zipcode.api.smarty.com/lookup';

      const referer = config.smartStreet.front_url;

      await axios({
        method: 'get',
        url,
        params: {
          key,
        },
        headers: {
          Referer: referer,
        },
      });
      response.status = true;
    } catch (ex) {
      logger.info(config.smartStreet.front_url);
      logger.info(key);
      logger.error(ex);
      logger.error(ex.response.data.errors[0].message);
      if (ex.response.status !== 401) {
        response.status = true;
      }
    }
    // Inspect the response to determine if the key is valid. The exact condition can depend on the API's response structure.
    // if (axiosResponse.data && axiosResponse.data.success) {
    //   response.status = true;
    //   response.message = 'key is valid';
    // }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async validateClientAddress(addressInfo, key) {
    const response = {
      status: true,
      validationMessages: [],
      messages: [],
      isValid: false,
    };
    const baseUrl = `https://us-street.api.smarty.com/street-address?auth-id=${key.authId}&auth-token=${key.authToken}&license=${key.license}`;
    response.oldAddress = {
      address: addressInfo.address,
      city: addressInfo.city,
      province: addressInfo.province,
      suite: addressInfo.suite,
      zip: addressInfo.zip,
      lat: addressInfo.lat,
      long: addressInfo.long,
      delivery_line_1: `${addressInfo.address} ${addressInfo.suite}`,
    };
    const sendData = [
      {
        candidates: 10,
        street: addressInfo.address,
        city: addressInfo.city,
        state: addressInfo.province,
        secondary: addressInfo.suite,
        zipcode: addressInfo.zip,
        match: 'enhanced',
      },
    ];
    try {
      const res = await axios.post(`${baseUrl}`, sendData, {
        headers: {
          'content-type': 'application/json',
        },
      });

      if (res.data.length) {
        const current = res.data[0];
        const { analysis, components } = current;
        const enhancedMatch = analysis.enhanced_match;
        const enhancedComponents = enhancedMatch.split(',');
        if (enhancedComponents.filter((r) => r === 'postal-match').length) {
          response.isValid = true;
          // response.validationMessages = enhancedComponents.filter((r) => r !== 'postal-match').map((r) => `error: ${r}`);
          response.newAddress = {
            city: components.city_name,
            province: components.state_abbreviation,
            zip: components.zipcode,
            lat: current.metadata.latitude,
            long: current.metadata.longitude,
            delivery_line_1: current.delivery_line_1,
          };
          if (components.plus4_code) {
            response.newAddress.zip = `${components.zipcode}-${components.plus4_code}`;
          }

          if (response.newAddress.zip !== addressInfo.zip) {
            response.isValid = false;
            response.validationMessages.push(`incorrect zip address`);
          }

          if (response.newAddress.city !== addressInfo.city) {
            response.isValid = false;
            response.validationMessages.push(`incorrect city`);
          }

          if (typeof components.secondary_designator !== 'undefined' && typeof components.secondary_number !== 'undefined') {
            response.newAddress.suite = `${components.secondary_designator} ${components.secondary_number}`;

            if (
              enhancedComponents.filter((r) => r === 'unknown-secondary').length &&
              enhancedComponents.filter((r) => r === 'ignored-input').length
            ) {
              response.newAddress.suite = '';
            }
          }
          response.newAddress.address = '';
          if (components.primary_number) response.newAddress.address += `${components.primary_number}`;
          if (components.street_predirection) response.newAddress.address += ` ${components.street_predirection}`;
          if (components.street_name) response.newAddress.address += ` ${components.street_name}`;
          if (components.street_suffix) response.newAddress.address += ` ${components.street_suffix}`;
          if (components.street_postdirection) response.newAddress.address += ` ${components.street_postdirection}`;

          response.newAddress.address = response.newAddress.address.replace(/\s+/g, ' ');
          const compareAddress = addressInfo.address.replace(/\s+/g, ' ');
          if (response.newAddress.address !== compareAddress) {
            response.isValid = false;
            response.validationMessages.push(`incorrect address`);
          }
          if (typeof response.newAddress.suite !== 'undefined' && response.newAddress.suite !== addressInfo.suite) {
            response.isValid = false;
            response.validationMessages.push(`incorrect suite`);
          }
        } else {
          response.isValid = false;
          response.validationMessages.push(`no matching address found on smartstreets`);
        }
      } else {
        response.isValid = false;
        response.validationMessages.push(`no matching address found on smartstreets`);
      }
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data);
    }

    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async getMapImage(info, _conf = {}, cred) {
    const response = {
      status: true,
      message: '',
      image: null,
    };
    // Replace 'YOUR_API_KEY' with your actual Google Maps API key
    const apiKey = cred.key;
    const size = '600x300'; // width x height
    // const newHeading = (heading + 90) % 360;
    const pitch = '-0.76'; // Up or down angle of the camera
    const fov = '180'; // Field of view

    const encodedAddress = encodeURIComponent(info.address);

    const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&latitude=${info.lat}&longitude=${info.long}&location=${encodedAddress}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;

    try {
      const res = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer',
      });

      // const savePath = `${config.file.file_storage_path}./map_image_${info.lat}_${info.long}.jpg`;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      // await fs.writeFile(savePath, res.data);
      const base64 = Buffer.from(res.data).toString('base64');
      response.image = base64;
    } catch (ex) {
      logger.error(ex);
      response.status = false;
      response.message = ex;
    }
    return response;
  }
}

module.exports = StreetService;
