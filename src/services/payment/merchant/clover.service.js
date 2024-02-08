const axios = require('axios');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../../utils/logger/logger');
const config = require('../../../config/config');

// const { ottProviderEmailRepository } = repositories;

class CloverService {
  constructor() {
    logger.info(`CloverService() initiated`);
  }

  // eslint-disable-next-line no-unused-vars
  static async getUnsetteledTransactions(secretKey, merchantId) {
    const response = {
      status: false,
      messages: [],
      list: [],
    };
    const baseUrl = config.clover_prod
      ? 'https://scl.clover.com/v1/charges'
      : 'https://scl-sandbox.dev.clover.com/v1/charges';
    try {
      const res = await axios.get(`${baseUrl}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      response.list = res.data.data;
      response.status = true;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.response?.data);
    }

    return response;
  }

  static async validateKey(secretKey, merchantId) {
    const response = {
      status: false,
      messages: [],
    };
    const baseUrl = config.clover_prod
      ? `https://api.clover.com/v3/merchants/${merchantId}`
      : `https://sandbox.dev.clover.com/v3/merchants/${merchantId}`;
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

  static async getTransactionDetails(secretKey, merchantId, paymentuid) {
    const response = {
      status: false,
      messages: [],
    };
    const baseUrl = config.clover_prod
      ? `https://api.clover.com/v3/merchants/${merchantId}/payments/${paymentuid}?expand=additionalCharges`
      : `https://sandbox.dev.clover.com/v3/merchants/${merchantId}/payments/${paymentuid}?expand=additionalCharges`;

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
      let cardTokenId = cardInfo.cloverId;
      if (true) {
        // if (!cardInfo.cloverI!cardInfo.cloverId) {
        // get api token
        headers = {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        };
        const baseUrl = config.clover_prod
          ? 'https://api.clover.com/pakms/apikey'
          : 'https://apisandbox.dev.clover.com/pakms/apikey';
        const tokenResponse = await axios.get(baseUrl, {
          headers,
        });
        const { apiAccessKey } = tokenResponse.data;

        // get card token
        headers = {
          apiKey: `${apiAccessKey}`,
          'Content-Type': 'application/json',
        };
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
        const cloverPath = config.clover_prod
          ? 'https://token.clover.com/v1/tokens'
          : 'https://token-sandbox.dev.clover.com/v1/tokens';
        const tokenizeResponse = await axios.post(cloverPath, cardData, {
          headers,
        });
        cardTokenId = tokenizeResponse.data.id;
      }
      // charge
      headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const captureData = {
        ecomind: 'ecom',
        metadata: {
          existingDebtIndicator: false,
        },
        amount: orderInfo.amount * 100,
        currency: 'USD',
        capture: true,
        source: cardTokenId,
      };
      const baseUrl = config.clover_prod
        ? 'https://scl.clover.com/v1/charges'
        : 'https://scl-sandbox.dev.clover.com/v1/charges';
      const chargeResponse = await axios.post(baseUrl, captureData, {
        headers,
      });
      const chargeId = chargeResponse.data.id;
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
      const baseUrl = config.clover_prod
        ? `https://api.clover.com/v3/merchants/${merchandId}/customers?limit=${options.limit}&expand=metadata,emailAddresses,phoneNumbers,cards`
        : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers?limit=${options.limit}&expand=metadata,emailAddresses,phoneNumbers,cards`;

      const getResponse = await axios.get(baseUrl, {
        headers,
      });
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
      const baseUrl = config.clover_prod
        ? `https://api.clover.com/v3/merchants/${merchandId}/customers/${filter.customerId}/cards/${filter.cardId}`
        : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers/${filter.customerId}/cards/${filter.cardId}`;
      const getResponse = await axios.delete(baseUrl, {
        headers,
      });
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
      const baseUrl = config.clover_prod
        ? `https://api.clover.com/v3/merchants/${merchandId}/customers?limit=${options.limit}&expand=metadata,emailAddresses,phoneNumbers,cards&filter=${filter.search}`
        : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers?limit=${options.limit}&expand=metadata,emailAddresses,phoneNumbers,cards&filter=${filter.search}`;
      const getResponse = await axios.get(baseUrl, {
        headers,
      });
      response.status = true;
      response.data = getResponse.data;

      response.remoteCustomer = null;
      const remoteCustomerFiltered = response.data.elements.filter(
        (r) => r.phoneNumbers?.elements.filter((a) => a.phoneNumber === filter.phone).length
      );
      if (remoteCustomerFiltered.length) {
        if (remoteCustomerFiltered.length > 1) {
          logger.warn(`more than one clover client for ${filter.phone}`);
        }
        // eslint-disable-next-line prefer-destructuring
        response.remoteCustomers = remoteCustomerFiltered;
      }
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
      // get api token
      let headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const baseUrl = config.clover_prod
        ? 'https://api.clover.com/pakms/apikey'
        : 'https://apisandbox.dev.clover.com/pakms/apikey';
      const tokenResponse = await axios.get(baseUrl, {
        headers,
      });
      const { apiAccessKey } = tokenResponse.data;

      // get card token
      headers = {
        apiKey: `${apiAccessKey}`,
        'Content-Type': 'application/json',
      };
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
      const last4 = cardInfo.cardNumber.slice(-4);
      const cloverPath = config.clover_prod
        ? 'https://token.clover.com/v1/tokens'
        : 'https://token-sandbox.dev.clover.com/v1/tokens';
      const tokenizeResponse = await axios.post(cloverPath, cardData, {
        headers,
      });

      // charge
      headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };
      const cardTokenId = tokenizeResponse.data.id;
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
      const existingCustomers = await CloverService.getCustomer(
        {
          search: `fullName=${cardInfo.billingAddress.firstname} ${cardInfo.billingAddress.lastname}`,
          phone: cardInfo.billingAddress.phone,
        },
        {
          limit: 100,
        },
        secretKey,
        merchandId
      );
      // check for existing and remove it
      const sameNumberCustomers =
        existingCustomers?.remoteCustomers?.filter(
          // eslint-disable-next-line no-shadow
          (r) => r.cards?.elements?.filter((a) => a.last4 === last4).length
        ) || [];
      let remoteCustomer = null;
      // eslint-disable-next-line no-restricted-syntax
      for (const sameNumberCustomer of sameNumberCustomers) {
        const cardId = sameNumberCustomers.cards?.elements?.filter((r) => r.last4 === last4)[0];
        if (cardId) {
          try {
            const delCardUrl = config.clover_prod
              ? `https://api.clover.com/v3/merchants/${merchandId}/customers/${sameNumberCustomer.id}/cards/${cardId.id}`
              : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers/${sameNumberCustomer.id}/cards/${cardId.id}`;
            // eslint-disable-next-line no-await-in-loop
            await axios.delete(delCardUrl, {
              headers,
            });
            remoteCustomer = sameNumberCustomer;
          } catch (ex) {
            logger.error(ex);
          }
        }
      }

      if (!remoteCustomer && existingCustomers?.remoteCustomers?.filter((r) => !r.cards?.elements?.length).length) {
        // eslint-disable-next-line prefer-destructuring
        remoteCustomer = existingCustomers.remoteCustomers.filter((r) => !r.cards?.elements?.length)[0];
      }
      if (!remoteCustomer) {
        const createData = {
          firstName: cardInfo.billingAddress.firstname,
          lastName: cardInfo.billingAddress.lastname,
          phoneNumbers: [
            {
              phoneNumber: cardInfo.billingAddress.phone,
            },
          ],
        };
        const addCustomerUrl = config.clover_prod
          ? `https://api.clover.com/v3/merchants/${merchandId}/customers`
          : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers`;
        const createResponse = await axios.post(addCustomerUrl, createData, {
          headers,
        });
        remoteCustomer = createResponse.data;
      }
      if (!remoteCustomer) {
        response.status = false;
        response.messages.push(`error creating customer profile in clover`);
      }

      try {
        const changeCustomerUrl = config.clover_prod
          ? `https://scl.clover.com/v1/customers/${remoteCustomer.id}`
          : `https://scl-sandbox.dev.clover.com/v1/customers/${remoteCustomer.id}`;
        await axios.put(
          changeCustomerUrl,
          {
            email,
            source: cardTokenId,
          },
          {
            headers,
          }
        );

        response.status = true;
      } catch (ex) {
        if (ex.response.status === 402) {
          response.status = false;
          response.messages.push(`(multipay) problem card..`);
          const createCard = {
            token: cardTokenId,
            tokenType: 'CTOKEN',
            expirationDate: `${cardInfo.month}${cardInfo.year}`,
            last4: cardInfo.cardNumber.slice(-4),
            first6: cardInfo.cardNumber.slice(0, 6),
            firstName: cardInfo.billingAddress.firstname,
            lastName: cardInfo.billingAddress.lastname,
          };

          const addCardUrl = config.clover_prod
            ? `https://api.clover.com/v3/merchants/${merchandId}/customers/${remoteCustomer.id}/cards`
            : `https://sandbox.dev.clover.com/v3/merchants/${merchandId}/customers/${remoteCustomer.id}/cards`;
          await axios.post(addCardUrl, createCard, {
            headers,
          });
        } else if (ex.response.status === 409) {
          response.status = true;
          // response.messages.push(`multipay problem card. contact bank please.`);
        } else {
          response.status = false;
          response.messages.push(ex.response.data.error?.message);
          return;
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
    const baseUrl = config.clover_prod
      ? `https://scl.clover.com/v1/refunds`
      : `https://scl-sandbox.dev.clover.com/v1/refunds`;

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

module.exports = CloverService;
