// schedule to generate invoices
// const Decimal = require('decimal');
// const ottProviderRepository = require('../../repository/ottprovider/ottprovider.repository');
// const clientRepository = require('../../repository/client/client.repository');
// const transactionRepository = require('../../repository/payment/transaction.repository');
// const { invoiceRepository } = require('../../repository');
// const authorizeService = require('./authorize/authorize');
// const ApiError = require('../../api/utils/error/ApiError');
const { repositories } = require('ottstream.dataaccess');

// const { clientRepository, ottProviderPaymentMethodRepository, ottProviderAddressRepository } = repositories;
// const ottProviderAddressRepository = require('../../repository/ottprovider/ottprovider_address.repository');
// const ottProviderPaymentMethodRepository = require('../../repository/ottprovider/ottprovider_payment_method.repository');
const logger = require('../../utils/logger/logger');
// const balanceRepository = require('../../repository/payment/balance.repository');
class PaymentObjectValidator {
  constructor() {
    logger.info(`PaymentValidator() initiated`);
  }

  static validAddress(address) {
    return !!address;
  }

  static async validateCheck(fromType, from, checkNumber, bankName) {
    const response = {
      status: false,
      messages: [],
      card: {
        number: checkNumber,
        bankName,
      },
    };
    if (fromType === 2) {
      response.status = !!checkNumber;
    } else if (fromType === 1) {
      const oldPaymentMethods = await ottProviderPaymentMethodRepository.getOttProviderPaymentMethods(from);
      if (oldPaymentMethods.length) {
        const filteredMethods = oldPaymentMethods.filter((r) => r.paymentMethod === 1 && r.bankTransfer);
        if (filteredMethods.length) {
          response.status = true;
          response.bankTransfer = filteredMethods[0].bankTransfer;
        } else {
          response.status = false;
          response.messages.push(`provider has no bank account to pay with check`);
        }
      } else {
        response.status = false;
        response.messages.push(`provider has no bank account to pay with check`);
      }
    }
    return response;
  }

  static async validateFromTo(fromType, from, toType, to) {
    const response = { status: false, message: '' };
    response.status = !(!from || !to);
    if (!response.status) response.message = ':from or :to is not valid';
    return response;
  }

  static async getAddress(fromType, from, card) {
    let address;
    if (card.anExistingAddress) {
      const addressId = card.existingAddress;
      if (fromType === 2) {
        const client = await clientRepository.getClientById(from);
        if (client && client.addresses) {
          const filtered = client.addresses.filter((r) => r._id && r._id.toString() === addressId);
          if (filtered && filtered.length) {
            // eslint-disable-next-line prefer-destructuring
            address = filtered[0];
          }
        }
        if (!address) address = card.billingAddress;
      } else if (fromType === 1) {
        address = await ottProviderAddressRepository.getOttProviderAddressById(addressId);
      }
    } else {
      address = card.billingAddress;
    }
    return address;
  }

  static async validateCreditCardObject(fromType, from, card, paymentMethodId) {
    const response = {
      status: true,
      message: '',
      card: card._id ? card.toJSON() : card,
    };
    const isCardType = !card.routingNumber;
    if (isCardType) {
      if (card) {
        if (paymentMethodId) {
          response.card.paymentMethodId = paymentMethodId;
          response.card.fromType = fromType;
        }
        if (card.cardNumber) {
          response.card.cardNumber = card.cardNumber.replace(/\s/g, '');
        }
        if (card.anExistingAddress && !card.existingAddress) {
          response.status = false;
          response.message = `existingAddress missing in card`;
          return response;
        }
        const addressObject = await PaymentObjectValidator.getAddress(fromType, from, card);
        response.card.billingAddress = typeof addressObject.toJSON === 'function' ? addressObject.toJSON() : addressObject; // test to fix credit card address
        if (!PaymentObjectValidator.validAddress(response.card.billingAddress)) {
          response.status = false;
          response.message = 'address object is not valid';
        }
      } else {
        response.status = false;
        response.message = 'card object is null';
      }
    } else {
      response.message = 'not validated payment method yet';
    }
    if (response.card && response.card.billingAddress && response.card.billingAddress.phone) {
      if (response.card.billingAddress.phone.number) {
        logger.info(`billing address ${response.card.billingAddress.phone}`);
        const { number } = response.card.billingAddress.phone;
        delete response.card.billingAddress.phone;
        response.card.billingAddress.phone = number;
        logger.info(`billing address ${response.card.billingAddress.phone.number}`);
      }
    }
    return response;
  }

  static async validateBankTransferObject(fromType, from, card, paymentMethodId) {
    const response = {
      status: true,
      message: '',
      card,
    };
    const isCardType = !card.routingNumber;
    if (paymentMethodId) {
      response.card.paymentMethodId = paymentMethodId;
      response.card.fromType = fromType;
    }
    if (!isCardType) {
      if (card) {
        // response.card.billingAddress = await getAddress(fromType, from, card);
        // if (!validAddress(response.card.billingAddress)) {
        //   response.status = false;
        //   response.message = 'address object is not valid';
        // }
      } else {
        response.status = false;
        response.message = 'card object is null';
      }
    } else {
      response.message = 'not validated payment method yet';
    }
    return response;
  }
}

module.exports = PaymentObjectValidator;
