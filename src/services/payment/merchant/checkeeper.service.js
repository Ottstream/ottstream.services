const checkeeperSignature = require('checkeeper-signature');
const axios = require('axios');
const logger = require('../../../utils/logger/logger');

class CheckeeperService {
  constructor() {
    logger.info(`TwilioService() initiated`);
  }

  static async isValidKey(token, secret) {
    const response = {
      status: false,
      message: '',
      list: [],
    };
    const options = {
      secretKey: secret,
    };

    const createData = {
      token,
    };

    const signature = checkeeperSignature(createData, options);

    const axiosResponse = await axios.post('https://my.checkeeper.com/api/v2/account/info/', { ...createData, signature });

    // Inspect the response to determine if the key is valid. The exact condition can depend on the API's response structure.
    if (axiosResponse.data && axiosResponse.data.success) {
      response.status = true;
      response.message = 'key is valid';
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async createCheck(info, token, secret) {
    const response = {
      status: false,
      message: '',
      list: [],
    };
    const options = {
      secretKey: secret,
    };

    const createData = {
      token,
      test: '1',
      date: '2020-06-14',
      check_number: '5004',
      amount: '5,230.00',
      memo: 'Widget supply order',
      bank_routing: '021000021',
      bank_account: '9320122',
      return_pdf: '1',
      payer: {
        name: 'Widgets Inc.',
        address: {
          line1: '827 Random Street',
          line2: 'Suite 102',
        },
        city: 'Anytown',
        state: 'NY',
        zip: '14850',
        signer: 'John Hancock',
      },
      payee: {
        name: "Bob's Supplies",
        address: {
          line1: '114 Project Lane',
        },
        city: 'Tinkertown',
        state: 'CA',
        zip: '90210',
        country: 'US',
      },
    };

    const signature = checkeeperSignature(createData, options);

    const axiosResponse = await axios.post('https://my.checkeeper.com/api/v2/check/create/', { ...createData, signature });

    // Inspect the response to determine if the key is valid. The exact condition can depend on the API's response structure.
    if (axiosResponse.data && axiosResponse.data.success) {
      response.status = true;
      response.message = axiosResponse.data.message;
      response.pdf = axiosResponse.data.pdf;
      response.check = axiosResponse.data.check;
      logger.info('check created success!');
    }
    return response;
  }
}

module.exports = CheckeeperService;
