const { repositories } = require('ottstream.dataaccess');
const logger = require('../../../utils/logger/logger');
const AxiosService = require('../../shared/axios.service');

const { ottProviderShippingProviderRepository } = repositories;

class EasyshipService {
  constructor() {
    logger.info(`EasyshipService() initiated`);
  }

  // eslint-disable-next-line class-methods-use-this
  async shipmentOptions(method, token, body) {
    return {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    };
  }

  static async getTokenByProvider(providerId) {
    let token = '';
    const items = await ottProviderShippingProviderRepository.getOttProviderShippingProviderByProviderId(providerId);
    if (items?.length && items[0].easyship?.productionToken) {
      token = items?.length && items[0].easyship?.productionToken;
    }
    return token;
  }

  // eslint-disable-next-line no-empty-function,class-methods-use-this
  async sendShipment() {
    // const axiosService = new AxiosService();
    // const res = axiosService.post(url);
    // const response = await fetch(url, body);
    // return response.json();
  }

  static async rates(reqBody, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const ratesUrl = 'https://api.easyship.com/v2/rates';
    const axiosService = new AxiosService();
    const res = await axiosService.post(ratesUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async createShipment(reqBody, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const createUrl = 'https://api.easyship.com/v2/shipments';
    const axiosService = new AxiosService();
    const res = await axiosService.post(createUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async cancelShipment(shipmentId, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const createUrl = `https://api.easyship.com/2023-01/shipments/${shipmentId}/cancel`;
    const axiosService = new AxiosService();
    const res = await axiosService.post(
      createUrl,
      {},
      {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // eslint-disable-next-line camelcase
        Authorization: `Bearer ${sand_token}`,
      }
    );

    return res;
  }

  static async getRates(reqBody, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const createUrl = `https://api.easyship.com/2023-01/rates`;
    const axiosService = new AxiosService();
    const res = await axiosService.post(createUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async labels(reqBody, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const labelsUrl = 'https://api.easyship.com/2023-01/labels';
    const axiosService = new AxiosService();
    const res = await axiosService.post(labelsUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async updateShipment(reqBody, shipmentId, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const updateShipmentUrl = `https://api.easyship.com/shipment/v1/shipments/${shipmentId}`;
    const axiosService = new AxiosService();
    const res = await axiosService.put(updateShipmentUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async getShipment(shipmentId, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getShipmentUrl = `https://api.easyship.com/2023-01/shipments/${shipmentId}`;

    const axiosService = new AxiosService();
    const res = await axiosService.read(getShipmentUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async getCouriers(query, providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getCouriersUrl = `https://api.easyship.com/2023-01/couriers${query}`;
    const axiosService = new AxiosService();
    const res = await axiosService.read(getCouriersUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async getShipments(providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getAllShipments = 'https://api.easyship.com/v2/shipments';
    const axiosService = new AxiosService();
    const res = await axiosService.read(getAllShipments, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async getLabels(providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getAllShipments = 'https://api.easyship.com/v2/labels';
    const axiosService = new AxiosService();
    const res = await axiosService.read(getAllShipments, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  static async deleteShipment(shipmentId, providerId) {
    const sandToken = await EasyshipService.getTokenByProvider(providerId);
    const deleteShipmentUrl = `https://api.easyship.com/2023-01/shipments/${shipmentId}`;
    const axiosService = new AxiosService();
    try {
      const res = await axiosService.delete(
        deleteShipmentUrl,
        {},
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          // eslint-disable-next-line camelcase
          Authorization: `Bearer ${sandToken}`,
        }
      );

      return res;
    } catch (exc) {
      return null;
    }
  }

  static async warehouseState(reqBody) {
    const warehouseStateUrl = 'https://api.easyship.com/v2/shipments/warehouse_state';
    const axiosService = new AxiosService();
    const res = await axiosService.put(warehouseStateUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${`sand_token`}`,
    });

    return res;
  }

  static async pickupSlots(courierId) {
    const pickupSlotsUrl = `https://api.easyship.com/pickup/v1/pickup_slots/${courierId}`;
    const axiosService = new AxiosService();
    const res = await axiosService.read(pickupSlotsUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${`sand_token`}`,
    });

    return res;
  }

  static async requestPickup(reqBody) {
    const requestPickupsUrl = 'https://api.easyship.com/pickup/v1/pickups';
    const axiosService = new AxiosService();
    const res = await axiosService.post(requestPickupsUrl, reqBody, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${`sand_token`}`,
    });

    return res;
  }

  static async getCheckpoints(shipmentId) {
    const getCheckpointsUrl = `https://api.easyship.com/track/v1/checkpoints?easyship_shipment_id=${shipmentId}`;
    const axiosService = new AxiosService();
    const res = await axiosService.read(getCheckpointsUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${`sand_token`}`,
    });

    return res;
  }

  static async getStatus(shipmentId) {
    const getStatusUrl = `https://api.easyship.com/track/v1/status?easyship_shipment_id=${shipmentId}`;
    const axiosService = new AxiosService();
    const res = await axiosService.read(getStatusUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${`sand_token`}`,
    });

    return res;
  }

  static async getItemCategories(providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getItemCategoriesUrl = 'https://api.easyship.com/2023-01/item_categories';
    const axiosService = new AxiosService();
    const res = await axiosService.read(getItemCategoriesUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    return res;
  }

  // eslint-disable-next-line class-methods-use-this
  static async getBoxes(providerId) {
    // eslint-disable-next-line camelcase
    const sand_token = await EasyshipService.getTokenByProvider(providerId);
    const getBoxesUrl = 'https://api.easyship.com/2023-01/boxes';
    const axiosService = new AxiosService();
    const res = await axiosService.read(getBoxesUrl, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // eslint-disable-next-line camelcase
      Authorization: `Bearer ${sand_token}`,
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const item of res.data.boxes) {
      item.outer_height = (item.outer_dimensions.height / 2.54).toFixed(2);
      item.outer_width = (item.outer_dimensions.width / 2.54).toFixed(2);
      item.outer_length = (item.outer_dimensions.length / 2.54).toFixed(2);
    }

    return res;
  }

  // eslint-disable-next-line class-methods-use-this
  static async getBalance(incomingToken, providerId) {
    const response = {
      status: false,
      message: ``,
    };
    // eslint-disable-next-line camelcase
    const token = incomingToken || (await EasyshipService.getTokenByProvider(providerId));
    const getBoxesUrl = 'https://api.easyship.com/2023-01/account/credit';
    const axiosService = new AxiosService();
    try {
      const res = await axiosService.read(getBoxesUrl, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // eslint-disable-next-line camelcase
        Authorization: `Bearer ${token}`,
      });
      response.data = res.data;
      response.status = true;
    } catch (ex) {
      response.message = ex.message;
      response.status = false;
    }

    return response;
  }
}
module.exports = EasyshipService;
