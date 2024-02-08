const stripeObject = require('stripe');
const logger = require('../../../utils/logger/logger');

class StripeService {
  constructor() {
    logger.info(`StripeService() initiated`);
  }

  static async validateKey(secretKey) {
    const response = {
      status: false,
      messages: [],
    };
    const stripe = stripeObject(secretKey);

    //
    try {
      response.balance = await stripe.balance.retrieve();
      response.status = true;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }

    return response;
  }

  static async voidTransaction(transactionId, apiLogin, secretKey) {
    const response = {
      status: false,
      messages: [],
    };
    const stripe = stripeObject(secretKey);
    //
    try {
      //
      const CreateIntent = await stripe.paymentIntents.cancel(transactionId);
      response.status = CreateIntent.status;
      response.transactionId = CreateIntent.id;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }
    return response;
  }

  static async getBalance(pKey, sKey) {
    const response = {
      status: false,
      messages: [],
    };
    const stripe = stripeObject(sKey);
    //
    try {
      response.balance = await stripe.balance.retrieve();
      response.status = true;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }

    return response;
  }

  static async payoutTransaction(cardInfo, orderInfo, apiLogin, secretKey) {
    const response = {
      status: false,
      messages: [],
    };
    const currency = 'usd';
    const stripe = stripeObject(secretKey);
    //
    try {
      const balanceResponse = await StripeService.getBalance(apiLogin, secretKey);
      if (!balanceResponse.status) {
        response.messages = response.messages.concat(balanceResponse.messages);
        return response;
      }
      if (typeof balanceResponse.balance.available === 'undefined' || !typeof balanceResponse.balance.available.length) {
        response.status = false;
        response.messages.push(`no available balance on your parent account to payout`);
        return response;
      }
      //
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardInfo.cardNumber,
          exp_month: cardInfo.month,
          exp_year: cardInfo.year,
          cvc: cardInfo.cvc,
        },
        billing_details: {
          address: {
            postal_code: cardInfo.billingAddress.zip,
          },
          name: cardInfo.cardholderName,
          phone: cardInfo.billingAddress.phone?.number,
          email: 'test@mail.ru',
        },
      });

      // const source = await stripe.createSource(
      //   {
      //     number: cardInfo.cardNumber,
      //     exp_month: cardInfo.month,
      //     exp_year: cardInfo.year,
      //     cvc: cardInfo.cvc,
      //   },
      //   {
      //     address: {
      //       postal_code: cardInfo.billingAddress.zip,
      //     },
      //     name: cardInfo.cardholderName,
      //     phone: cardInfo.billingAddress.phone?.number,
      //     email: 'test@mail.ru',
      //   }
      // );
      const CreateIntent = await stripe.payouts.create({
        amount: orderInfo.amount * 100,
        currency,
        method: 'instant',
        destination: paymentMethod.id,
        // confirmation_method: 'manual',
        // confirm: true,
      });
      response.status = CreateIntent.status;
      response.transactionId = CreateIntent.id;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }
    return response;
  }

  static async authorizeTransaction(cardInfo, orderInfo, apiLogin, secretKey) {
    const response = {
      status: false,
      messages: [],
    };
    const stripe = stripeObject(secretKey);
    //
    try {
      //
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardInfo.cardNumber,
          exp_month: cardInfo.month,
          exp_year: cardInfo.year,
          cvc: cardInfo.cvc,
        },
        billing_details: {
          address: {
            postal_code: cardInfo.billingAddress.zip,
          },
          name: cardInfo.cardholderName,
          phone: cardInfo.billingAddress.phone?.number,
          email: 'test@mail.ru',
        },
      });
      const CreateIntent = await stripe.paymentIntents.create({
        amount: orderInfo.amount * 100,
        currency: 'usd',
        payment_method: paymentMethod.id,
        confirmation_method: 'manual',
        confirm: true,
      });
      response.status = CreateIntent.status;
      response.transactionId = CreateIntent.id;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }
    return response;
  }

  static async authorizeValidateTransaction(cardInfo, orderInfo, apiLogin, secretKey) {
    const response = {
      status: false,
      messages: [],
    };
    const stripe = stripeObject(secretKey);
    //
    try {
      //
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardInfo.cardNumber,
          exp_month: cardInfo.month,
          exp_year: cardInfo.year,
          cvc: cardInfo.cvc,
        },
        billing_details: {
          address: {
            postal_code: cardInfo.billingAddress.zip,
          },
          name: cardInfo.cardholderName,
          phone: cardInfo.billingAddress.phone?.number,
          email: 'test@mail.ru',
        },
      });
      const CreateIntent = await stripe.paymentIntents.create({
        amount: orderInfo.amount * 100,
        currency: 'usd',
        payment_method: paymentMethod.id,
        confirmation_method: 'manual',
        confirm: false,
      });
      response.status = CreateIntent.status;
      response.transactionId = CreateIntent.id;
    } catch (exception) {
      response.status = false;
      response.messages.push(exception?.raw?.message);
    }
    return response;
  }
}

module.exports = StripeService;
