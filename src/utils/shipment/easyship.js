const request = require('request');
const logger = require('../logger/logger');

function voidShipment() {
  request(
    {
      method: 'GET',
      url: 'https://api.easyship.com/shipment/v1/shipments?easyship_shipment_id=&platform_order_number=&shipment_state=&pickup_state=&delivery_state=&label_state=&created_at_from=&created_at_to=&confirmed_at_from=&confirmed_at_to=&per_page=&page=',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sand_EYlrVkzEQ8t0hHakAWGPHdjlBsKJS/zV79oTrsLR1kc=',
      },
    },
    function (error, response, body) {
      logger.info('Status:', response.statusCode);
      logger.info('Headers:', JSON.stringify(response.headers));
      logger.info('Response:', body);
    }
  );
}

module.exports.voidShipment = voidShipment;
