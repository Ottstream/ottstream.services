const { paymentImplementationRepository } = require('../../repository');
const logger = require('../logger/logger');
const { paymentImplementations } = require('../../config/payment_implementations');

const ensurePaymentImplementationExists = async (implementationKey) => {
  logger.info(`Checking payment implementation exists ${implementationKey}`);
  const currentImplementation = await paymentImplementationRepository.getPaymentImplementationByKey(implementationKey);
  if (!currentImplementation) {
    logger.info(`Creating payment implementation with (${implementationKey})`);
    // eslint-disable-next-line no-unused-vars
    const addedImplementation = await paymentImplementationRepository.createPaymentImplementation({
      name: implementationKey,
      identifier: implementationKey,
    });
  }
};

const checkPaymentImplementations = async () => {
  for (let i = 0; i < paymentImplementations.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await ensurePaymentImplementationExists(paymentImplementations[i]);
  }
};

module.exports = {
  checkPaymentImplementations,
};
