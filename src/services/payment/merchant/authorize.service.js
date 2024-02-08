const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const SDKConstants = require('authorizenet').Constants;
const { repositories } = require('ottstream.dataaccess');
const config = require('../../../config/config');

// const { clientPaymentMethodRepository } = repositories;
const logger = require('../../../utils/logger/logger');

class AuthorizeService {
  constructor() {
    logger.info(`AuthorizeService() initiated`);

    this.getTransactionSettings = () => {
      const transactionSetting1 = new ApiContracts.SettingType();
      transactionSetting1.setSettingName('duplicateWindow');
      transactionSetting1.setSettingValue('120');

      const transactionSetting2 = new ApiContracts.SettingType();
      transactionSetting2.setSettingName('recurringBilling');
      transactionSetting2.setSettingValue('false');

      const transactionSettingList = [];
      transactionSettingList.push(transactionSetting1);
      transactionSettingList.push(transactionSetting2);

      const transactionSettings = new ApiContracts.ArrayOfSetting();
      transactionSettings.setSetting(transactionSettingList);
      return transactionSettings;
    };

    this.getLineItems = () => {
      // eslint-disable-next-line camelcase
      // const lineItem_id2 = new ApiContracts.LineItemType();
      // lineItem_id2.setItemId('2');
      // lineItem_id2.setName('vase2');
      // lineItem_id2.setDescription('cannes logo2');
      // lineItem_id2.setQuantity('28');
      // lineItem_id2.setUnitPrice('25.00');
      //
      // const lineItemList = [];
      // lineItemList.push(lineItem_id2);

      return new ApiContracts.ArrayOfLineItem();
      // lineItems.setLineItem(lineItemList);
    };

    this.getMerchantAuthenticationType = (apiLogin, secretKey) => {
      const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
      merchantAuthenticationType.setName(apiLogin);
      merchantAuthenticationType.setTransactionKey(secretKey);
      return merchantAuthenticationType;
    };

    this.getBillingTo = (cardInfo, orderInfo) => {
      const { email } = orderInfo;
      const { cardholderName, billingAddress } = cardInfo;
      const billTo = new ApiContracts.CustomerAddressType();
      // billTo.setFirstName('Ellen');
      // billTo.setLastName('Johnson');
      billTo.setFirstName(cardholderName);
      billTo.setCompany(billingAddress ? billingAddress.companyName : '');
      billTo.setAddress(billingAddress ? billingAddress.address : '');
      billTo.setCity(billingAddress ? billingAddress.city : '');
      billTo.setState(billingAddress ? billingAddress.state : '');
      billTo.setZip(billingAddress ? billingAddress.zip : '');
      billTo.setCountry(billingAddress ? billingAddress.country : '');
      billTo.setPhoneNumber(billingAddress?.phone?.number ?? '');
      billTo.setFaxNumber(billingAddress?.phone?.number ?? '');
      billTo.setEmail(email);
      return billTo;
    };

    this.getTax = () => {
      const tax = new ApiContracts.ExtendedAmountType();
      tax.setAmount('0');
      tax.setName('level2 tax name');
      tax.setDescription('level2 tax');
      return tax;
    };

    this.getOrderDetails = (orderInfo) => {
      const { invoiceNumber, description } = orderInfo;
      const orderDetails = new ApiContracts.OrderType();
      orderDetails.setInvoiceNumber(invoiceNumber);
      orderDetails.setDescription(description);
      return orderDetails;
    };

    this.getPaymentType = async (cardInfo) => {
      const paymentType = new ApiContracts.PaymentType();
      const creditType = !cardInfo.routingNumber;
      if (creditType) {
        const { year, month } = cardInfo;
        let { cardNumber, cvc } = cardInfo;
        if (cardInfo.paymentMethodId) {
          const methods = await clientPaymentMethodRepository.getClientPaymentMethodById(cardInfo.paymentMethodId);
          if (!methods || methods.paymentMethod !== 0) throw new Error(`card info is not complete in getPaymentType()`);
          cardNumber = methods.creditCard.cardNumber;
          cvc = methods.creditCard.cvc;
        }

        const creditCard = new ApiContracts.CreditCardType();
        creditCard.setCardNumber(cardNumber.replace(/\s/g, ''));
        creditCard.setExpirationDate(`${month}${year}`);
        creditCard.setCardCode(cvc);
        paymentType.setCreditCard(creditCard);
      } else {
        // eslint-disable-next-line no-unused-vars
        const { routingNumber, bankName, accountNumber, companyName, personalData, account } = cardInfo;
        const bankAccountType = new ApiContracts.BankAccountType();
        bankAccountType.setAccountType(ApiContracts.BankAccountTypeEnum.SAVINGS);
        bankAccountType.setRoutingNumber(routingNumber);
        const bankAccountNum = Math.floor(Math.random() * 9999999999) + 10000;
        bankAccountType.setAccountNumber(bankAccountNum.toString());
        bankAccountType.setNameOnAccount(personalData && personalData.nickname ? `${personalData.nickname}` : companyName);
        bankAccountType.setBankName(bankName);
        paymentType.setBankAccount(bankAccountType);
      }

      return paymentType;
    };
  }

  static async getUnsetteledTransactions(apiLoginKey, transactionKey) {
    const finalResponse = { status: false, list: [] };
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginKey);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    const getRequest = new ApiContracts.GetUnsettledTransactionListRequest();

    const paging = new ApiContracts.Paging();
    paging.setLimit(10);
    paging.setOffset(1);

    const sorting = new ApiContracts.TransactionListSorting();
    sorting.setOrderBy(ApiContracts.TransactionListOrderFieldEnum.ID);
    sorting.setOrderDescending(true);

    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setStatus(ApiContracts.TransactionGroupStatusEnum.PENDINGAPPROVAL);
    getRequest.setPaging(paging);
    getRequest.setSorting(sorting);

    const ctrl = new ApiControllers.GetUnsettledTransactionListController(getRequest.getJSON());

    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);

    return new Promise((resolve, reject) => {
      ctrl.execute(function () {
        const apiResponse = ctrl.getResponse();

        const response = new ApiContracts.GetUnsettledTransactionListResponse(apiResponse);

        logger.info(JSON.stringify(response, null, 2));

        if (response != null) {
          if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
            if (response.getTransactions() != null) {
              const transactions = response.getTransactions().getTransaction();
              // eslint-disable-next-line no-plusplus
              for (let i = 0; i < transactions.length; i++) {
                finalResponse.list.push(transactions[i]);
                logger.info(`Transaction Id : ${transactions[i].getTransId()}`);
                logger.info(`Transaction Status : ${transactions[i].getTransactionStatus()}`);
                logger.info(`Amount Type : ${transactions[i].getAccountType()}`);
                logger.info(`Settle Amount : ${transactions[i].getSettleAmount()}`);
              }
            }
            finalResponse.status = true;
            logger.info(`Message Code : ${response.getMessages().getMessage()[0].getCode()}`);
            logger.info(`Message Text : ${response.getMessages().getMessage()[0].getText()}`);
            finalResponse.message = response.getMessages().getMessage()[0].getText();
          } else {
            logger.info(`Result Code: ${response.getMessages().getResultCode()}`);
            logger.info(`Error Code: ${response.getMessages().getMessage()[0].getCode()}`);
            logger.info(`Error message: ${response.getMessages().getMessage()[0].getText()}`);
            finalResponse.status = false;
            finalResponse.message = response.getMessages().getMessage()[0].getText();
          }
        } else {
          logger.info('Null Response.');
          finalResponse.status = false;
          finalResponse.message = 'Null Response.';
          reject(finalResponse);
        }

        resolve(finalResponse);
      });
    });
  }

  async createCustomerProfile(customerProfile, cardInfo, apiLogin, secretKey) {
    const customerAuthorizeResponse = {
      status: false,
      message: ``,
    };
    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);

    const customerProfileType = new ApiContracts.CustomerProfileType();
    customerProfileType.setMerchantCustomerId(customerProfile.customerId);
    if (customerProfile.email) customerProfileType.setEmail(customerProfile.email); // Customer's email address
    // customerProfileType.setDescription(customerProfile.description);

    const createRequest = new ApiContracts.CreateCustomerProfileRequest();
    createRequest.setProfile(customerProfileType);
    createRequest.setMerchantAuthentication(merchantAuthenticationType);

    const ctrl = new ApiControllers.CreateCustomerProfileController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);
    return new Promise((resolve) => {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
        if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
          customerAuthorizeResponse.status = true;
          customerAuthorizeResponse.customerId = response.getCustomerProfileId();
          resolve(customerAuthorizeResponse);
        } else {
          customerAuthorizeResponse.status = false;
          customerAuthorizeResponse.statusCode = response.getMessages().getMessage()[0].getCode();
          customerAuthorizeResponse.message = response.getMessages().getMessage()[0].getText();
          const regex = /ID (\d+)/;
          const match = customerAuthorizeResponse.message.match(regex);

          if (match) {
            const id = match[1];
            customerAuthorizeResponse.customerProfileId = id;
          } else {
            logger.warn('ID not found in the error message.');
          }
          resolve(customerAuthorizeResponse);
        }
      });
    });
  }

  async getCustomerProfile(customerId, apiLogin, secretKey) {
    const customerAuthorizeResponse = {
      status: false,
      message: ``,
    };
    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);

    const getRequest = new ApiContracts.GetCustomerProfileRequest();
    getRequest.setCustomerProfileId(customerId); // Set customer profile id
    getRequest.setMerchantAuthentication(merchantAuthenticationType);

    const ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint); // Change to sandbox for testing
    return new Promise((resolve) => {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);
        if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
          customerAuthorizeResponse.status = true;
          customerAuthorizeResponse.profile = response.getProfile(); // Get the customer profile information
          resolve(customerAuthorizeResponse);
        } else {
          customerAuthorizeResponse.status = false;
          customerAuthorizeResponse.statusCode = response.getMessages().getMessage()[0].getCode();
          customerAuthorizeResponse.message = response.getMessages().getMessage()[0].getText();
          resolve(customerAuthorizeResponse);
        }
      });
    });
  }

  async createCustomerPaymentProfile(customerProfileId, cardInfo, apiLogin, secretKey) {
    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);
    const paymentType = await this.getPaymentType(cardInfo);
    const paymentProfile = new ApiContracts.CustomerPaymentProfileType();
    const billTo = this.getBillingTo(cardInfo, {});
    paymentProfile.setBillTo(billTo);
    paymentProfile.setPayment(paymentType);

    const createRequest = new ApiContracts.CreateCustomerPaymentProfileRequest();
    createRequest.setCustomerProfileId(customerProfileId);
    createRequest.setPaymentProfile(paymentProfile);
    createRequest.setValidationMode(ApiContracts.ValidationModeEnum.LIVEMODE);

    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    const controller = new ApiControllers.CreateCustomerPaymentProfileController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    controller.setEnvironment(endpoint); // Change to sandbox for testing

    return new Promise((resolve) => {
      controller.execute(() => {
        const apiResponse = controller.getResponse();
        const response = new ApiContracts.CreateCustomerPaymentProfileResponse(apiResponse);

        if (response != null && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
          resolve({
            status: true,
            paymentProfileId: response.getCustomerPaymentProfileId(),
          });
        } else {
          resolve({
            status: false,
            code: response.getMessages().getMessage()[0].getCode(),
            paymentProfileId: response.getCustomerPaymentProfileId(),
            message: response.getMessages().getMessage()[0].getText(),
          });
        }
      });
    });
  }

  async authorizeValidateTransaction(cardInfo, orderInfo, apiLogin, secretKey) {
    const finalResponse = {
      status: false,
      messages: [],
    };

    const { amount } = orderInfo;
    // eslint-disable-next-line no-unused-vars

    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);
    const paymentType = await this.getPaymentType(cardInfo);
    const billTo = this.getBillingTo(cardInfo, orderInfo);
    const transactionSettings = this.getTransactionSettings();

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount.toFixed(2));
    transactionRequestType.setBillTo(billTo);
    transactionRequestType.setTransactionSettings(transactionSettings);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    logger.info(JSON.stringify(createRequest.getJSON(), null, 2));

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);
    // Defaults to sandbox
    // ctrl.setEnvironment(SDKConstants.endpoint.production);
    return new Promise((resolve) => {
      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new ApiContracts.CreateTransactionResponse(apiResponse);

          // pretty print response
          logger.info(JSON.stringify(response, null, 2));

          if (response != null) {
            if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
              if (response.getTransactionResponse().getMessages() != null) {
                logger.info(
                  `Successfully created transaction with Transaction ID: ${response.getTransactionResponse().getTransId()}`
                );
                logger.info(`Response Code: ${response.getTransactionResponse().getResponseCode()}`);
                logger.info(`Message Code: ${response.getTransactionResponse().getMessages().getMessage()[0].getCode()}`);
                logger.info(
                  `Description: ${response.getTransactionResponse().getMessages().getMessage()[0].getDescription()}`
                );
                finalResponse.status = true;
                finalResponse.transactionId = response.getTransactionResponse().getTransId();
                finalResponse.messages.push(
                  response.getTransactionResponse().getMessages().getMessage()[0].getDescription()
                );
              } else {
                logger.info('Failed Transaction.');
                if (response.getTransactionResponse().getErrors() != null) {
                  logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                  logger.info(
                    `Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`
                  );
                  finalResponse.status = false;
                  finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                }
                resolve(finalResponse);
                return;
              }
            } else {
              logger.info('Failed Transaction. ');
              if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
                logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                logger.info(`Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
              } else {
                logger.info(`Error Code: ${response.getMessages().getMessage()[0].getCode()}`);
                logger.info(`Error message: ${response.getMessages().getMessage()[0].getText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getMessages().getMessage()[0].getText());
              }
              resolve(finalResponse);
              return;
            }
          } else {
            logger.info('Null Response.');
            finalResponse.status = false;
            finalResponse.messages.push('Null Response');
            resolve(finalResponse);
            return;
          }
          resolve(finalResponse);
        } catch (err) {
          finalResponse.status = false;
          finalResponse.messages.push(err.message);
          logger.error(err.message);
          resolve(finalResponse);
        }
      });
    });
  }

  async voidTransaction(transactionId, apiLogin, secretKey) {
    const finalResponse = {
      status: false,
      messages: [],
    };

    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
    transactionRequestType.setRefTransId(transactionId);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    logger.info(JSON.stringify(createRequest.getJSON(), null, 2));

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);
    // Defaults to sandbox
    // ctrl.setEnvironment(SDKConstants.endpoint.production);
    return new Promise((resolve) => {
      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new ApiContracts.CreateTransactionResponse(apiResponse);

          // pretty print response
          logger.info(JSON.stringify(response, null, 2));

          if (response != null) {
            if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
              if (response.getTransactionResponse().getMessages() != null) {
                logger.info(
                  `Successfully created transaction with Transaction ID: ${response.getTransactionResponse().getTransId()}`
                );
                logger.info(`Response Code: ${response.getTransactionResponse().getResponseCode()}`);
                logger.info(`Message Code: ${response.getTransactionResponse().getMessages().getMessage()[0].getCode()}`);
                logger.info(
                  `Description: ${response.getTransactionResponse().getMessages().getMessage()[0].getDescription()}`
                );
                finalResponse.status = true;
                finalResponse.transactionId = response.getTransactionResponse().getTransId();
                finalResponse.messages.push(
                  response.getTransactionResponse().getMessages().getMessage()[0].getDescription()
                );
              } else {
                logger.info('Failed Transaction.');
                if (response.getTransactionResponse().getErrors() != null) {
                  logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                  logger.info(
                    `Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`
                  );
                  finalResponse.status = false;
                  finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                }
                resolve(finalResponse);
                return;
              }
            } else {
              logger.info('Failed Transaction. ');
              if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
                logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                logger.info(`Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
              } else {
                logger.info(`Error Code: ${response.getMessages().getMessage()[0].getCode()}`);
                logger.info(`Error message: ${response.getMessages().getMessage()[0].getText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getMessages().getMessage()[0].getText());
              }
              resolve(finalResponse);
              return;
            }
          } else {
            logger.info('Null Response.');
            finalResponse.status = false;
            finalResponse.messages.push('Null Response');
            resolve(finalResponse);
            return;
          }
          resolve(finalResponse);
        } catch (err) {
          finalResponse.status = false;
          finalResponse.messages.push(err.message);
          logger.error(err.message);
          resolve(finalResponse);
        }
      });
    });
  }

  async authorizeTransaction(cardInfo, orderInfo, apiLogin, secretKey) {
    const finalResponse = {
      status: false,
      messages: [],
    };

    const { amount } = orderInfo;
    // eslint-disable-next-line no-unused-vars

    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);
    const paymentType = await this.getPaymentType(cardInfo);
    const orderDetails = this.getOrderDetails(orderInfo);
    const tax = this.getTax(orderInfo);
    const billTo = this.getBillingTo(cardInfo, orderInfo);
    const lineItems = this.getLineItems(orderInfo);
    const transactionSettings = this.getTransactionSettings(orderInfo);

    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount.toFixed(2));
    transactionRequestType.setLineItems(lineItems);
    transactionRequestType.setOrder(orderDetails);
    transactionRequestType.setTax(tax);
    transactionRequestType.setBillTo(billTo);
    transactionRequestType.setTransactionSettings(transactionSettings);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    logger.info(JSON.stringify(createRequest.getJSON(), null, 2));

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);
    // Defaults to sandbox
    // ctrl.setEnvironment(SDKConstants.endpoint.production);
    return new Promise((resolve) => {
      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new ApiContracts.CreateTransactionResponse(apiResponse);

          // pretty print response
          logger.info(JSON.stringify(response, null, 2));

          if (response != null) {
            if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
              if (response.getTransactionResponse().getMessages() != null) {
                logger.info(
                  `Successfully created transaction with Transaction ID: ${response.getTransactionResponse().getTransId()}`
                );
                logger.info(`Response Code: ${response.getTransactionResponse().getResponseCode()}`);
                logger.info(`Message Code: ${response.getTransactionResponse().getMessages().getMessage()[0].getCode()}`);
                logger.info(
                  `Description: ${response.getTransactionResponse().getMessages().getMessage()[0].getDescription()}`
                );
                finalResponse.status = true;
                finalResponse.transactionId = response.getTransactionResponse().getTransId();
                finalResponse.messages.push(
                  response.getTransactionResponse().getMessages().getMessage()[0].getDescription()
                );
              } else {
                logger.info('Failed Transaction.');
                if (response.getTransactionResponse().getErrors() != null) {
                  logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                  logger.info(
                    `Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`
                  );
                  finalResponse.status = false;
                  finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                }
                resolve(finalResponse);
                return;
              }
            } else {
              logger.info('Failed Transaction. ');
              if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
                logger.info(`Error Code: ${response.getTransactionResponse().getErrors().getError()[0].getErrorCode()}`);
                logger.info(`Error message: ${response.getTransactionResponse().getErrors().getError()[0].getErrorText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getTransactionResponse().getErrors().getError()[0].getErrorText());
              } else {
                logger.info(`Error Code: ${response.getMessages().getMessage()[0].getCode()}`);
                logger.info(`Error message: ${response.getMessages().getMessage()[0].getText()}`);
                finalResponse.status = false;
                finalResponse.messages.push(response.getMessages().getMessage()[0].getText());
              }
              resolve(finalResponse);
              return;
            }
          } else {
            logger.info('Null Response.');
            finalResponse.status = false;
            finalResponse.messages.push('Null Response');
            resolve(finalResponse);
            return;
          }
          resolve(finalResponse);
        } catch (err) {
          finalResponse.status = false;
          finalResponse.messages.push(err.message);
          logger.error(err.message);
          resolve(finalResponse);
        }
      });
    });
  }

  async validateKey(apiLogin, secretKey) {
    const finalResponse = {
      status: false,
      messages: [],
    };

    const merchantAuthenticationType = this.getMerchantAuthenticationType(apiLogin, secretKey);
    const createRequest = new ApiContracts.GetMerchantDetailsRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);

    const ctrl = new ApiControllers.GetMerchantDetailsController(createRequest.getJSON());
    const endpoint = config.authorize_prod_endpoint ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
    ctrl.setEnvironment(endpoint);
    // Defaults to sandbox
    // ctrl.setEnvironment(SDKConstants.endpoint.production);
    return new Promise((resolve) => {
      ctrl.execute(function () {
        try {
          const apiResponse = ctrl.getResponse();

          const response = new ApiContracts.GetMerchantDetailsResponse(apiResponse);

          // pretty print response
          logger.info(JSON.stringify(response, null, 2));

          if (response != null) {
            if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
              finalResponse.status = true;
              resolve(finalResponse);
              return;
            }
            finalResponse.status = false;
            resolve(finalResponse);

            return;
          }
          logger.info('Null Response.');
          finalResponse.status = false;
          finalResponse.messages.push('Null Response');
          resolve(finalResponse);
        } catch (err) {
          finalResponse.status = false;
          finalResponse.messages.push(err.message);
          logger.error(err.message);
          resolve(finalResponse);
        }
      });
    });
  }
}

module.exports = AuthorizeService;
