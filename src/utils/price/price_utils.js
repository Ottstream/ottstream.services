const { repositories } = require('ottstream.dataaccess');
const logger = require('../logger/logger');

const { priceGroupRepositor, discountRepository } = repositories;
// const priceGroupRepository = require('../../repository/price/price_group.repository');

function roundFloat(val) {
  return parseFloat(parseFloat(val).toFixed(2));
}

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(date.getMonth() + months);
  return result;
};

// eslint-disable-next-line no-unused-vars
const intervalToDays = (interval, intervalType) => {
  return intervalType === 'm' ? interval * 30 : interval;
};

const getDatesIntervalDiff = (startDate, endDate) => {
  const diffTime = endDate - startDate;
  return diffTime / (1000 * 60 * 60 * 24);
};

// eslint-disable-next-line no-unused-vars
const intervalNameToDays = (interval) => {
  if (interval.length >= 2) {
    const int = parseInt(interval.substring(0, interval.length - 1), 10);
    const intType = interval.charAt(interval.length - 1);
    if (intType === 'd') {
      return int;
    }
    return int * 30;
  }
  return null;
};

const findNearestIntervalInList = (list, interval) => {
  let days = -1;
  let finalInterval;
  const findInterval = intervalNameToDays(interval);

  list.forEach((listInterval) => {
    // eslint-disable-next-line no-use-before-define
    const daysOfInterval = intervalNameToDays(listInterval);
    if (days === -1 || Math.abs(daysOfInterval - findInterval) < days) {
      days = Math.abs(daysOfInterval - findInterval);
      finalInterval = listInterval;
    }
  });
  return finalInterval;
};

const calculateDateIntervalPriceByFixedPrice = (fromDate, startDate, endDate, rangePrice) => {
  const partDay = getDatesIntervalDiff(fromDate, endDate);
  const fullDay = getDatesIntervalDiff(startDate, endDate);
  // const multiplied = Decimal(partDay).mul(rangePrice);
  // const curPrice = Decimal(multiplied).div(fullDay).toNumber();
  // console.log(`${partDay} ${fullDay} ${rangePrice} ${curPrice}`);
  return (partDay * rangePrice) / fullDay;
};

// eslint-disable-next-line no-unused-vars
const calculateIntervalPriceByIntervalWithoutType = (interval, price, calculateInterval) => {
  const itemDays = intervalNameToDays(interval);
  const days = intervalNameToDays(calculateInterval);
  return (days * price) / itemDays;
};

// eslint-disable-next-line no-unused-vars
const calculateIntervalPriceByInterval = (interval, intervalType, priceItem) => {
  let priceItemInterval = priceItem.interval;
  let calculateInterval = interval;

  if (priceItem.intervalType !== intervalType) {
    if (priceItem.intervalType === 'm') {
      priceItemInterval = intervalToDays(priceItem.interval, 'm');
    } else {
      calculateInterval = intervalToDays(interval, 'm');
    }
  }
  return (calculateInterval * priceItem.price) / priceItemInterval;
};

// eslint-disable-next-line no-unused-vars
const calculateDaysPriceByPriceItem = (priceItem, days) => {
  const itemDays = intervalNameToDays(priceItem.interval + priceItem.intervalType);

  const multiplied = days * priceItem.price;
  return multiplied / itemDays;
};

const calculateSubscriptionStopPrice = (subscription, untilDate = new Date()) => {
  const response = {
    totalPrice: 0,
    toResaleTotalPrice: 0,
    startDate: untilDate,
  };
  const stopStartDate = untilDate;
  if (subscription && subscription.updates.length) {
    const rangePricesToCalculate = subscription.updates.filter((r) => r.endDate > stopStartDate);
    // eslint-disable-next-line no-restricted-syntax
    for (const rangePrice of rangePricesToCalculate) {
      // TODO fix price calculation not only hash intervals take
      const calculatedTotal = calculateDateIntervalPriceByFixedPrice(
        // TODO continue here to see what func is it
        stopStartDate < rangePrice.startDate ? rangePrice.startDate : stopStartDate,
        rangePrice.startDate,
        rangePrice.endDate,
        rangePrice.totalPrice - rangePrice.stopPrice
      );
      if (calculatedTotal && !calculatedTotal.isNaN) response.totalPrice += calculatedTotal;
      const calculatedResaleTotal = calculateDateIntervalPriceByFixedPrice(
        stopStartDate < rangePrice.startDate ? rangePrice.startDate : stopStartDate,
        rangePrice.startDate,
        rangePrice.endDate,
        rangePrice.toResaleTotalPrice - rangePrice.toResaleStopPrice
      );
      if (calculatedResaleTotal) response.toResaleTotalPrice += calculatedResaleTotal;
    }
  }
  if (response.totalPrice) {
    response.totalPrice = -roundFloat(response.totalPrice);
  }
  if (response.totalPrice) {
    response.toResaleTotalPrice = -roundFloat(response.toResaleTotalPrice);
  }
  logger.info(`subscription stop price: ${response.totalPrice} ${response.toResaleTotalPrice}`);
  return response;
};

const calculateSubscriptionCurrentMonthPrice = (subscription, _location, _package, room) => {
  let calculatedPrice = 0;
  if (subscription && subscription.currentPrices.length) {
    // eslint-disable-next-line no-restricted-syntax
    const priceGroupDiscountFiltered = subscription.currentPrices.filter((r) => r.priceGroup);
    const currentPriceFiltered = priceGroupDiscountFiltered.length
      ? priceGroupDiscountFiltered[0]
      : subscription.currentPrices[0];
    const oneRoomMonthPrice = currentPriceFiltered.priceItems.filter(
      (r) => r.intervalType === 'm' && r.interval === 1 && r.room === 1
    );
    const currentRoomMonthPrice = currentPriceFiltered.priceItems.filter(
      (r) => r.intervalType === 'm' && r.interval === 1 && r.room === room
    );
    if (oneRoomMonthPrice.length) {
      if (currentRoomMonthPrice.length) {
        const current = currentRoomMonthPrice[0];
        calculatedPrice = current.price;
      } else {
        const current = oneRoomMonthPrice[0];
        calculatedPrice = current.price * room;
      }
    }
  }
  logger.info(`subscription monthly price: ${calculatedPrice}`);
  return calculatedPrice;
};

// eslint-disable-next-line no-unused-vars
const getIntervalFromString = (interval) => {
  if (interval.length >= 2) {
    return parseInt(interval.substring(0, interval.length - 1), 10);
  }
  return null;
};

// eslint-disable-next-line no-unused-vars
const calculateRoomPriceFromRoomPrices = (roomPrices, room, priceKey = 'price') => {
  const filtered = roomPrices.filter((r) => r.room === room);
  if (filtered.length) {
    return filtered[0][priceKey];
  }
  if (roomPrices.filter((r) => r.room === 1).length) {
    const { price } = roomPrices.filter((r) => r.room === 1)[0];
    return price * room;
  }
  return null;
};

// intervalList is first month then day calculation as day calculation depends on month
const getPackageIntervalPrice = (_package, intervalList, room, clientType, priceGroup, discount) => {
  if (_package && _package.prices && _package.prices.length) {
    let finalPrice = 0;
    let finalPriceExists = false;
    let monthIntervalType;
    let monthInterval;
    intervalList.forEach((currentInterval) => {
      const { interval, intervalType } = currentInterval;

      // eslint-disable-next-line no-restricted-syntax
      const priceGroupDiscountFiltered = _package.prices.filter(
        (r) =>
          // eslint-disable-next-line no-nested-ternary
          (priceGroup ? r.priceGroup && priceGroup._id.toString() === r.priceGroup.toString() : !r.priceGroup) &&
          (discount ? r.discount && discount._id.toString() === r.discount.toString() : !r.discount) &&
          r.clientType === clientType
      );
      // eslint-disable-next-line no-restricted-syntax
      const priceGroupFiltered = _package.prices.filter(
        (r) =>
          // eslint-disable-next-line no-nested-ternary
          (priceGroup ? r.priceGroup && priceGroup._id.toString() === r.priceGroup.toString() : !r.priceGroup) &&
          r.clientType === clientType
      );
      const clientTypeFiltered = _package.prices.filter(
        (r) =>
          // eslint-disable-next-line no-nested-ternary
          !r.discount && !r.priceGroup && r.clientType === clientType
      );

      if (!clientTypeFiltered.length) return null;
      let selectedItem = clientTypeFiltered[0];

      if (priceGroupDiscountFiltered.length) {
        // eslint-disable-next-line prefer-destructuring
        selectedItem = priceGroupDiscountFiltered[0];
      } else if (priceGroupFiltered.length) {
        // eslint-disable-next-line prefer-destructuring
        selectedItem = priceGroupFiltered[0];
      }

      let discountPercent = 0;
      if (
        discount &&
        discount.generalInfo &&
        discount.generalInfo.defaultSalePercent &&
        !priceGroupDiscountFiltered.length
      ) {
        discountPercent = discount.generalInfo.defaultSalePercent;
      }
      // get priceGroup if exists
      let priceGroupPercent = 0;
      if (priceGroup && priceGroup.percent && !priceGroupFiltered.length && !priceGroupDiscountFiltered.length) {
        priceGroupPercent = priceGroup.percent;
      }

      // get lower interval for same time  (only if is array and month exists in array, calculate array days with near)
      const priceItemsWithLowerInterval = selectedItem.priceItems.filter(
        (r) => r.intervalType === intervalType && r.interval <= interval
      );

      let calculateFinalList = [];

      if (!priceItemsWithLowerInterval.length) {
        if (intervalType === 'm') {
          let foundInterval = -1; // get max day interval
          selectedItem.priceItems.forEach((priceItem) => {
            if (priceItem.intervalType === 'd') {
              if (priceItem.interval > foundInterval || foundInterval === -1) {
                foundInterval = priceItem.interval;
              }
            }
          });
          calculateFinalList = selectedItem.priceItems.filter((r) => r.intervalType === 'd' && r.interval === foundInterval);
        } else if (intervalType === 'd') {
          if (intervalList.filter((r) => r.intervalType === 'm').length) {
            calculateFinalList = selectedItem.priceItems.filter(
              (r) => r.intervalType === monthIntervalType && r.interval === monthInterval
            );
          } else if (selectedItem.priceItems.filter((r) => r.intervalType === 'd').length) {
            let diff = -1;
            let foundInterval = 1;
            selectedItem.priceItems.forEach((priceItem) => {
              if (priceItem.intervalType === 'd') {
                if (diff === -1 || Math.abs(priceItem.interval - interval) < diff) {
                  diff = Math.abs(priceItem.interval - interval);
                  foundInterval = priceItem.interval;
                }
              }
            });
            if (foundInterval !== -1) {
              calculateFinalList = selectedItem.priceItems.filter(
                (r) => r.intervalType === 'd' && r.interval === foundInterval
              );
            }
          } else {
            calculateFinalList = selectedItem.priceItems.filter((r) => r.intervalType === 'm' && r.interval === 1);
          }
        }
      } else {
        let foundInterval = -1; // get max day interval
        priceItemsWithLowerInterval.forEach((priceItem) => {
          if (priceItem.interval > foundInterval || foundInterval === -1) {
            foundInterval = priceItem.interval;
          }
        });
        calculateFinalList = priceItemsWithLowerInterval.filter((r) => r.interval === foundInterval);
      }

      if (calculateFinalList.length) {
        const roomPrices = [];
        calculateFinalList.forEach((currentItem) => {
          if (intervalType === 'm') {
            monthIntervalType = currentItem.intervalType;
            monthInterval = currentItem.interval;
          }
          roomPrices.push({
            room: currentItem.room,
            // eslint-disable-next-line no-use-before-define
            price:
              calculateIntervalPriceByInterval(interval, intervalType, currentItem) *
              (1 - priceGroupPercent / 100) *
              (1 - discountPercent / 100),
          });
        });
        finalPriceExists = true;
        finalPrice += calculateRoomPriceFromRoomPrices(roomPrices, room);
      }
    });
    if (!finalPriceExists && intervalList.length) return null;
    if (finalPrice > 0 && finalPrice < 0.1) finalPrice = 0.1;
    return roundFloat(finalPrice);
  }
  return null;
};

// eslint-disable-next-line no-unused-vars
const getMonthPrice = (_package, room, clientType, priceGroup, discount) => {
  return getPackageIntervalPrice(_package, [{ interval: 1, intervalType: 'm' }], room, clientType, priceGroup, discount);
};

// eslint-disable-next-line no-unused-vars
const calculateDateIntervalPrice = (
  _package,
  intervalStartDate,
  intervalEndDate,
  room,
  clientType,
  priceGroup,
  discount
) => {
  if (_package && _package.prices && _package.prices.length) {
    let months = 0;
    let days = 0;
    let monthDiff = intervalEndDate.getMonth() - intervalStartDate.getMonth();
    const yearDiff = intervalEndDate.getFullYear() - intervalStartDate.getFullYear();
    if (yearDiff > 0) {
      monthDiff += intervalStartDate.getMonth() - (intervalStartDate.getMonth() - yearDiff * 12);
    }
    if (monthDiff === 0) {
      days = getDatesIntervalDiff(intervalStartDate, intervalEndDate);
    } else {
      const monthAddedStartDate = addMonths(intervalStartDate, monthDiff);
      if (Math.abs(monthAddedStartDate.getDate() - intervalEndDate.getDate()) !== 0) {
        if (
          monthAddedStartDate.getDate() > intervalEndDate.getDate() &&
          monthAddedStartDate.getMonth() === intervalEndDate.getMonth()
        ) {
          months = monthDiff - 1;
          days = getDatesIntervalDiff(addMonths(intervalStartDate, months), intervalEndDate);
        } else {
          months = monthDiff;
          days = getDatesIntervalDiff(addMonths(intervalStartDate, months), intervalEndDate);
        }
      } else {
        days = 0;
        months = monthDiff;
      }
    }
    const calculateArray = [];
    if (months) {
      calculateArray.push({
        interval: months,
        intervalType: 'm',
      });
    }
    if (days) {
      calculateArray.push({
        interval: days,
        intervalType: 'd',
      });
    }

    return getPackageIntervalPrice(_package, calculateArray, room, clientType, priceGroup, discount);
  }
  return null;
};

// eslint-disable-next-line no-unused-vars
const getIntervalTypeFromString = (interval) => {
  if (interval.length >= 2) {
    return interval.charAt(interval.length - 1);
  }
  return null;
};

// eslint-disable-next-line no-unused-vars
const getPackageDefaultPrice = (_package, clientType) => {
  if (_package && _package.prices.length) {
    // eslint-disable-next-line no-restricted-syntax
    const priceGroupDiscountFiltered = _package.prices.filter(
      (r) => !r.priceGroup && !r.discount && r.clientType === clientType
    );
    return priceGroupDiscountFiltered.length ? priceGroupDiscountFiltered[0] : null;
  }
  return null;
};

// eslint-disable-next-line no-unused-vars
const addPackageDefaultPrice = (_packageOptions, clientType, interval, intervalType, prices) => {
  if (_packageOptions) {
    // eslint-disable-next-line no-restricted-syntax
    const priceGroupDiscountFiltered = _packageOptions.prices.filter(
      (r) => !r.priceGroup && !r.discount && r.clientType === clientType
    );
    if (!priceGroupDiscountFiltered.length && intervalToDays(interval, intervalType) <= 30) {
      const items = [];
      prices.forEach((item, index) => {
        items.push({
          room: index + 1,
          interval,
          intervalType,
          price: prices[index],
        });
      });

      _packageOptions.prices.push({
        priceItems: items,
        clientType,
      });
    } else if (priceGroupDiscountFiltered.length && !priceGroupDiscountFiltered[0].priceItems.length) {
      // eslint-disable-next-line no-param-reassign
      _packageOptions.prices = _packageOptions.prices.filter(
        (r) => !(!r.priceGroup && !r.discount && r.clientType === clientType)
      );

      return addPackageDefaultPrice(_packageOptions, clientType, interval, intervalType, prices);
    }
  }
  return _packageOptions;
};

// eslint-disable-next-line no-unused-vars
const addPackagePrice = (_packageOptions, clientType, interval, intervalType, prices) => {
  if (_packageOptions) {
    // eslint-disable-next-line no-restricted-syntax
    const priceGroupDiscountFiltered = _packageOptions.prices.filter(
      (r) => !r.priceGroup && !r.discount && r.clientType === clientType
    );
    if (!priceGroupDiscountFiltered.length && intervalToDays(interval, intervalType) <= 30) {
      const items = [];
      prices.forEach((item, index) => {
        items.push({
          room: index + 1,
          interval,
          intervalType,
          price: prices[index],
        });
      });

      _packageOptions.prices.push({
        priceItems: items,
        clientType,
      });
    } else if (
      priceGroupDiscountFiltered.length &&
      !priceGroupDiscountFiltered[0].priceItems.filter((r) => r.interval === interval && r.intervalType === intervalType)
        .length
    ) {
      // precalculate for this interval
      let days = 0;
      let filteredIntervalName;

      // TODO change price
      const selectedItem = priceGroupDiscountFiltered[0];
      selectedItem.priceItems.forEach((priceItem) => {
        const daysOfInterval = intervalNameToDays(priceItem.interval + priceItem.intervalType);
        if (days === 0 || daysOfInterval < days) {
          days = daysOfInterval;
          filteredIntervalName = priceItem.interval + priceItem.intervalType;
        }
      });

      const filteredInterval = selectedItem.priceItems.filter((r) => r.interval + r.intervalType === filteredIntervalName);

      prices.forEach((item, index) => {
        let currentPrice = 0;
        const currentRoomFiltered = filteredInterval.filter((r) => r.room === index + 1);
        const oneRoomFiltered = filteredInterval.filter((r) => r.room === 1);

        if (currentRoomFiltered.length) {
          currentPrice = currentRoomFiltered[0].price;
        } else if (oneRoomFiltered.length) {
          currentPrice = calculateRoomPriceFromRoomPrices(filteredInterval, index + 1);
        }
        const recommendedPrice = calculateIntervalPriceByIntervalWithoutType(
          // TODO refactor recommend
          filteredIntervalName,
          currentPrice,
          interval + intervalType
        );

        priceGroupDiscountFiltered[0].priceItems.push({
          room: index + 1,
          interval,
          intervalType,
          price: prices[index] > 0 ? prices[index] : recommendedPrice,
        });
      });
    }
  }
  return _packageOptions;
};

// eslint-disable-next-line no-unused-vars
const editPackagePrices = (_packageOptions, clientType, priceGroup, percent, discount, editPrice, removePrices) => {
  if (_packageOptions) {
    // eslint-disable-next-line no-restricted-syntax
    const priceGroupDiscountFiltered = _packageOptions.prices.filter(
      (r) =>
        // eslint-disable-next-line no-nested-ternary
        (priceGroup ? r.priceGroup && r.priceGroup.toString() === priceGroup && r.percent === percent : !r.priceGroup) &&
        (discount ? r.discount && r.discount.toString() === discount : !r.discount) &&
        r.clientType === clientType
    );

    if (!priceGroupDiscountFiltered.length) {
      const items = [];
      if (editPrice && editPrice.length) {
        editPrice.forEach((item) => {
          item.priceItems.forEach((priceItem) => {
            items.push({
              interval: getIntervalFromString(item.interval),
              intervalType: getIntervalTypeFromString(item.interval),
              price: priceItem.price,
              room: priceItem.room,
            });
          });
        });
      }
      _packageOptions.prices.push({
        priceItems: items,
        clientType,
        discount,
        priceGroup,
        percent,
      });
    } else {
      const currentGroup = priceGroupDiscountFiltered[0];

      if (editPrice && editPrice.length) {
        editPrice.forEach((item) => {
          item.priceItems.forEach((priceItem) => {
            const filtered = currentGroup.priceItems.filter(
              (r) =>
                r.interval === getIntervalFromString(item.interval) &&
                r.intervalType === getIntervalTypeFromString(item.interval) &&
                r.room === priceItem.room
            );
            if (filtered.length) {
              filtered[0].price = priceItem.price;
            } else {
              currentGroup.priceItems.push({
                interval: getIntervalFromString(item.interval),
                intervalType: getIntervalTypeFromString(item.interval),
                room: priceItem.room,
                price: priceItem.price,
              });
            }
          });
        });
      }
      if (removePrices && removePrices.length) {
        removePrices.forEach((item) => {
          currentGroup.priceItems = currentGroup.priceItems.filter(
            (r) =>
              !(
                r.interval === getIntervalFromString(item.interval) &&
                r.intervalType === getIntervalTypeFromString(item.interval)
              )
          );
        });
      }
    }
  }
  return _packageOptions;
};

// eslint-disable-next-line no-unused-vars
const getPackagePriceTable = async (_packageOptions, priceGroup, discount, clientType) => {
  const list = [];
  let clientTypePrice = null;
  let priceGroupObject = null;
  if (_packageOptions && _packageOptions.prices.length) {
    // get discount if exists
    let discountPercent = 0;
    if (discount) {
      // eslint-disable-next-line no-await-in-loop
      const discountObject = await discountRepository.getDiscountById(discount);
      if (discountObject && discountObject.generalInfo && discountObject.generalInfo.defaultSalePercent) {
        // eslint-disable-next-line no-unused-vars
        discountPercent = discountObject.generalInfo.defaultSalePercent;
      }
    }
    // get priceGroup if exists
    let priceGroupPercent = 0;
    if (priceGroup) {
      // eslint-disable-next-line no-await-in-loop
      priceGroupObject = await priceGroupRepository.getPriceGroupById(priceGroup);
      if (priceGroupObject && priceGroupObject.percent) {
        // eslint-disable-next-line no-unused-vars
        priceGroupPercent = priceGroupObject.percent;
      }
    }
    const clientTypeFiltered = _packageOptions.prices.filter(
      (r) =>
        // eslint-disable-next-line no-nested-ternary
        !r.discount && !r.priceGroup && r.clientType === clientType
    );
    if (clientTypeFiltered.length) {
      const priceRows = {};
      // eslint-disable-next-line prefer-destructuring
      clientTypePrice = clientTypeFiltered[0];
      // eslint-disable-next-line no-restricted-syntax
      clientTypePrice.priceItems.forEach((item) => {
        if (typeof priceRows[item.interval + item.intervalType] === 'undefined') {
          priceRows[item.interval + item.intervalType] = [];
        }
        priceRows[item.interval + item.intervalType].push(item);
      });
      let priceGroupFilteredPrice = null;
      if (priceGroup || discount) {
        const priceGroupDiscountFiltered = _packageOptions.prices.filter(
          (r) =>
            // eslint-disable-next-line no-nested-ternary
            (priceGroup
              ? r.priceGroup && r.priceGroup.toString() === priceGroup && r.percent === priceGroupObject.percent
              : !r.priceGroup) &&
            (discount ? r.discount && r.discount.toString() === discount : !r.discount) &&
            r.clientType === clientType
        );
        if (priceGroupDiscountFiltered.length) {
          // eslint-disable-next-line prefer-destructuring
          priceGroupFilteredPrice = priceGroupDiscountFiltered[0];
        }
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const key in priceRows) {
          const currentPriceRows = priceRows[key];
          const existsInFilter = priceGroupFilteredPrice
            ? priceGroupFilteredPrice.priceItems.filter((k) => k.interval + k.intervalType === key)
            : [];
          if (existsInFilter.length) {
            // eslint-disable-next-line no-loop-func
            currentPriceRows.forEach((priceRowItem) => {
              const currentFilterItem = existsInFilter.filter(
                (a) =>
                  a.interval === priceRowItem.interval &&
                  a.room === priceRowItem.room &&
                  a.intervalType === priceRowItem.intervalType
              )[0];
              if (currentFilterItem.room === priceRowItem.room) {
                // eslint-disable-next-line no-param-reassign
                priceRowItem.price = currentFilterItem.price;
              }
            });
          } else {
            currentPriceRows.forEach((priceRowItem) => {
              // eslint-disable-next-line no-param-reassign
              priceRowItem.price = priceRowItem.price * (1 - priceGroupPercent / 100) * (1 - discountPercent / 100);
            });
          }
        }
      }
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const i in priceRows) {
        const cur = {
          md: i,
          priceGroup: priceGroupObject,
          rooms: [],
        };
        // eslint-disable-next-line no-restricted-syntax,no-unused-vars,guard-for-in
        for (const j in priceRows[i]) {
          cur.rooms.push({
            room: parseInt(j, 10) + 1,
            id: priceRows[i][j]._id,
            price: priceRows[i][j].price,
          });
        }
        list.push(cur);
      }
    }
  }
  return list;
};

const getMonthlyPayments = (startDate) => {
  const now = new Date();
  const result = new Date(startDate);
  const month = now.getMonth();
  const currentMonth = result.getMonth();
  if (currentMonth && currentMonth === month) {
    return currentMonth;
  }
};

const addUTCDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const addUTCYears = (date, years) => {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
};

// sets the start date of the previous filter to -5 years
const expiredYear = (date) => {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + 5);
  return result;
};

const dateDiffDays = (date1, date2) => {
  // eslint-disable-next-line camelcase
  const diffInTime = date2.getTime() - date1.getTime();
  // eslint-disable-next-line camelcase
  return diffInTime / (1000 * 3600 * 24);
};

module.exports = {
  calculateSubscriptionStopPrice,
  calculateDateIntervalPriceByFixedPrice,
  calculateIntervalPriceByIntervalWithoutType,
  calculateRoomPriceFromRoomPrices,
  calculateIntervalPriceByInterval,
  findNearestIntervalInList,
  calculateDateIntervalPrice,
  getDatesIntervalDiff,
  getIntervalFromString,
  getIntervalTypeFromString,
  getMonthlyPayments,
  intervalNameToDays,
  calculateSubscriptionCurrentMonthPrice,
  getPackageDefaultPrice,
  addPackageDefaultPrice,
  addPackagePrice,
  getPackagePriceTable,
  getMonthPrice,
  addUTCDays,
  addMonths,
  dateDiffDays,
  expiredYear,
  intervalToDays,
  editPackagePrices,
  roundFloat,
  addUTCYears,
};
