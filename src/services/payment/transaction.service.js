const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const {
  ottProviderPaymentGatewayRepository,
  ottProviderEmailRepository,
  invoiceRepository,
  clientRepository,
  ottProviderRepository,
  transactionRepository,
} = repositories;
const serviceCollection = require('../service_collection');
// const ottProviderRepository = require('../../repository/ottprovider/ottprovider.repository');
// const clientRepository = require('../../repository/client/client.repository');
// const invoiceRepository = require('../../repository/payment/invoice.repository');
// const ottProviderEmailRepository = require('../../repository/ottprovider/ottprovider_email.repository');
// const ottProviderPaymentGatewayRepository = require('../../repository/ottprovider/ottprovider_payment_gateway.repository');

const SquareService = require('./merchant/square.service');

class TransactionService {
  constructor() {
    logger.info(`TransactionService() initiated`);
  }

  static hideCardNumber(value) {
    if (value && value.length && value.length >= 4) {
      // return `****-****-****-${value.substring(0, 4)}`; first 4 digits
      return `${value.replace(/.(?=.{4})/g, '*')}`;
    }
    return value;
  }

  static hideCVC(value) {
    if (value && value.length && value.length >= 3) {
      return `${value.replace(/./g, '*')}`;
    }
  }

  static hideCard(value) {
    const result = { ...value };
    if (result.id) {
      if (value.cardNumber) {
        result.cardNumber = TransactionService.hideCardNumber(result.cardNumber);
      }
      if (value.cvc) {
        result.cvc = TransactionService.hideCVC(result.cvc);
      }
    }
    return result;
  }

  static async createPayInvoiceWithCardTransaction(invoice, paymentMethodId, payObject, totalAmount, fee, amount, user) {
    logger.info(`invoice: ${invoice.id}`);
    const response = { status: true, messages: [] };
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const validCard = await PaymentObjectValidator.validateCreditCardObject(
      invoice.from_type,
      invoice.from_type === 2 ? invoice.from_client : invoice.from_provider,
      payObject.creditCard ? payObject.creditCard : payObject,
      paymentMethodId
    );
    if (!validCard.status) {
      response.status = false;
      response.messages.push(validCard.message);
    }
    if (response.status) {
      const obj = {
        from_type: invoice.from_type,
        from_client: invoice.from_type === 2 ? invoice.from_client : null,
        from_provider: invoice.from_type === 1 ? invoice.from_provider : null,
        sourcePay: {
          ...validCard.card,
          cloverId: payObject.cloverId,
          squareId: payObject.squareId,
          squarePaymentId: payObject.squarePaymentId,
        },
        to_type: invoice.to_type,
        to_client: invoice.to_type === 2 ? invoice.to_client : null,
        to_provider: invoice.to_type === 1 ? invoice.to_provider : null,
        amount,
        fee,
        totalAmount,
        source_type: 'PAY_INVOICE',
        payloadExecuted: false,
        invoice,
        autopayment: invoice.autopayment,
        provider: invoice.provider,
        payload: {
          type: 'INVOICE',
        },
        transaction_type: invoice.to_type === 2 ? 'A_TO_C' : 'C_TO_A',
        state: 2,
      };
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createPayInvoiceWithCheckTransaction(invoice, check, amount, user) {
    const response = { status: true, messages: [] };
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const validCard = await PaymentObjectValidator.validateCheck(
      invoice.from_type,
      invoice.from_type === 1 ? invoice.from_provider : invoice.from_client,
      check,
      null
    );
    if (!validCard.status) {
      response.status = false;
      response.messages = response.messages.concat(validCard.messages);
    }
    if (response.status) {
      const obj = {
        from_type: invoice.from_type,
        from_client: invoice.from_type === 2 ? invoice.from_client : null,
        from_provider: invoice.from_type === 1 ? invoice.from_provider : null,
        sourcePay: TransactionService.hideCard(validCard.card),
        amount,
        totalAmount: amount,
        to_type: invoice.to_type,
        to_client: invoice.to_type === 2 ? invoice.to_client : null,
        to_provider: invoice.to_type === 1 ? invoice.to_provider : null,
        source_type: 'PAY_INVOICE',
        payloadExecuted: false,
        provider: invoice.provider,
        invoice,
        payload: {
          type: 'INVOICE',
        },
        transaction_type: 'CH_TO_B',
        state: 2,
      };
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createPayInvoiceWithMoneyOrderTransaction(invoice, moneyOrder, bankName, amount, user) {
    const response = { status: true, messages: [] };
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const validCard = await PaymentObjectValidator.validateCheck(
      invoice.from_type,
      invoice.from_type === 1 ? invoice.from_provider : invoice.from_client,
      moneyOrder,
      bankName
    );
    if (!validCard.status) {
      response.status = false;
      response.messages = response.messages.concat(validCard.messages);
    }
    if (response.status) {
      const obj = {
        from_type: invoice.from_type,
        from_client: invoice.from_type === 2 ? invoice.from_client : null,
        from_provider: invoice.from_type === 1 ? invoice.from_provider : null,
        sourcePay: validCard.card,
        amount,
        totalAmount: amount,
        to_type: invoice.to_type,
        to_client: invoice.to_type === 2 ? invoice.to_client : null,
        to_provider: invoice.to_type === 1 ? invoice.to_provider : null,
        source_type: 'PAY_INVOICE',
        payloadExecuted: false,
        provider: invoice.provider,
        invoice,
        payload: {
          type: 'INVOICE',
        },
        transaction_type: 'MO_TO_B',
        state: 2,
      };
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createPayInvoiceWithBalanceTransaction(invoice, amount, user) {
    const obj = {
      from_type: invoice.from_type,
      from_client: invoice.from_type === 2 ? invoice.from_client : null,
      from_provider: invoice.from_type === 1 ? invoice.from_provider : null,
      to_type: invoice.to_type,
      to_client: invoice.to_type === 2 ? invoice.to_client : null,
      to_provider: invoice.to_type === 1 ? invoice.to_provider : null,
      amount,
      totalAmount: amount,
      source_type: 'PAY_INVOICE',
      provider: invoice.provider,
      payloadExecuted: false,
      invoice,
      payload: {
        type: 'INVOICE',
      },
      transaction_type: 'B_TO_B',
      state: 2,
    };
    return transactionRepository.createTransaction(obj, user);
  }

  static async createPayInvoiceWithCashTransaction(invoice, amount, user) {
    const response = { status: true, messages: [] };
    if (response.status) {
      const obj = {
        from_type: invoice.from_type,
        from_client: invoice.from_type === 2 ? invoice.from_client : null,
        from_provider: invoice.from_type === 1 ? invoice.from_provider : null,
        to_type: invoice.to_type,
        to_client: invoice.to_type === 2 ? invoice.to_client : null,
        to_provider: invoice.to_type === 1 ? invoice.to_provider : null,
        amount,
        totalAmount: amount,
        source_type: 'PAY_INVOICE',
        provider: invoice.provider,
        payloadExecuted: false,
        invoice,
        payload: {
          type: 'INVOICE',
        },
        transaction_type: 'CASH',
        state: 2,
      };
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createInvoiceExecutionTransaction(invoice, from, to, amount, isRefund, user) {
    const obj = {
      from_type: 1,
      from_client: null,
      from_provider: from,
      to_type: 1,
      to_client: null,
      to_provider: to,
      amount,
      totalAmount: amount,
      isRefund,
      source_type: 'EXECUTE_INVOICE',
      payloadExecuted: false,
      invoice,
      provider: invoice.provider,
      payload: {
        type: 'INVOICE',
      },
      transaction_type: 'B_TO_B',
      state: 2,
    };
    return transactionRepository.createTransaction(obj, user);
  }

  static async createPayBalanceWithCardOrTransferTransaction(
    fromType,
    from,
    toType,
    to,
    amount,
    cardOrBankTransfer,
    card,
    paymentMethodId,
    user
  ) {
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const response = { status: true, messages: [] };
    const fromToValid = await PaymentObjectValidator.validateFromTo(fromType, from, toType, to);
    let validCard;
    if (cardOrBankTransfer === 0) {
      validCard = await PaymentObjectValidator.validateCreditCardObject(fromType, from, card, paymentMethodId);
    } else {
      validCard = await PaymentObjectValidator.validateBankTransferObject(fromType, from, card, paymentMethodId);
    }
    if (!fromToValid.status) {
      response.status = false;
      response.messages.push(fromToValid.message);
    }
    if (!validCard.status) {
      response.status = false;
      response.messages.push(validCard.message);
    }
    if (response.status) {
      const obj = {
        from_type: fromType,
        from_client: fromType === 2 ? from : null,
        from_provider: fromType === 1 ? from : null,
        to_type: toType,
        sourcePay: TransactionService.hideCard(validCard.card),
        to_client: toType === 2 ? to : null,
        to_provider: toType === 1 ? to : null,
        amount,
        totalAmount: amount,
        source_type: 'PAY_BALANCE',
        payloadExecuted: false,
        payload: {
          type: 'TRANSFER',
          to_type: fromType,
          to_client: fromType === 2 ? from : null,
          to_provider: fromType === 1 ? from : null,
          transaction_type: 'TO_B',
        },
        transaction_type: 'C_TO_A',
        state: 2,
      };
      obj.provider = user.provider.id;
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createAddCreditTransaction(fromType, from, toType, to, amount, user) {
    const obj = {
      from_type: fromType,
      from_client: fromType === 2 ? from : null,
      from_provider: fromType === 1 ? from : null,
      to_type: toType,
      to_client: toType === 2 ? to : null,
      to_provider: toType === 1 ? to : null,
      amount,
      totalAmount: amount,
      source_type: 'ADD_CREDIT',
      payloadExecuted: true,
      transaction_type: 'B_TO_B',
      state: 2,
    };

    obj.provider = user.provider.id;
    return transactionRepository.createTransaction(obj, user);
  }

  static async createAddBalanceTransaction(fromType, from, toType, to, amount, user) {
    const obj = {
      from_type: fromType,
      from_client: fromType === 2 ? from : null,
      from_provider: fromType === 1 ? from : null,
      to_type: toType,
      to_client: toType === 2 ? to : null,
      to_provider: toType === 1 ? to : null,
      amount,
      totalAmount: amount,
      source_type: 'ADD_BALANCE',
      payloadExecuted: true,
      // transaction_type: user?.provider?.type === 0 ? 'TO_B' : 'B_TO_B',
      transaction_type: 'TO_B',
      state: 2,
    };
    obj.provider = user.provider.id;
    return transactionRepository.createTransaction(obj, user);
  }

  static async createPayBalanceWithCheckTransaction(fromType, from, toType, to, amount, checkNumber, user) {
    const response = { status: true, messages: [] };
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const fromToValid = await PaymentObjectValidator.validateFromTo(fromType, from, toType, to);
    const validCard = await PaymentObjectValidator.validateCheck(fromType, from, checkNumber, null);
    if (!fromToValid.status) {
      response.status = false;
      response.messages.push(fromToValid.message);
    }
    if (!validCard.status) {
      response.status = false;
      response.messages = response.messages.concat(validCard.messages);
    }
    if (response.status) {
      const obj = {
        from_type: fromType,
        from_client: fromType === 2 ? from : null,
        from_provider: fromType === 1 ? from : null,
        to_type: toType,
        sourcePay: {
          bankTransfer: validCard.bankTransfer,
          checkNumber: TransactionService.hideCard(validCard.card),
        },
        to_client: toType === 2 ? to : null,
        to_provider: toType === 1 ? to : null,
        amount,
        totalAmount: amount,
        source_type: 'PAY_BALANCE',
        payloadExecuted: false,
        payload: {
          type: 'TRANSFER',
          to_type: fromType,
          to_client: fromType === 2 ? from : null,
          to_provider: fromType === 1 ? from : null,
          transaction_type: 'TO_B',
        },
        transaction_type: 'CH_TO_B',
        state: 2,
      };
      obj.provider = user.provider.id;
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async createVoidTransaction(fromType, from, toType, to, amount, cardOrBankAccount, card, user) {
    const response = { status: true, messages: [] };
    const PaymentObjectValidator = serviceCollection.getService('paymentObjectValidator', true);
    const fromToValid = await PaymentObjectValidator.validateFromTo(fromType, from, toType, to);
    let validCard;
    if (cardOrBankAccount === 0)
      validCard = await PaymentObjectValidator.validateCreditCardObject(fromType, from, card, null);
    if (cardOrBankAccount === 1)
      validCard = await PaymentObjectValidator.validateBankTransferObject(fromType, from, card, null);
    if (!fromToValid.status) {
      response.status = false;
      response.messages.push(fromToValid.message);
    }
    if (!validCard.status) {
      response.status = false;
      response.messages.push(validCard.message);
    }
    if (response.status) {
      const payload = {};
      if (cardOrBankAccount === 0) payload.cardNumber = validCard.card.cardNumber;
      if (cardOrBankAccount === 1) payload.routingNumber = validCard.card.routingNumber;
      const obj = {
        from_type: fromType,
        from_client: fromType === 2 ? from : null,
        from_provider: fromType === 1 ? from : null,
        to_type: toType,
        sourcePay: TransactionService.hideCard(validCard.card),
        to_client: toType === 2 ? to : null,
        to_provider: toType === 1 ? to : null,
        amount,
        totalAmount: amount,
        source_type: 'VOID_TRANSACTION',
        payloadExecuted: true,
        payload,
        transaction_type: 'C_TO_A',
        state: 2,
      };
      obj.provider = user.provider.id;
      response.transaction = await transactionRepository.createTransaction(obj, user);
      if (!response.transaction) {
        response.status = false;
        response.message = 'transaction is null after createTransaction()';
      }
    }
    return response;
  }

  static async executeTransaction(_transaction) {
    let transaction = _transaction;
    transaction.balanceHistory = {};
    if (transaction && transaction.state === 2) {
      if (transaction.transaction_type === 'B_TO_B') {
        const payResponse = await TransactionService.transferBalance(
          transaction.from_type,
          transaction.from_type === 2 ? transaction.from_client : transaction.from_provider,
          transaction.to_type,
          transaction.to_type === 2 ? transaction.to_client : transaction.to_provider,
          transaction.totalAmount,
          transaction.source_type,
          transaction.isRefund
        );
        if (payResponse.status) {
          transaction.state = 1;
          const fromKey = transaction.from_type === 2 ? transaction.from_client : transaction.from_provider;
          const toKey = transaction.to_type === 2 ? transaction.to_client : transaction.to_provider;
          transaction.balanceHistory[fromKey] = {
            balanceBefore: payResponse.fromBalanceBefore,
            balanceAfter: payResponse.fromBalanceAfter,
          };
          transaction.balanceHistory[toKey] = {
            balanceBefore: payResponse.toBalanceBefore,
            balanceAfter: payResponse.toBalanceAfter,
          };
        } else {
          transaction.state = 0;
          transaction.stateMessage = payResponse.messages.toString();
        }
      }
      if (transaction.transaction_type === 'CASH') {
        transaction.state = 1;
      }
      if (transaction.transaction_type === 'TO_B') {
        const payResponse = await TransactionService.transferBalance(
          null,
          null,
          transaction.to_type,
          transaction.to_type === 2 ? transaction.to_client : transaction.to_provider,
          transaction.totalAmount,
          transaction.source_type
        );
        if (payResponse.status) {
          transaction.state = 1;
          const fromKey = transaction.from_type === 2 ? transaction.from_client : transaction.from_provider;
          const toKey = transaction.to_type === 2 ? transaction.to_client : transaction.to_provider;
          transaction.balanceHistory[fromKey] = {
            balanceBefore: payResponse.fromBalaneBefore,
            balanceAfter: payResponse.fromBalanceAfter,
          };
          transaction.balanceHistory[toKey] = {
            balanceBefore: payResponse.toBalaneBefore,
            balanceAfter: payResponse.toBalanceAfter,
          };
        } else {
          transaction.state = 0;
          transaction.stateMessage = payResponse.messages.toString();
        }
      }
      if (transaction.transaction_type === 'C_TO_A') {
        const payResponse = await TransactionService.transferCardBankAccount(transaction);
        transaction.sourcePay = TransactionService.hideCard(transaction.sourcePay, true);
        transaction.sourcePay.merchant = payResponse.merchant;
        if (payResponse.status) {
          transaction.state = 1;
          transaction.transactionId = payResponse.transactionId;
          transaction.voidable = true;
        } else {
          transaction.stateMessage = payResponse.messages.toString();
          transaction.state = 0;
        }
      }
      if (transaction.transaction_type === 'A_TO_C') {
        transaction.stateMessage = `withdraw operation not implemented yet`;
        transaction.state = 0;
      }
      if (transaction.transaction_type === 'CH_TO_B') {
        transaction.state = 1;
      }
      if (transaction.transaction_type === 'MO_TO_B') {
        transaction.state = 1;
      }

      if (transaction.state === 1 && !transaction.payloadExecuted) {
        const { payload } = transaction;
        if (payload) {
          if (payload.type === 'TRANSFER') {
            const payedPayload = await TransactionService.transferBalance(
              null,
              null,
              payload.to_type,
              payload.to_type === 2 ? payload.to_client : payload.to_provider,
              transaction.totalAmount,
              transaction.source_type
            );

            const toKey = transaction.to_type === 2 ? transaction.to_client : transaction.to_provider;
            transaction.balanceHistory[toKey] = {
              balanceBefore: payedPayload.toBalaneBefore,
              balanceAfter: payedPayload.toBalanceAfter,
            };

            transaction.payloadExecuted = payedPayload.status;
            if (!transaction.payloadExecuted) {
              transaction.payloadError = 'error executing transaction';
            }
          }
        }
      }
      transaction.executionDate = new Date();

      transaction = await transactionRepository.updateTransactionById(transaction._id.toString(), transaction);
      if (transaction.state !== 2) {
        // await BroadcastService.broadcastTransaction(transaction);
      }
    }
    return transaction;
  }

  static async cancelTransaction(_transaction) {
    const response = {
      status: false,
      messages: [],
    };
    let transaction = _transaction;
    if (transaction.state !== 1 && transaction.state !== 4) {
      response.status = false;
      response.messages.push(`can not cancel transaction with state ${transaction.state}`);
      return;
    }
    if (transaction.transaction_type === 'B_TO_B') {
      response.status = false;
      response.messages.push(`unsupported transaction type refund ${transaction.transaction_type}`);
    }
    if (transaction.transaction_type === 'TO_B') {
      response.status = false;
      response.messages.push(`unsupported transaction type refund ${transaction.transaction_type}`);
    }
    if (transaction.transaction_type === 'C_TO_A') {
      const payResponse = await TransactionService.refundCardBankAccount(transaction);
      if (payResponse.status) {
        transaction.state = transaction.voidable ? 5 : 3;
        response.status = true;
      } else {
        transaction.stateMessage = payResponse.messages.toString();
        transaction.state = transaction.voidable ? 4 : 6;
        response.status = false;
        response.messages.push(`fail to refund transaction ${transaction.number}`);
      }
    } else {
      response.status = false;
      response.messages.push(`unknown transaction type refund ${transaction.transaction_type}`);
    }
    transaction = await transactionRepository.updateTransactionById(transaction._id.toString(), transaction);
    if (transaction.state !== 2) {
      // await BroadcastService.broadcastTransaction(transaction);
    }
    return response;
  }

  static async refundCardBankAccount(transaction) {
    const response = {
      status: true,
      messages: [],
    };
    const details = await TransactionService.getTransactionDetails(transaction);
    const validationResult = await TransactionService.validateTransactionDetails(details);
    if (!validationResult.status) {
      response.status = false;
      response.messages = validationResult.messages;
    }
    const { paymentGateway } = details;
    // TODO refund to its gateway
    // TODO get selected payment method, not authorize
    if (
      (!paymentGateway.cards || paymentGateway.cards === '' || paymentGateway.cards === 'authorize') &&
      paymentGateway.authorize &&
      paymentGateway.authorize.isValid
    ) {
      const authorizeService = serviceCollection.getService('authorizeService', false);
      const apiLoginId = paymentGateway?.authorize?.apiLoginId;
      const transactionKey = paymentGateway?.authorize?.transactionKey;
      if (apiLoginId && transactionKey) {
        let authorizeTransactionResponse;
        if (
          transaction.source_type === 'VOID_TRANSACTION' ||
          (transaction.source_type === 'PAY_INVOICE' && transaction.voidable)
        ) {
          authorizeTransactionResponse = await authorizeService.voidTransaction(
            transaction.transactionId,
            apiLoginId,
            transactionKey
          );
        } else {
          response.status = false;
          response.messages.push(`unsupported transaction source_type refund: ${transaction.source_type}`);
        }
        if (response.status) {
          response.status = authorizeTransactionResponse.status;
          response.transactionId = authorizeTransactionResponse.transactionId;
          response.messages = response.messages.concat(authorizeTransactionResponse.messages);
        }
      } else {
        response.status = false;
        response.messages.push('destination wrong authorize apiLogin and transaction key');
      }
    } else if (paymentGateway.cards === 'stripe' && paymentGateway.stripe && paymentGateway.stripe.isValid) {
      const StripeService = serviceCollection.getService('stripeService', true);
      const pKey = paymentGateway?.stripe?.publicKey;
      const sKey = paymentGateway?.stripe?.secretKey;
      if (sKey) {
        let stripeTransactionResponse;
        if (
          transaction.source_type === 'VOID_TRANSACTION' ||
          (transaction.source_type === 'PAY_INVOICE' && transaction.voidable)
        ) {
          stripeTransactionResponse = await StripeService.voidTransaction(transaction.transactionId, pKey, sKey);
        } else {
          response.status = false;
          response.messages.push(`unsupported transaction source_type refund: ${transaction.source_type}`);
        }
        if (response.status) {
          response.status = stripeTransactionResponse.status;
          response.transactionId = stripeTransactionResponse.transactionId;
          response.messages = response.messages.concat(stripeTransactionResponse.messages);
        }
      } else {
        response.status = false;
        response.messages.push('destination wrong authorize secret and public key');
      }
    } else if (paymentGateway.cards === 'clover' && paymentGateway.clover && paymentGateway.clover.isValid) {
      const CloverService = serviceCollection.getService('cloverService', true);
      const mId = paymentGateway?.clover?.merchantId;
      const sKey = paymentGateway?.clover?.secretKey;
      if (sKey) {
        let cloverTransactionResponse;
        if (
          transaction.source_type === 'VOID_TRANSACTION' ||
          (transaction.source_type === 'PAY_INVOICE' && transaction.voidable)
        ) {
          cloverTransactionResponse = await CloverService.voidTransaction(transaction.transactionId, sKey, mId);
        } else {
          response.status = false;
          response.messages.push(`unsupported transaction source_type refund: ${transaction.source_type}`);
        }
        if (response.status) {
          response.status = cloverTransactionResponse.status;
          response.transactionId = cloverTransactionResponse.transactionId;
          response.messages = response.messages.concat(cloverTransactionResponse.messages);
        }
      } else {
        response.status = false;
        response.messages.push('destination wrong authorize secret and public key');
      }
    } else if (paymentGateway.cards === 'square' && paymentGateway.square && paymentGateway.square.isValid) {
      const mId = paymentGateway?.square?.merchantId;
      const sKey = paymentGateway?.closquarever?.secretKey;
      if (sKey) {
        let squareTransactionResponse;
        if (
          transaction.source_type === 'VOID_TRANSACTION' ||
          (transaction.source_type === 'PAY_INVOICE' && transaction.voidable)
        ) {
          squareTransactionResponse = await SquareService.voidTransaction(transaction.transactionId, sKey, mId);
        } else {
          response.status = false;
          response.messages.push(`unsupported transaction source_type refund: ${transaction.source_type}`);
        }
        if (response.status) {
          response.status = squareTransactionResponse.status;
          response.transactionId = squareTransactionResponse.transactionId;
          response.messages = response.messages.concat(squareTransactionResponse.messages);
        }
      } else {
        response.status = false;
        response.messages.push('destination wrong authorize secret and public key');
      }
    } else {
      response.status = false;
      response.messages.push('destination unsupported merchant type selected');
    }
    return response;
  }

  static async transferCardBankAccount(transaction) {
    const response = {
      status: false,
      messages: [],
      merchant: '',
    };
    const details = await TransactionService.getTransactionDetails(transaction);
    const validationResult = await TransactionService.validateTransactionDetails(details);
    if (!validationResult.status) {
      response.status = false;
      response.messages = validationResult.messages;
      return response;
    }
    const { invoice, paymentGateway, sourcePay, totalAmount, email, authorize } = details;

    let gateWayKey = 'cards';
    if (transaction.autopayment) gateWayKey = 'autopay';
    // TODO get selected payment method, not authorize
    if (
      paymentGateway &&
      (!paymentGateway[gateWayKey] || paymentGateway[gateWayKey] === '' || paymentGateway[gateWayKey] === 'authorize') &&
      paymentGateway.authorize &&
      paymentGateway.authorize.isValid
    ) {
      response.merchant = 'authorize';
      const authorizeService = serviceCollection.getService('authorizeService');
      const { apiLoginId } = authorize;
      const { transactionKey } = authorize;
      if (apiLoginId && transactionKey) {
        let authorizeTransactionResponse;
        if (transaction.source_type === 'VOID_TRANSACTION') {
          authorizeTransactionResponse = await authorizeService.authorizeValidateTransaction(
            sourcePay,
            {
              email,
              amount: totalAmount,
            },
            apiLoginId,
            transactionKey
          );
        } else {
          authorizeTransactionResponse = await authorizeService.authorizeTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
              invoiceNumber: invoice ? invoice.number : transaction.number,
              description: `${invoice ? 'invoice' : 'transaction'} payment`,
            },
            apiLoginId,
            transactionKey
          );
        }
        response.status = authorizeTransactionResponse.status;
        response.transactionId = authorizeTransactionResponse.transactionId;
        response.messages = response.messages.concat(authorizeTransactionResponse.messages);
      } else {
        response.status = false;
        response.messages.push('destination wrong authorize apiLogin and transaction key');
      }
    } else if (
      paymentGateway &&
      paymentGateway[gateWayKey] === 'stripe' &&
      paymentGateway.stripe &&
      paymentGateway.stripe.isValid
    ) {
      response.merchant = 'stripe';
      const StripeService = serviceCollection.getService('stripeService', true);
      const pKey = paymentGateway?.stripe?.publicKey;
      const sKey = paymentGateway?.stripe?.secretKey;
      if (sKey) {
        let stripeTransactionResponse;
        if (transaction.source_type === 'VOID_TRANSACTION') {
          stripeTransactionResponse = await StripeService.authorizeValidateTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
            },
            pKey,
            sKey
          );
        } else {
          stripeTransactionResponse = await StripeService.authorizeTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
              invoiceNumber: invoice ? invoice.number : transaction.number,
              description: `${invoice ? 'invoice' : 'transaction'} payment`,
            },
            pKey,
            sKey
          );
        }
        response.status = stripeTransactionResponse.status;
        response.transactionId = stripeTransactionResponse.transactionId;
        response.messages = response.messages.concat(stripeTransactionResponse.messages);
      } else {
        response.status = false;
        response.messages.push('destination wrong stripe secret key');
      }
    } else if (
      paymentGateway &&
      paymentGateway[gateWayKey] === 'clover' &&
      paymentGateway.clover &&
      paymentGateway.clover.isValid
    ) {
      response.merchant = 'clover';
      const CloverService = serviceCollection.getService('cloverService', true);
      const merchantId = paymentGateway?.clover?.merchantId;
      const sKey = paymentGateway?.clover?.secretKey;
      if (sKey) {
        let cloverTransactionResponse;
        if (transaction.source_type === 'VOID_TRANSACTION') {
          cloverTransactionResponse = await CloverService.authorizeValidateTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
            },
            sKey,
            merchantId
          );
        } else {
          cloverTransactionResponse = await CloverService.authorizeValidateTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
              invoiceNumber: invoice ? invoice.number : transaction.number,
              description: `${invoice ? 'invoice' : 'transaction'} payment`,
            },
            sKey,
            merchantId
          );
        }
        response.status = cloverTransactionResponse.status;
        response.transactionId = cloverTransactionResponse.transactionId;
        response.messages = response.messages.concat(cloverTransactionResponse.messages);
      } else {
        response.status = false;
        response.messages.push('destination wrong stripe secret key');
      }
    } else if (
      paymentGateway &&
      paymentGateway[gateWayKey] === 'square' &&
      paymentGateway.square &&
      paymentGateway.square.isValid
    ) {
      response.merchant = 'square';
      const merchantId = paymentGateway?.square?.merchantId;
      const sKey = paymentGateway?.square?.secretKey;
      if (sKey) {
        let squareTransactionResponse;
        if (transaction.source_type === 'VOID_TRANSACTION') {
          squareTransactionResponse = await SquareService.authorizeValidateTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
            },
            sKey,
            merchantId
          );
        } else {
          squareTransactionResponse = await SquareService.authorizeValidateTransaction(
            sourcePay,
            {
              amount: totalAmount,
              email,
              invoiceNumber: invoice ? invoice.number : transaction.number,
              description: `${invoice ? 'invoice' : 'transaction'} payment`,
            },
            sKey,
            merchantId
          );
        }
        response.status = squareTransactionResponse.status;
        response.transactionId = squareTransactionResponse.transactionId;
        response.messages = response.messages.concat(squareTransactionResponse.messages);
      } else {
        response.status = false;
        response.messages.push('destination wrong stripe secret key');
      }
    } else {
      response.status = false;
      response.messages.push('destination unsupported merchant type selected');
    }
    return response;
  }

  static async transferBalance(fromType, from, toType, to, totalAmount, sourceType, isRefund) {
    const response = { status: false, messages: [] };
    let fromExecuted = false;
    let toExecuted = false;
    let _to = null;
    let _from = null;
    if (fromType === 1) {
      _from = await ottProviderRepository.getOttProviderById(from);
    } else if (fromType === 2) {
      _from = await clientRepository.getClientById(from);
    }
    if (toType === 1) {
      _to = await ottProviderRepository.getOttProviderById(to);
    } else if (toType === 2) {
      _to = await clientRepository.getClientById(to);
    }
    if (_from) {
      // if (_from.balance >= amount) {
      response.fromBalanceBefore = _from.balance;

      if (fromType === 1 && toType === 1 && sourceType === 'EXECUTE_INVOICE' && isRefund) {
        logger.info(`isRefund Transaction balance not minus`);
      } else {
        _from.balance -= totalAmount;
      }
      response.fromBalanceAfter = _from.balance;
      await _from.save();
      fromExecuted = true;
      // }
    }
    if (!from) fromExecuted = true;
    if (_to && fromExecuted) {
      response.toBalanceBefore = _to.balance;

      if (fromType === 1 && toType === 1 && sourceType === 'EXECUTE_INVOICE' && !isRefund) {
        logger.info(`isRefund Transaction balance not plus`);
      } else {
        _to.balance += totalAmount;
      }
      response.toBalanceAfter = _to.balance;
      await _to.save();
      toExecuted = true;
    }
    response.status = toExecuted && fromExecuted;
    return response;
  }

  static async validateTransactionDetails(details) {
    const response = {
      status: true,
      messages: [],
    };

    const { paymentGateway, sourcePay, totalAmount } = details;

    if (!paymentGateway) {
      response.status = false;
      response.messages.push(`destination (your parent) has no payment gateway setup`);
      return response;
    }
    if (!sourcePay) {
      response.status = false;
      response.messages.push(`no source pay for transaction of card type`);
      return response;
    }
    if (!totalAmount) {
      response.status = false;
      response.messages.push(`no totalAmount in transaction details`);
      return response;
    }

    return response;
  }

  static async getTransactionDetails(transaction) {
    let invoice;
    if (transaction.invoice) {
      if (transaction.invoice._id) {
        invoice = transaction.invoice;
      } else {
        invoice = await invoiceRepository.getInvoiceById(transaction.invoice);
      }
    }

    let email = '';
    let _from = null;
    if (transaction.from_type === 1) {
      _from = await ottProviderRepository.getOttProviderById(transaction.from_provider);
      if (_from) {
        const ottEmailAddresses = await ottProviderEmailRepository.getProviderEmails(_from._id.toString());
        if (ottEmailAddresses && ottEmailAddresses.length) {
          email = ottEmailAddresses[0].address;
        }
      }
    } else if (transaction.from_type === 2) {
      _from = await clientRepository.getClientById(transaction.from_client);
      if (_from && _from.emails && _from.emails.length) email = _from.emails[0].email;
    }

    let _to;
    if (transaction.to_type === 1) {
      _to = await ottProviderRepository.getOttProviderById(transaction.to_provider);
    } else if (transaction.to_type === 2) {
      _to = await clientRepository.getClientById(transaction.to_client);
    }
    const to = transaction.to_type === 2 ? transaction.to_client : transaction.to_provider;
    const paymentGateWays = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(to);
    const paymentGateway = paymentGateWays.length ? paymentGateWays[0] : null;
    const apiLoginId = paymentGateway?.authorize?.apiLoginId;
    const transactionKey = paymentGateway?.authorize?.transactionKey;
    return {
      _from,
      email,
      invoice,
      to: transaction.to_type === 2 ? transaction.to_client : transaction.to_provider,
      sourcePay: transaction.sourcePay,
      amount: transaction.amount,
      totalAmount: transaction.totalAmount,
      _to,
      paymentGateway,
      authorize: {
        apiLoginId,
        transactionKey,
      },
    };
  }
}

module.exports = TransactionService;
