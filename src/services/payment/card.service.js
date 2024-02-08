/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
const { repositories } = require('ottstream.dataaccess');

const { clientRepository, ottProviderPaymentGatewayRepository, clientPaymentMethodRepository } = repositories;
const CloverService = require('./merchant/clover.service');
const SquareService = require('./merchant/square.service');

const logger = require('../../utils/logger/logger');
const serviceCollection = require('../service_collection');

class CardService {
  // eslint-disable-next-line no-unused-vars
  static async clientPaymentMethodValidator(clientId, _paymentMethod) {
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const paymentMethod = _paymentMethod;
    const response = {
      status: false,
      messages: [],
    };
    paymentMethod.valid = false;
    const paymentMethodType = paymentMethod.paymentMethod;
    if (paymentMethodType === 0 || paymentMethodType === 1) {
      let validCardObjectResult;
      if (paymentMethodType === 0 && paymentMethod.creditCard) {
        validCardObjectResult = await PaymentObjectValidator.validateCreditCardObject(2, clientId, paymentMethod.creditCard);
      } else if (paymentMethodType === 1 && paymentMethod.bankTransfer) {
        validCardObjectResult = await PaymentObjectValidator.validateBankTransferObject(
          2,
          clientId,
          paymentMethod.bankTransfer
        );
      } else {
        logger.error(`payment method type and object sent does not match`);
      }

      if (validCardObjectResult && validCardObjectResult.status) {
        // validate Card
        if (paymentMethodType === 0) paymentMethod.creditCard = validCardObjectResult.card;
        else if (paymentMethodType === 1) paymentMethod.bankTransfer = validCardObjectResult.card;
        // check same or not
        // const oldCardFilterList = oldPaymentMethods.filter(
        //   (r) => r.creditCard && r.creditCard.cardNumber === paymentMethod.creditCard.cardNumber
        // );
        // const oldBankFilterList = oldPaymentMethods.filter(
        //   (r) => r.bankTransfer && r.bankTransfer.routingNumber === paymentMethod.bankTransfer.routingNumber
        // );
        // const oldCardExists = paymentMethodType === 0 && oldCardFilterList.length;
        // const oldBankExists = paymentMethodType === 1 && oldBankFilterList.length;
        // if (oldCardExists || oldBankExists) {
        //   if (
        //     (oldCardExists && oldCardFilterList[0]?._id?.toString() !== paymentMethod.id) ||
        //     (oldBankExists && oldBankFilterList[0]?._id?.toString() !== paymentMethod.id)
        //   ) {
        //     throw new ApiError(400, 'Credit card or bank account with same number already exists');
        //   }
        // }
        // let executedTransaction;
        // await transactionRepository.getVoidTransactionsForCreditCard(clientId, _toPayOttIdd);
        // eslint-disable-next-line no-restricted-syntax
        // for (const curVoidTransaction of existingTransactions) {
        //   if (
        //     curVoidTransaction.payload &&
        //     (paymentMethodType === 0
        //       ? curVoidTransaction.payload.cardNumber === paymentMethod.creditCard.cardNumber
        //       : curVoidTransaction.payload.routingNumber === paymentMethod.bankTransfer.routingNumber) &&
        //     (curVoidTransaction.state === 1 || curVoidTransaction.state === 4)
        //   ) {
        //     executedTransaction = curoidTransaction;
        //     // eslint-disable-next-line no-await-in-loop
        //     await paymentProcessor.cancelTransaction(executedTransaction);
        //   }
        // }
        /*
      const transactionCreateResult = await TransactionService.createVoidTransaction(
        2,
        clientId,
        1,
        _toPayOttIdd,
        0.5,
        paymentMethodType,
        paymentMethodType === 0 ? paymentMethod.creditCard : paymentMethod.bankTransfer,
        user
      );
      if (transactionCreateResult)
        executedTransaction = await TransactionService.executeTransaction(transactionCreateResult.transaction);
      if (!executedTransaction) throw new ApiError(400, `no executed transaction can be generate or selected from List`);
      if (executedTransaction.state === 1) {
        await TransactionService.cancelTransaction(executedTransaction);
        // if (!refundResult.status)
        //   throw new ApiError(400, `failed to refund auth only transaction ${refundResult.messages.toString()}`);
        response.status = true;
        response.paymentMethod = paymentMethod;
      } else {
        throw new ApiError(
          400,
          `credit card or bank account validation transaction failed: ${executedTransaction.stateMessage ?? null}`
        );
      } */

        response.status = true;
        response.paymentMethod = paymentMethod;
      } else {
        logger.error(`credit card or bank account details are not valid ${validCardObjectResult.message}`);
      }
    } else if (
      typeof paymentMethod.inUse !== 'undefined' &&
      typeof paymentMethod.default !== 'undefined' &&
      typeof paymentMethod.paymentMethod === 'undefined'
    ) {
      response.status = true;
      response.paymentMethod = paymentMethod;
    } else {
      logger.error(`unsupported payment method type`);
    }

    return response;
  }

  static async syncCard(clientId, paymentObject) {
    const response = {
      status: false,
      messages: [],
      paymentObject,
    };
    const client = await clientRepository.getClientById(clientId);
    const providerId = client.provider._id.toString();
    const paymentGateways = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(providerId);
    if (!paymentGateways.length) {
      response.status = false;
      response.messages.push(`provider has no payment gateway setup`);
      return response;
    }
    const currentGateway = paymentGateways[0];
    if (currentGateway.cards === 'clover') {
      if (!currentGateway.clover.isValid) response.messages.push('no valid payment gateway');
      else if (paymentObject.cloverProviderId !== providerId || !paymentObject.cloverId) {
        const customerCloverResponse = await CloverService.createCustomer(
          client,
          paymentObject.creditCard,
          currentGateway.clover?.secretKey,
          currentGateway.clover?.merchantId
        );
        if (customerCloverResponse.customerId) {
          response.status = true;
          response.isValid = customerCloverResponse.status;
          response.paymentObject.cloverProviderId = providerId;
          response.paymentObject.cloverId = customerCloverResponse.customerId;
          if (!response.isValid) {
            response.messages = response.messages.concat(customerCloverResponse.messages);
          }
        } else {
          response.messages = response.messages.concat(customerCloverResponse.messages);
        }
      }
    }
    if (currentGateway.cards === 'square') {
      if (!currentGateway.square.isValid) response.messages.push('no valid payment gateway');
      else if (paymentObject.square !== providerId || !paymentObject.squareId) {
        const customerSquareResponse = await SquareService.createCustomer(
          client,
          paymentObject.creditCard,
          currentGateway.square?.secretKey,
          currentGateway.square?.merchantId
        );
        if (customerSquareResponse.customerId) {
          response.status = true;
          response.isValid = customerSquareResponse.status;
          response.paymentObject.squareProviderId = providerId;
          response.paymentObject.squarePaymentId = customerSquareResponse.squarePaymentId;
          response.paymentObject.squareId = customerSquareResponse.customerId;
          if (!response.isValid) {
            response.messages = response.messages.concat(customerSquareResponse.messages);
          }
        } else {
          response.messages = response.messages.concat(customerSquareResponse.messages);
        }
      }
    }
    if (currentGateway.cards === 'authorize') {
      if (!currentGateway.authorize.isValid) response.messages.push('no valid payment gateway');
      else if (
        paymentObject.authorizeProviderId !== providerId ||
        !paymentObject.authorizeId ||
        !paymentObject.authorizePaymentProfileId
      ) {
        const authorizeService = serviceCollection.getService('authorizeService');
        const customerData = { customerId: client.number_id };
        if (client.emails && client.emails.length) customerData.email = client.emails[0].email;
        const customerAuthorizeResponse = await authorizeService.createCustomerProfile(
          customerData,
          paymentObject.creditCard,
          currentGateway.authorize?.apiLoginId,
          currentGateway.authorize?.transactionKey
        );
        // E00039 = customer already exsists in authorize
        if (!customerAuthorizeResponse.status && customerAuthorizeResponse.statusCode === 'E00039') {
          const getExistCustomerResponse = await authorizeService.getCustomerProfile(
            customerAuthorizeResponse.customerProfileId,
            currentGateway.authorize?.apiLoginId,
            currentGateway.authorize?.transactionKey
          );
          if (getExistCustomerResponse.status) {
            response.status = true;
            response.paymentObject.authorizeProviderId = providerId;
            response.paymentObject.authorizeId = getExistCustomerResponse.profile.customerProfileId;
          } else {
            response.status = false;
            response.messages.push(getExistCustomerResponse.message);
          }
        } else if (customerAuthorizeResponse.status && customerAuthorizeResponse.customerId) {
          response.status = true;
          response.paymentObject.authorizeProviderId = providerId;
          response.paymentObject.authorizeId = customerAuthorizeResponse.customerId;
        } else if (customerAuthorizeResponse.messages) {
          response.messages = response.messages.concat(customerAuthorizeResponse.messages);
        }

        if (response.status && response.paymentObject.authorizeId) {
          const getExistCustomerResponse = await authorizeService.createCustomerPaymentProfile(
            response.paymentObject.authorizeId,
            paymentObject.creditCard ?? paymentObject.bankTransfer,
            currentGateway.authorize?.apiLoginId,
            currentGateway.authorize?.transactionKey
          );
          if (getExistCustomerResponse.status) {
            response.status = true;
            response.paymentObject.authorizeProviderId = providerId;
            response.paymentObject.authorizePaymentProfileId = getExistCustomerResponse.paymentProfileId;
          } else if (getExistCustomerResponse.code === 'E00039' && getExistCustomerResponse.paymentProfileId) {
            // get customer profile
            response.status = true;
            response.paymentObject.authorizeProviderId = providerId;
            response.paymentObject.authorizePaymentProfileId = getExistCustomerResponse.paymentProfileId;
            response.messages.push(getExistCustomerResponse.message);
          } else {
            response.status = false;
            response.messages.push(getExistCustomerResponse.message);
          }
        }
      } else {
        response.status = true;
      }
    }
    return response;
  }

  static async deleteCard(clientId, paymentMethod) {
    const response = {
      status: false,
      messages: [],
    };
    const client = await clientRepository.getClientById(clientId);
    const providerId = client.provider._id.toString();
    const paymentGateways = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(providerId);
    if (!paymentGateways.length) {
      response.status = false;
      response.messages.push(`provider has no payment gateway setup`);
      return response;
    }
    const currentGateway = paymentGateways[0];
    if (currentGateway.cards === 'clover') {
      if (!currentGateway.clover.isValid) response.messages.push('no valid payment gateway');
      else {
        let existingAddress = null;
        const existingAddresses = client.addresses.filter((r) => r.id === paymentMethod.creditCard.existingAddress);
        if (existingAddresses.length) {
          // eslint-disable-next-line prefer-destructuring
          existingAddress = existingAddresses[0];
        }
        if (!existingAddress) {
          response.messages.push(`no existing address found on card to get phone and firstname to delete clover`);
          response.status = true;
        } else {
          const customerCloverResponse = await CloverService.getCustomer(
            {
              search: `fullName=${existingAddress.firstname} ${existingAddress.lastname}`,
              phone: existingAddress.phone,
            },
            {
              limit: 100,
            },
            currentGateway.clover?.secretKey,
            currentGateway.clover?.merchantId
          );
          if (!customerCloverResponse.status) {
            response.messages.push(
              `no customer found on clover to delete card ${existingAddress.firstname} ${existingAddress.lastname} ${existingAddress.phone}`
            );
          }
          // eslint-disable-next-line no-restricted-syntax
          for (const remoteCustomer of customerCloverResponse.remoteCustomers) {
            if (!remoteCustomer.cards?.elements?.length) {
              response.messages.push(`clover customer has no card to delete`);
            }
            const foundCards = remoteCustomer.cards?.elements.filter(
              (r) => r.last4 && paymentMethod.creditCard.cardNumber.search(r.last4) !== -1
            );
            if (!foundCards.length) {
              response.status = true;
              response.messages.push(`clover customer has no matching card to delete`);
            }
            // eslint-disable-next-line no-restricted-syntax
            for (const card of foundCards) {
              const deleteCard = await CloverService.deletePaymentMethod(
                {
                  customerId: remoteCustomer.id,
                  cardId: card.id,
                },
                currentGateway.clover?.secretKey,
                currentGateway.clover?.merchantId
              );
              if (deleteCard.status) {
                response.status = true;
              } else {
                response.messages = response.messages.concat(customerCloverResponse.messages);
              }
            }
          }
        }
      }
    }
    if (currentGateway.cards === 'square') {
      if (!currentGateway.square.isValid) response.messages.push('no valid payment gateway');
      else {
        let existingAddress = null;
        const existingAddresses = client.addresses.filter((r) => r.id === paymentMethod.creditCard.existingAddress);
        if (existingAddresses.length) {
          // eslint-disable-next-line prefer-destructuring
          existingAddress = existingAddresses[0];
        }
        if (!existingAddress) {
          response.messages.push(`no existing address found on card to get phone and firstname to delete square`);
          response.status = true;
        } else {
          const customerSquareResponse = await SquareService.getCustomer(
            {
              search: `fullName=${existingAddress.firstname} ${existingAddress.lastname}`,
              phone: existingAddress.phone,
            },
            {
              limit: 100,
            },
            currentGateway.square?.secretKey,
            currentGateway.square?.merchantId
          );
          if (!customerSquareResponse.status) {
            response.messages.push(
              `no customer found on square to delete card ${existingAddress.firstname} ${existingAddress.lastname} ${existingAddress.phone}`
            );
          }
          if (!customerSquareResponse.remoteCustomers.length) response.status = true;
          // eslint-disable-next-line no-restricted-syntax
          for (const remoteCustomer of customerSquareResponse.remoteCustomers) {
            if (!remoteCustomer.cards?.elements?.length) {
              response.messages.push(`square customer has no card to delete`);
            }
            const foundCards = remoteCustomer.cards?.elements.filter(
              (r) => r.last4 && paymentMethod.creditCard.cardNumber.search(r.last4) !== -1
            );
            if (!foundCards.length) {
              response.status = true;
              response.messages.push(`square customer has no matching card to delete`);
            }
            // eslint-disable-next-line no-restricted-syntax
            for (const card of foundCards) {
              const deleteCard = await SquareService.deletePaymentMethod(
                {
                  customerId: remoteCustomer.id,
                  cardId: card.id,
                },
                currentGateway.square?.secretKey,
                currentGateway.square?.merchantId
              );
              if (deleteCard.status) {
                response.status = true;
              } else {
                response.messages = response.messages.concat(customerSquareResponse.messages);
              }
            }
          }
        }
      }
    }
    if (currentGateway.cards === 'authorize') {
      if (!currentGateway.authorize.isValid) response.messages.push('no valid payment gateway');
      else {
        // const authorizeService = serviceCollection.getService('authorizeService');
        const customerData = { customerId: client.number_id };
        if (client.emails && client.emails.length) customerData.email = client.emails[0].email;
        // TODO delete from authorize
        response.status = true;
      }
    }
    return response;
  }

  static async validateCards(providerId, clientId) {
    const providerGateways = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(providerId);

    const providerGateway = providerGateways.length ? providerGateways[0] : null;

    const clientPaymentMethods = await clientPaymentMethodRepository.getList({}, [{ path: 'clientId' }]);
    const filteredPaymentMethods = clientPaymentMethods.filter(
      (r) => r.clientId?.provider?.toString() === providerId && (clientId ? r.clientId.id.toString() === clientId : true)
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const paymentMethod of filteredPaymentMethods) {
      if (providerGateway) {
        if (providerGateway.cards === 'clover' && providerGateway.clover?.isValid) {
          // TODO get client paymentMethods with populated client
          if (
            !paymentMethod.cloverId ||
            !paymentMethod.cloverProviderId ||
            paymentMethod.cloverProviderId.toString() !== providerId
          ) {
            if (paymentMethod.isValid) {
              logger.warn(`client payment method gateway changed, need type card again (now clover)`);
              await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
                isValid: false,
                validationMessage: `provider's paymentgateway changed to clover`,
              });
            }
          } else if (!paymentMethod.isValid) {
            await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
              isValid: true,
              validationMessage: ``,
            });
          }
          // check provider and cloverId
        } else if (providerGateway.cards === 'square' && providerGateway.square?.isValid) {
          // TODO get client paymentMethods with populated client
          if (
            !paymentMethod.squareId ||
            !paymentMethod.squareProviderId ||
            paymentMethod.squareProviderId.toString() !== providerId
          ) {
            if (paymentMethod.isValid) {
              logger.warn(`client payment method gateway changed, need type card again (now square)`);
              await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
                isValid: false,
                validationMessage: `provider's paymentgateway changed to square`,
              });
            }
          } else if (!paymentMethod.isValid) {
            await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
              isValid: true,
              validationMessage: ``,
            });
          }
          // check provider and squareId
        } else if (providerGateway.cards === 'authorize' && providerGateway.authorize?.isValid) {
          // TODO get client paymentMethods with populated client
          if (
            !paymentMethod.authorizeId ||
            !paymentMethod.authorizeProviderId ||
            paymentMethod.authorizeProviderId.toString() !== providerId
          ) {
            if (paymentMethod.isValid) {
              logger.warn(`client payment method gateway changed, need type card again (now authorize)`);
              await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
                isValid: false,
                validationMessage: `provider's paymentgateway changed to authorize`,
              });
            }
          } else if (!paymentMethod.isValid) {
            await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
              isValid: true,
              validationMessage: ``,
            });
          }
        }
      } else {
        await clientPaymentMethodRepository.updateClientPaymentMethodById(paymentMethod._id.toString(), {
          isValid: false,
          validationMessage: `provider has no payment gateway setup`,
        });
      }
    }
  }
}

module.exports = CardService;
