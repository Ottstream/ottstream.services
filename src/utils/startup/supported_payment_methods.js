const { paymentMethodRepository } = require('../../repository');
const logger = require('../logger/logger');
const { paymentMethods } = require('../../config/payment_methods');

const ensurePaymentMethodExists = async (methodKey) => {
  logger.info(`Checking payment method exists ${methodKey}`);
  const currentMethod = await paymentMethodRepository.getPaymentMethodByKey(methodKey);
  if (!currentMethod) {
    logger.info(`Creating payment method with (${methodKey})`);
    // eslint-disable-next-line no-unused-vars
    const addedMethod = await paymentMethodRepository.createPaymentMethod({
      name: methodKey,
      identifier: methodKey,
      oneTime: false,
    });
  }
};

const checkPaymentMethods = async () => {
  for (let i = 0; i < paymentMethods.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await ensurePaymentMethodExists(paymentMethods[i]);
  }
};

module.exports = {
  checkPaymentMethods,
};
