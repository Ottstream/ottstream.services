// schedule to generate invoices
const cron = require('node-cron');
const logger = require('../logger/logger');
const { creditRepository, ottProviderRepository, clientRepository } = require('../../repository');
const serviceCollection = require('../../services/service_collection');
// const balanceRepository = require('../../repository/payment/balance.repository');

const addCredit = async (providerId, clientId, amount, creditId, balance) => {
  let result;
  if (providerId) {
    // eslint-disable-next-line no-await-in-loop
    result = await ottProviderRepository.addBalance(providerId, amount);
  }
  if (clientId) {
    // eslint-disable-next-line no-await-in-loop
    result = await clientRepository.addBalance(clientId, amount);
  }
  // eslint-disable-next-line no-await-in-loop
  await creditRepository.updateCreditById(creditId, {
    paymentState: 2,
  });
  const res = serviceCollection.getService('socketService');
  res.send(result.id, 'user', {
    balance,
  });
};

const payCredit = async (providerId, clientId, amount, creditId, balance) => {
  let result;
  if (providerId) {
    // eslint-disable-next-line no-await-in-loop
    result = await ottProviderRepository.addBalance(providerId, -amount);
  }
  if (clientId) {
    // eslint-disable-next-line no-await-in-loop
    result = await clientRepository.addBalance(clientId, -amount);
  }
  // eslint-disable-next-line no-await-in-loop
  await creditRepository.updateCreditById(creditId, {
    paymentState: 1,
    state: 0,
  });
  const res = serviceCollection.getService('socketService');
  res.send(result.id, 'user', {
    balance,
  });
};

// eslint-disable-next-line no-unused-vars
const processCreditPayments = async () => {
  try {
    const filter = {
      state: 1,
    };
    const creditList = await creditRepository.queryCredits(filter, {});
    if (creditList && creditList.results && creditList.results.length) {
      // eslint-disable-next-line no-restricted-syntax
      for (const result of creditList.results) {
        const now = new Date();
        const payed = result.paymentState;
        const creditState = result.state;
        const startDate = result.creditStartDate;
        const days = result.creditTerm;
        const endDate = new Date(startDate);
        // get end Date
        if (result.days) {
          endDate.setDate(endDate.getDate() + days);
        } else {
          endDate.setMonth(endDate.getMonth() + days);
        }
        if (now >= startDate && now < endDate) {
          if (creditState === 1) {
            if (payed === 2) {
              // eslint-disable-next-line no-await-in-loop
              await addCredit(
                result.providerId ? result.providerId : null,
                result.clientId ? result.clientId : null,
                result.creditAmount,
                result.id
              );
            }
          }
        }
        if (now >= endDate) {
          if (creditState === 1) {
            // eslint-disable-next-line no-await-in-loop
            await payCredit(
              result.providerId ? result.providerId : null,
              result.clientId ? result.clientId : null,
              result.creditAmount,
              result.id
            );
          }
        }
        if (now < startDate) {
          // TODO nothing
        }
      }
    }
  } catch (exception) {
    logger.error(exception, true);
  }
};

const scheduleInvoiceCron = async () => {
  cron.schedule('*/2 * * * *', async () => {
    await processCreditPayments();
    //
    // await processSubscriptionPayments();
  });
};

module.exports = {
  scheduleInvoiceCron,
};
