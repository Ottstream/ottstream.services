/* eslint-disable no-unused-vars */
const axios = require('axios');
const { uuid } = require('uuidv4');
const { repositories } = require('ottstream.dataaccess');
const config = require('../../../config/config');
const logger = require('../../../utils/logger/logger');

const { ottProviderEmailRepository } = repositories;

class SquareService {
  constructor() {
    logger.info(`SquareService() initiated`);
  }

  static async validateKey(secretKey, applicationId) {
    const squareUrl = config.square_prod ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    const response = {
      status: false,
      messages: [],
    };
    // eslint-disable-next-line camelcase
    const baseUrl = `${squareUrl}/v2/webhooks/event-types`;
    //
    try {
      const res = await axios.get(`${baseUrl}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      const merchantData = res.data;
      const { balance } = merchantData; // Balance information is typically found in the 'balance' field

      response.balance = balance;
      response.status = true;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data);
    }

    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async authorizeValidateTransaction(cardInfo, orderInfo, secretKey, merchandId) {
    const response = {
      status: false,
      messages: [],
    };
    let headers = {};
    //
    try {
      // charge
      headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const captureData = {
        idempotency_key: uuid(),
        source_id: cardInfo.squarePaymentId || cardInfo.token,
        accept_partial_authorization: false,
        amount_money: {
          amount: orderInfo.amount.toFixed(2) * 100,
          currency: 'USD',
        },
      };
      if (cardInfo.squareId) {
        captureData.customer_id = cardInfo.squareId;
      }
      const squareUrl = config.square_prod ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
      const chargeResponse = await axios.post(`${squareUrl}/v2/payments`, captureData, {
        headers,
      });
      const chargeId = chargeResponse.data.payment.id;
      response.status = true;
      response.transactionId = chargeId;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data?.error?.message);
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async getCusomerList(options = {}, secretKey, merchandId) {
    // eslint-disable-next-line no-param-reassign
    if (!options.limit) options.limit = 10;
    const response = {
      status: false,
      messages: [],
    };
    //
    try {
      // get api token
      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const getResponse = await axios.get(
        `https://api.square.com/v3/merchants/${merchandId}/customers?limit=${options.limit}&expand=metadata,emailAddresses,phoneNumbers,cards`,
        {
          headers,
        }
      );
      response.status = true;
      response.data = getResponse.data;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data?.error?.message);
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async deletePaymentMethod(filter = {}, secretKey, merchandId) {
    // eslint-disable-next-line no-param-reassign
    const response = {
      status: false,
      messages: [],
    };
    //
    try {
      // get api token
      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const getResponse = await axios.delete(
        `https://api.square.com/v3/merchants/${merchandId}/customers/${filter.customerId}/cards/${filter.cardId}`,
        {
          headers,
        }
      );
      response.status = true;
      response.data = getResponse.data;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data?.error?.message);
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async getCustomer(filter = {}, options = {}, secretKey, merchandId) {
    // eslint-disable-next-line no-param-reassign
    if (!options.limit) options.limit = 10;
    const response = {
      status: false,
      messages: [],
    };
    //
    try {
      // get api token
      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const squareUrl = config.square_prod ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
      const getResponse = await axios.post(
        `${squareUrl}/v2/customers/search`,
        {
          count: true,
          query: {
            filter: {
              reference_id: {
                exact: filter.search,
              },
            },
          },
        },
        {
          headers,
        }
      );
      response.status = true;
      response.data = getResponse.data;

      response.remoteCustomers = response.data?.customers || [];
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data?.error?.message);
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async createCustomer(client, cardInfo, secretKey, merchandId) {
    const response = {
      status: false,
      messages: [],
    };
    //
    try {
      const cardData = {
        card: {
          exp_month: cardInfo.month,
          number: cardInfo.cardNumber,
          exp_year: cardInfo.year,
          name: cardInfo.cardholderName,
          cvv: cardInfo.cvc,
          last4: cardInfo.cardNumber.slice(-4),
          first6: cardInfo.cardNumber.slice(0, 6),
          country: cardInfo.billingAddress.country,
          address_line1: cardInfo.billingAddress.address,
          address_city: cardInfo.billingAddress.city,
          address_state: cardInfo.billingAddress.province,
          address_zip: cardInfo.billingAddress.zip,
        },
      };
      let email = '';
      if (client.emails && client.emails.filter((r) => r.forContactInvoice).length) {
        email = client.emails.filter((r) => r.forContactInvoice)[0].email;
      }
      if (client.emails && client.emails.filter((r) => r.forContactInvoice).length) {
        email = client.emails.filter((r) => r.forContactInvoice)[0].email;
      }
      if (!email) {
        const ottMails = await ottProviderEmailRepository.getOttProviderEmails(client.provider.id);
        if (ottMails.length && ottMails.filter((r) => r.forInvoice).length)
          email = ottMails.filter((r) => r.forInvoice)[0].address;
      }
      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const existingCustomers = await SquareService.getCustomer(
        {
          search: `${client.id}`,
        },
        {
          limit: 100,
        },
        secretKey,
        merchandId
      );
      // check for existing and remove it
      let remoteCustomer = null;
      if (!remoteCustomer && existingCustomers?.remoteCustomers?.length) {
        // eslint-disable-next-line prefer-destructuring
        remoteCustomer = existingCustomers.remoteCustomers[0];
      }
      if (!remoteCustomer) {
        const createData = {
          reference_id: client.id,
          family_name: `${cardInfo.billingAddress.firstname} ${cardInfo.billingAddress.lastname}`,
        };
        const squareUrl = config.square_prod ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
        const createResponse = await axios.post(`${squareUrl}/v2/customers`, createData, {
          headers,
        });
        remoteCustomer = createResponse.data?.customer;
      }
      if (!remoteCustomer) {
        response.status = false;
        response.messages.push(`error creating customer profile in square`);
      }

      try {
        const squareUrl = config.square_prod ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
        const createdCard = await axios.post(
          `${squareUrl}/v2/cards`,
          {
            source_id: cardInfo.token,
            card: {
              cardholder_name: cardInfo.cardholderName,
              customer_id: remoteCustomer.id,
            },
            idempotency_key: uuid(),
          },
          {
            headers,
          }
        );

        response.status = true;
        response.squarePaymentId = createdCard.data.card.id;
      } catch (ex) {
        if (ex.response.status === 200) {
          response.status = false;
          response.messages.push(`square card add problem`);
        } else if (ex.response.status === 403) {
          response.status = false;
          response.messages.push(ex.response.data.errors[0].detail);
          return response;
        }
      }
      response.customerId = remoteCustomer.id;
      // const customerData = {
      //   ecomind: 'moto',
      //   email,
      //   firstName: cardInfo.billingAddress.firstname,
      //   lastName: cardInfo.billingAddress.lastname,
      //   name: `${cardInfo.billingAddress.firstname} ${cardInfo.billingAddress.lastname}`,
      //   source: cardTokenId,
      //   phone: cardInfo.billingAddress.phone,
      // };
      // const chargeId = chargeResponse.data.id;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data?.error?.message);
    }
    return response;
  }

  // eslint-disable-next-line no-unused-vars
  static async voidTransaction(transactionId, secretKey, merchantId) {
    const response = {
      status: false,
      messages: [],
    };
    const baseUrl = `https://scl.square.com/v1/refunds`;

    try {
      const res = await axios.post(
        baseUrl,
        {
          charge: transactionId,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );
      // TODO add data fromres.data
      response.status = true;
      response.transactionId = res.data.charge;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data);
    }
    return response;
  }
}

module.exports = SquareService;
