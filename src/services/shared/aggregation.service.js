const logger = require('../../utils/logger/logger');

class AggregationService {
  constructor() {
    logger.info(`AggregationService() initiated`);
  }

  // copy here
  /*

  filter examples
    range number  -> amountMin: Joi.number(), amountMax: Joi.number(),
    range date ->  dateFrom: Joi.date(), dateTo: Joi.date()
    by id -> providerId: Joi.string().custom(objectId)
    by multiply ids -> priceGroups: Joi.array().items(Joi.string().allow(''))
    by multiply numbers -> paymentStatus: Joi.array().items(Joi.number().allow(null))
    by multiply strings -> paymentMethod: Joi.array().items(Joi.string().allow('')),
    by number -> state: Joi.number()
    by string -> search: Joi.string()
    by boolean -> isBlocked: Joi.boolean()
    by date -> timezone: Joi.boolean() // TODO - from invoice filters
   */
  static getRangeNumber(amountMin, amountMax) {
    const match = {};
    const rangeMatch = {};
    match.$or = [];
    rangeMatch.$and = [];

    if (typeof amountMin !== 'undefined' && typeof amountMax !== 'undefined') {
      rangeMatch.$and.amountMin = { $gte: amountMin };
      rangeMatch.$and.amountMax = { $lte: amountMax };
    } else if (typeof amountMin !== 'undefined') {
      match.$or.amountMin = { $gte: amountMin };
    } else if (typeof amountMax !== 'undefined') {
      match.$or.amountMax = { $lte: amountMax };
    }
    if (!match.$or.length) delete match.$or;
    if (!rangeMatch.$and.length) delete rangeMatch.$and;
    return { match, rangeMatch }; // TODO this test
  }

  static getRangeDate(dateFrom, dateTo) {
    const match = {};
    const rangeMatch = {};
    match.$or = [];
    rangeMatch.$and = [];

    if (typeof dateFrom !== 'undefined' && typeof dateTo !== 'undefined') {
      rangeMatch.$and.dateFrom = { $gte: dateFrom };
      rangeMatch.$and.amountMax = { $lte: dateTo };
    } else if (typeof dateFrom !== 'undefined') {
      match.$or.amountMin = { $gte: dateFrom };
    } else if (typeof dateTo !== 'undefined') {
      match.$or.amountMax = { $lte: dateTo };
    }
    if (!match.$or.length) delete match.$or;
    if (!rangeMatch.$and.length) delete rangeMatch.$and;
    return { match, rangeMatch }; // TODO this test
  }
}
module.exports = AggregationService;
