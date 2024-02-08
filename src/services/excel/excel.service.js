/* eslint-disable prefer-template */
/* eslint-disable prettier/prettier */
/* eslint-disable prefer-const */
/* eslint-disable array-callback-return */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-fallthrough */
/* eslint-disable default-case */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-case-declarations */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
const excel = require('node-excel-export');
const logger = require('../../utils/logger/logger');

class ExcelService {
  constructor() {
    logger.info(`ExcelService() initiated`);
  }

  // eslint-disable-next-line class-methods-use-this
  exportListByUserSettings(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      if (!isDefault && settingsSortListIsValid) {
        // eslint-disable-next-line no-restricted-syntax
        for (const columnOrder of settingsSortList) {
          // eslint-disable-next-line prefer-const
          let { key, isShow } = columnOrder;
          if (key === 'aEnable') {
            key = 'services';
          }
          if (typeof row[key] !== 'undefined' && isShow) {
            list.push({
              value: typeof row[key] !== 'object' ? row[key] : JSON.stringify(row[key]),
              key,
              name: columnOrder.title ?? columnOrder.name,
            });
          }
        }
      } else {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const columnName in row) {
          list.push({
            value: typeof row[columnName] !== 'object' ? row[columnName] : JSON.stringify(row[columnName]),
            key: columnName,
            name: columnName,
          });
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);

    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        let serviceObjs = {};
        let _sv = '';
        switch (item.name) {
          case 'ID':
            currentItem[item.key] = item.value;
            break;
          case 'Package Name':
            // eslint-disable-next-line no-case-declarations
            const packageName = JSON.parse(item.value).filter((i) => i.lang === 'en');
            currentItem[item.key] = packageName.length ? packageName[0].name : null;
            break;
          case 'Status':
            currentItem[item.key] = item.value === 1 ? 'Enabled' : 'Disabled';
            break;
          case 'Services':
            serviceObjs = JSON.parse(item.value);
            _sv += serviceObjs.aEnable === 1 ? 'Arch' : '';
            if (serviceObjs.tEnable === 1) {
              _sv += serviceObjs.aEnable === 1 ? ', TS' : 'TS';
            } else {
              _sv += '';
            }
            if (serviceObjs.aEnable === 1 || serviceObjs.aEnable === 1) {
              _sv += serviceObjs.vEnable === 1 ? ', VOD' : '';
            } else {
              _sv += '';
            }
            currentItem[item.key] = _sv;
            break;
          case 'Channels':
            currentItem[item.key] = item.value;
            break;

          case 'Clients Direct':
            currentItem[item.key] = item.value;
            break;
          case 'Clients Total':
            currentItem[item.key] = item.value;
            break;
          case 'Type':
            currentItem[item.key] = item.value === 1 ? 'Base' : 'Advanced';
            break;
          case 'Buy Price':
            currentItem[item.key] = item.value > 0 ? item.value : 'Not Defined';
            break;
          case 'Package Expire':
            currentItem[item.key] = item.info?.locations?.length
              ? item.info.locations.map((r) => r.subscriptionExpireDate).toString()
              : ' Not Defined';
            break;
          case 'Client Price':
            currentItem[item.key] = item.value > 0 ? item.value : 'Not Defined';
            break;
          case 'Resale Price':
            currentItem[item.key] = item.value > 0 ? item.value : 'Not Defined';
            break;
          default:
            break;
        }

        const nameLength = item.name?.length ?? 5;
        specification[item.key] = {
          displayName: item.name,
          width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
          headerStyle: {
            fill: {
              fgColor: {
                rgb: 'FFFFFFFF',
              },
            },
            font: {
              color: {
                rgb: 'FF000000',
              },
              sz: 12,
              bold: true,
              underline: false,
            },
          },
        };
      }
      dataset.push(currentItem);
    }

    // Create the excel report.
    // This function will return Buffer
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  // eslint-disable-next-line class-methods-use-this
  exportClientList(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      if (settingsSortListIsValid) {
        // eslint-disable-next-line no-restricted-syntax
        for (const columnOrder of settingsSortList) {
          // eslint-disable-next-line prefer-const
          let { key, isShow } = columnOrder;
          if (isShow) {
            switch (key) {
              case 'firstname':
                currentValue = `${row.personalInfo?.firstname} ${row.personalInfo?.lastname}`;
                break;
              case 'number_id':
                currentValue = row.number_id;
                break;
              case 'packageExpireDate':
                currentValue = row.info?.locations.map((r) => r.subscriptionExpireDate?.toDateString()).toString();
                break;
              case 'status':
                if (row.subscriptionState === 0) currentValue = 'Inactive';
                if (row.subscriptionState === 1) currentValue = 'Pending';
                if (row.subscriptionState === 2) currentValue = 'Cancel';
                if (row.subscriptionState === 3) currentValue = 'Active';
                break;
              case 'provider':
                currentValue = row.provider?.name[0]?.name;
                break;
              case 'reseller':
                currentValue = row.reseller;
                break;
              case 'phone':
                currentValue = row.phones?.filter((i) => i.forCall)[0]?.phone;
                break;
              case 'email':
                currentValue = row.emails?.filter((i) => i.isMain)[0]?.emale;
                break;
              case 'address':
                currentValue = '';
                const _address = row.addresses?.filter((i) => i.forContactInvoice)[0];
                if (_address) {
                  currentValue += `${_address?.address} ,`;
                  currentValue += `${_address?.city} ,`;
                  currentValue += `${_address?.zip}`;
                }
                break;
              case 'priceGroup':
                if ('priceGroupObject' in row) {
                  if (row.priceGroupObject.length !== 0) {
                    currentValue = row.priceGroupObject.name[0].name;
                  } else {
                    currentValue = null;
                  }
                } else if (row?.finance?.priceGroup === null) {
                  currentValue = 'Default';
                } else {
                  currentValue = null;
                }
                break;
              case 'currency':
                currentValue = row.currency;
                break;
              case 'lastPaymentMethod':
                if (row.lastPaymentMethod) {
                  currentValue = `${row.lastPaymentMethod.cardNumber} ${row.lastPaymentMethod.brand}`;
                } else {
                  currentValue = null;
                }
                break;
              case 'monthlyPayments':
                if (row.monthlyPayments) {
                  currentValue = row.monthlyPayments;
                } else {
                  currentValue = null;
                }
                break;
              case 'subscriptionRecurringPayment':
                if (row.subscriptionRecurringPayment) {
                  currentValue = row.subscriptionRecurringPayment;
                } else {
                  currentValue = null;
                }
                break;
              case 'balance':
                currentValue = row.balance;
                break;
              case 'credit':
                if (row.credits?.length > 0) {
                  currentValue = row.credits[row.credits.length - 1].creditAmount;
                } else {
                  currentValue = null;
                }
                break;
              case 'creditStartDate':
                if (row.credits?.length > 0) {
                  currentValue = row.credits[row.credits.length - 1].creditStartDate;
                } else {
                  currentValue = null;
                }
                break;
              case 'creditExpireDate':
                currentValue = row.creditExpireDate;
                break;
              case 'creditTerm':
                if (row.credits?.length > 0) {
                  currentValue = row.credits[row.credits.length - 1].creditTerm;
                } else {
                  currentValue = null;
                }
                break;
              case 'creditAutoextend':
                if (row.credits?.length > 0) {
                  if (row.credits[row.credits.length - 1].creditAutoextend) {
                    currentValue = 'Yes';
                  } else {
                    currentValue = 'No';
                  }
                } else {
                  currentValue = 'No';
                }
                break;
              case 'debt':
                currentValue = row.debt;
                break;
              case 'locationName':
                if (row.locations?.length > 0) {
                  currentValue = row.locations[row.locations.length - 1].locationName;
                } else {
                  currentValue = null;
                }
                break;
              case 'login':
                if (row.locations?.length > 0) {
                  currentValue = row.locations[row.locations.length - 1].login;
                } else {
                  currentValue = null;
                }
                break;
              case 'roomsCount':
                if (row.locations?.length > 0) {
                  currentValue = row.locations[row.locations.length - 1].roomsCount;
                } else {
                  currentValue = null;
                }
                break;
              case 'server':
                if (row.locations?.length > 0) {
                  currentValue = row.locations[row.locations.length - 1].server;
                } else {
                  currentValue = null;
                }
                break;
              case 'timezone':
                if (row.locations?.length > 0) {
                  if (row.locations[row.locations.length - 1].timezone >= 0) {
                    currentValue = `UTC + ${row.locations[row.locations.length - 1].timezone}`;
                  } else {
                    currentValue = `UTC - ${row.locations[row.locations.length - 1].timezone}`;
                  }
                } else {
                  currentValue = null;
                }
                break;
              case 'activePackages':
                if (row.locations?.length > 0) {
                  currentValue = row.locations[row.locations.length - 1].activePackages;
                } else {
                  currentValue = null;
                }
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.title,
            });
          }
        }
      } else {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const columnName in row) {
          list.push({
            value: typeof row[columnName] !== 'object' ? row[columnName] : JSON.stringify(row[columnName]),
            key: columnName,
            name: columnName,
          });
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);

    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        currentItem[item.key] = item.value;
        const nameLength = item.name?.length ?? 5;
        specification[item.key] = {
          displayName: item.name,
          width: nameLength > 6 ? nameLength * 12 : nameLength * 16,
          headerStyle: {
            fill: {
              fgColor: {
                rgb: 'FFFFFFFF',
              },
            },
            font: {
              color: {
                rgb: 'FF000000',
              },
              sz: 12,
              bold: true,
              underline: false,
            },
          },
        };
      }
      dataset.push(currentItem);
    }

    // Create the excel report.
    // This function will return Buffer
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  // eslint-disable-next-line class-methods-use-this
  exportClientBillList(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // if (!isDefault && settingsSortListIsValid) {
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (isShow) {
          switch (key) {
            case 'billNumber':
              currentValue = row.number;
              break;
            case 'clientId':
              currentValue = row.client.length ? row.client[0].number_id : '-';
              break;
            case 'clientName':
              currentValue = row.client.length
                ? `${row.client[0].personalInfo.firstname} ${row.client[0].personalInfo.lastname}`
                : '';
              break;
            case 'clientEmail':
              if (row.client.length && row.client[0].emails.length) {
                if (row.client[0].emails.length) {
                  let isMain = row.client[0].emails.filter((em) => em.isMain)[0];
                  if (isMain) {
                    currentValue = isMain.email;
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
              } else {
                currentValue = '-';
              }
              break;
            case 'clientPhone':
              if (row.client.length && row.client[0].phones.length) {
                if (row.client[0].phones.length) {
                  let forCall = row.client[0].phones.filter((ph) => ph.forCall)[0];
                  if (forCall) {
                    currentValue = forCall.phone;
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
              } else {
                currentValue = '-';
              }
              break;
            case 'clientAddress':
              if (row.client.length && row.client[0].addresses.length) {
                if (row.client[0].addresses.length) {
                  let address = row.client[0].addresses[0];
                  currentValue = `${address.address}, ${address.suite}, ${address.city}, ${address.zip}, ${address.country}`;
                } else {
                  currentValue = '-';
                }
              } else {
                currentValue = '-';
              }
              break;
            case 'balance':
              if (row.client.length) {
                currentValue = row.client[0].balance;
              } else {
                currentValue = '-';
              }
              break;
            case 'debt':
              currentValue = row.client.length ? row.client[0].debt : '-';
              break;
            case 'credit':
              currentValue = row?.client[0]?.currentCredit ? row?.client[0]?.currentCredit : '-';
              break;
            case 'creditStart':
              currentValue = row?.client[0]?.creditStart ? row?.client[0]?.creditStart : '-';
              break;
            case 'creditExpire':
              currentValue = row?.client[0]?.creditExpireDate ? row.client[0].creditExpireDate : '-';
              break;
            case 'locations':
              if (row?.payloadCalculated?.locations && row?.payloadCalculated?.locations.length) {
                let logins = [];
                row?.payloadCalculated?.locations.map((itm) => {
                  logins.push(itm.locationLogin);
                });
                currentValue = logins.toString().split(',');
              } else {
                currentValue = '-';
              }
              break;
            case 'billInfoType':
              const bsm = 'billSentMethod';
              switch (bsm) {
                case 'billInfoType':
                  currentValue = 'billInfoType';
                  break;
                case 'paymentStatus':
                  currentValue = 'paymentStatus';
                  break;
                case 'paymentActonBy':
                  currentValue = row?.billSentMethod === 1 ? 'Provider' : 'Client';
                  break;
                case 'billSentMethod':
                  currentValue = 'billSentMethod';
                  break;
                case 'paymentMethod':
                  currentValue = 'paymentMethod';
                  break;
                default:
                  break;
              }
              break;
            case 'subscriptionAmount':
              currentValue = row.payloadCalculated.totalPrice ? `$${row.payloadCalculated.totalPrice}` : '-';
              break;
            case 'totalAmount':
              currentValue = row.amount > 0 ? `$${row.amount.toFixed(2)}` : 0;
              break;
            case 'timeForPay':
              currentValue = row.timeForPay ? row.timeForPay : '-';
              break;
            case 'autoPayment':
              currentValue = row.autoPayment ? row.autoPayment : '-';
              break;
            case 'paymentStatus':
              switch (row.state) {
                case 1:
                  currentValue = 'Paid';
                  break;
                case 2:
                  currentValue = 'Unpaid';
                  break;
                case 3:
                  currentValue = 'Refunded';
                  break;
                case 4:
                  currentValue = 'Unpaid';
                  break;
                case 5:
                  currentValue = 'Upcoming';
                  break;
                case 6:
                  currentValue = 'Declined';
                  break;
                default:
                  break;
              }
              break;
            case 'transactionId':
              if (row.transaction.length) {
                if (row.transaction && row.transaction.length) {
                  let transactions = [];
                  row.transaction.map((item) => {
                    transactions.push(item.number);
                  });
                  currentValue = transactions.toString().split(',');
                } else {
                  currentValue = '-';
                }
              } else {
                currentValue = '-';
              }
              break;
            case 'paymentActionBy':
              const pab = 'paymentActonBy';
              switch (pab) {
                case 'billInfoType':
                  currentValue = 'billInfoType';
                  break;
                case 'paymentStatus':
                  currentValue = 'paymentStatus';
                  break;
                case 'paymentActonBy':
                  currentValue = row.from_type === 1 ? 'Provider' : 'Client';
                  break;
                case 'billSentMethod':
                  currentValue = 'billSentMethod';
                  break;
                case 'paymentMethod':
                  currentValue = 'paymentMethod';
                  break;
                default:
                  break;
              }
              break;
            case 'providerName':
              currentValue = row.providerName ? row.providerName : '-';
              break;
            case 'paymentActionTime':
              currentValue = row.paymentActionTime ? row?.paymentActionTime : '-';
              break;
            case 'paymentMethod':
              if (row?.client[0]?.payment && row?.client[0]?.payment.length) {
                let last = row?.client[0]?.payment[row?.client[0]?.payment.length - 1];
                let paymentBrand = '';

                if (last.creditCard !== undefined) {
                  paymentBrand = last.creditCard.brand;
                }
                if (last.paymentMethod === 1) {
                  paymentBrand = 'bankAccount';
                }
                currentValue = `${paymentBrand} - ${last.creditCard.cardNumber.substring(0, 4)}`;
              } else {
                currentValue = '-';
              }
              break;
            case 'billSentMethod':
              const bsm1 = 'billSentMethod';
              switch (bsm1) {
                case 'billInfoType':
                  currentValue = 'billInfoType';
                  break;
                case 'paymentStatus':
                  currentValue = 'paymentStatus';
                  break;
                case 'paymentActonBy':
                  currentValue = row?.billSentMethod === 1 ? 'Provider' : 'Client';
                  break;
                case 'billSentMethod':
                  currentValue = 'billSentMethod';
                  break;
                case 'paymentMethod':
                  currentValue = 'paymentMethod';
                  break;
                default:
                  break;
              }
              break;
            case 'lastSentTime':
              currentValue = row?.lastSentTime ? row?.lastSentTime : '-';
              break;
            default:
              break;
          }
          list.push({
            value: currentValue,
            key,
            name: columnOrder.title,
          });
        }
      }
      // } else {
      //   // eslint-disable-next-line guard-for-in,no-restricted-syntax
      //   for (const columnName in row) {
      //     list.push({
      //       value: typeof row[columnName] !== 'object' ? row[columnName] : JSON.stringify(row[columnName]),
      //       key: columnName,
      //       name: columnName,
      //     });
      //   }
      // }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);

    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        currentItem[item.key] = item.value;
        const nameLength = item.name?.length ?? 5;
        specification[item.key] = {
          displayName: item.name,
          width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
          headerStyle: {
            fill: {
              fgColor: {
                rgb: 'FFFFFFFF',
              },
            },
            font: {
              color: {
                rgb: 'FF000000',
              },
              sz: 12,
              bold: true,
              underline: false,
            },
          },
        };
      }
      dataset.push(currentItem);
    }

    // Create the excel report.
    // This function will return Buffer
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportDiscountList(inputList, pnLists, pgLists, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      if (!isDefault && settingsSortListIsValid) {
        // eslint-disable-next-line no-restricted-syntax
        for (const columnOrder of settingsSortList) {
          // eslint-disable-next-line prefer-const
          let { key, isShow } = columnOrder;
          if (isShow) {
            switch (key) {
              case 'name':
                currentValue = row.generalInfo.name;
                break;
              case 'startDate':
                currentValue = row.generalInfo.startDate;
                break;
              case 'endDate':
                currentValue = row.generalInfo.endDate;
                break;
              case 'timeLineStatus':
                currentValue = row.timelineStatus;
                switch (row.timelineStatus) {
                  case 0:
                    currentValue = 'Past';
                    break;
                  case 1:
                    currentValue = 'Current';
                    break;
                  case 2:
                    currentValue = 'Upcoming';
                    break;
                  default:
                    break;
                }
                break;
              case 'type':
                currentValue = row.generalInfo.type === 2 ? 'Client' : 'Provider';
                break;
              case 'priceGroups':
                currentValue = pgLists.get(row.generalInfo._id);
                break;
              case 'status':
                currentValue = row.status;
                break;
              case 'defaultSalePercent':
                currentValue = `${row.generalInfo.defaultSalePercent}%`;
                break;
              case 'packages':
                currentValue = pnLists.get(row.generalInfo._id);
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.title,
            });
          }
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        currentItem[item.key] = item.value;
        const nameLength = item.name?.length ?? 5;
        specification[item.key] = {
          displayName: item.name,
          width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
          headerStyle: {
            fill: {
              fgColor: {
                rgb: 'FFFFFFFF',
              },
            },
            font: {
              color: {
                rgb: 'FF000000',
              },
              sz: 12,
              bold: true,
              underline: false,
            },
          },
        };
      }
      dataset.push(currentItem);
    }

    // Create the excel report.
    // This function will return Buffer
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportEquipmentTable(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (isShow) {
          switch (key) {
            case 'number':
              currentValue = row.number;
              break;
            case 'name':
              currentValue = row.name.filter((i) => i.lang)[0]?.name;
              break;
            case 'description':
              currentValue = row.description;
              break;
            case 'type':
              currentValue = row.typeName[0].en;
              break;
            case 'price':
              currentValue = row.price;
              break;
            case 'enableForSale':
              currentValue = row.enableForSale ? 'Enable' : 'Disable';
              break;
            default:
              break;
          }
          list.push({
            value: currentValue,
            key,
            name: columnOrder.title,
          });
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);

    // The data set should have the following shape (Array of Objects)
    // The order of the keys is irrelevant, it is also irrelevant if the
    // dataset contains more fields as the report is build based on the
    // specification provided above. But you should have all the fields
    // that are listed in the report specification
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        currentItem[item.key] = item.value;
        const nameLength = item.name?.length ?? 5;
        specification[item.key] = {
          displayName: item.name,
          width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
          headerStyle: {
            fill: {
              fgColor: {
                rgb: 'FFFFFFFF',
              },
            },
            font: {
              color: {
                rgb: 'FF000000',
              },
              sz: 12,
              bold: true,
              underline: false,
            },
          },
        };
      }
      dataset.push(currentItem);
    }

    // Create the excel report.
    // This function will return Buffer
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportTransactionList(_data, _result) {
    const styles = {
      firstHead: {
        border: {
          right: { style: 'medium', color: { rgb: '3B0472' } },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        font: {
          bold: true,
        },
      },
      secondHead: {
        width: 100,
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        font: {
          italic: true,
        },
      },
      cellGreen: {
        fill: {
          fgColor: {
            rgb: 'FFEDE9',
          },
        },
        width: 100,
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        font: {
          italic: true,
        },
      },
    };

    let merges = [];
    let heading = [];
    let firstHeading = [];
    let secondHeading = [];
    let prevItemsCount = 1;
    let specification = {};
    let dataset = [];
    let rowValues = {};
    //
    // eslint-disable-next-line no-restricted-syntax
    for (const iterator of _data) {
      const subItemCount = iterator.subList.length;
      merges.push({ start: { row: 1, column: prevItemsCount }, end: { row: 1, column: subItemCount + prevItemsCount - 1 } });
      prevItemsCount += subItemCount;
      firstHeading.push({
        value: iterator.title,
        style: {
          alignment: {
            horizontal: 'center',
            vertical: 'center',
          },
          font: {
            bold: true,
          },
        },
        border: {
          right: {
            style: 'medium',
            color: { rgb: '3B0472' },
          },
        },
      });
      // eslint-disable-next-line no-plusplus
      for (let p = 0; p < subItemCount - 1; p++) {
        firstHeading.push('');
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const sub of iterator.subList) {
        secondHeading.push({ value: sub.title, style: styles.secondHead });
        specification[sub.key] = {
          displayName: sub.title,
          headerStyle: styles.cellGreen,
          cellStyle(_value, row) {
            console.log(row);
            return {
              fill: { fgColor: { rgb: 'F0EDE1 ' } },
              alignment: {
                horizontal: 'center',
                vertical: 'center',
              },
              border: {
                right: {
                  style: 'thin',
                  color: { rgb: '031972' },
                },
              },
            };
          },
          width: 150,
        };
      }
    }
    heading.push(firstHeading);
    for (let r of _result) {
      rowValues = {};
      for (const key in specification) {
        if (Object.hasOwnProperty.call(specification, key)) {
          let cellValue = null;
          switch (key) {
            // General +
            case 'number':
              cellValue = r.number;
              break;
            case 'updatedAt':
              cellValue = r.updatedAt;
              break;
            case 'state':
              switch (r.state) {
                case 0:
                  cellValue = 'Reject';
                  break;
                case 1:
                  cellValue = 'Approve';
                  break;
                case 2:
                  cellValue = 'Pending';
                  break;
                case 3:
                  cellValue = 'Refunded';
                  break;
                case 4:
                  cellValue = 'Refund Failed';
                  break;
                default:
                  break;
              }
              break;
            case 'transaction_type':
              cellValue =
                r.transaction_type === 'B_TO_B'
                  ? 'Balance Transfer'
                  : r.transaction_type === 'TO_B'
                  ? 'Balance Fill'
                  : r.transaction_type === 'CASH'
                  ? 'Cash'
                  : r.transaction_type === 'CH_TO_B'
                  ? 'Check'
                  : r.transaction_type === 'MO_TO_B'
                  ? 'Money Order'
                  : r.transaction_type === 'C_TO_B'
                  ? 'Credit Card/Bank Transfer'
                  : r.transaction_type === 'C_TO_A'
                  ? 'Credit Card/Bank Authorize'
                  : r.transaction_type;
              break;
            case 'source_type':
              cellValue =
                r.source_type === 'PAY_INVOICE'
                  ? 'Client Made Payment'
                  : r.source_type === 'EXECUTE_INVOICE'
                  ? 'Buy Package For Client'
                  : r.source_type === 'ADD_BALANCE'
                  ? 'Balance Fill'
                  : r.source_type === 'VOID_TRANSACTION'
                  ? 'Void Transaction'
                  : r.source_type === 'PAY_BALANCE'
                  ? 'Balance Fill (Pay)'
                  : r.source_type;
              break;
            case 'initiatorFromName':
              cellValue =
                r.from_type === 1
                  ? r.from_provider?.name[0]?.name
                  : r.from_client?.personalInfo?.firstname + ' ' + r.from_client?.personalInfo?.lastname;
              break;
            case 'initiatorToName':
              cellValue =
                r.to_type === 1
                  ? r.to_provider.name[0].name
                  : r.to_client?.personalInfo?.firstname + ' ' + r.to_client?.personalInfo?.lastname;
              break;
            case 'transactionId':
              cellValue = r.transactionId ? r.transactionId : '-';
              break;
            case 'executionDate':
              cellValue = r.executionDate;
              break;
            case 'stateMessage':
              cellValue = r.stateMessage ? r.stateMessage : '-';
              break;
            case 'amount':
              cellValue = r.amount;
              break;
            // General -
            // Bill +
            case 'invoicesNumber':
              cellValue = r.invoice?.number ? `${r.invoice?.number}` : `N/A`;
              break;
            case 'invoicesStartDate':
              cellValue = r.invoices && r.invoices.length ? r.invoices[0].startDate : '-';
              break;
            // Bill -
            // My Incomes/Expenses +
            case 'myAmount':
              cellValue = r.amount;
              break;
            case 'transactionType':
              cellValue = r.transaction_type;
              break;
            case 'payNumber':
              cellValue =
                r.transaction_type === 'MO_TO_B'
                  ? `${r.sourcePay?.number} ${r.sourcePay?.bankName}`
                  : r.transaction_type === 'CH_TO_B'
                  ? `${r.sourcePay?.number}`
                  : `N/A`;
              break;
            // My Incomes/Expenses -
            // Initiator +
            case 'initiatorType':
              // eslint-disable-next-line no-nested-ternary
              cellValue = r.from_provider ? 'Provider' : r.from_client ? 'Client' : '-';
              break;
            case 'initiatorName':
              cellValue = r.initiatorName ? r.initiatorName : '-';
              break;
            // Initiator -
            // Participant +
            case 'participantType':
              cellValue = r.to_provider ? 'Provider' : r.to_client ? 'Client' : '-';
              break;
            case 'participantName':
              cellValue = r.participantName ? r.participantName : '-';
              break;
            case 'byUser':
              cellValue = r.invoice?.user
                ? `${r.invoice?.user?.firstname} ${r.invoice?.user?.lastname}`
                : `${r.user?.firstname} ${r.user?.lastname}`;
              break;
            case 'locationLogin':
              if (r.invoice && r.invoice.id) {
                const logins = [];
                r.invoice.payloadCalculated.locations.map((item) => {
                  logins.push(item.locationLogin);
                });
                cellValue = logins.toString().split(',');
              } else {
                cellValue = '-';
              }
              break;
            case 'creditBefore':
              cellValue =
                r.invoices.length > 0 && r.invoices[0]?.provider[0]?.creditBefore ? r.provider[0]?.creditBefore : '-';
              break;
            case 'creditAfter':
              cellValue =
                r.invoices.length > 0 && r.invoices[0]?.provider[0]?.creditAfter
                  ? r.invoices[0]?.provider[0]?.creditAfter
                  : '-';
              break;
            case 'creditEndDate':
              cellValue =
                r.invoices && r.invoices.length > 0 && r.invoices[0]?.provider[0]?.creditEndDate !== undefined
                  ? r.invoices[0]?.provider[0]?.creditEndDate
                  : '-';
              break;
            case 'balanceBefore':
              cellValue = typeof r.balanceBefore !== 'undefined' ? `$${r.balanceBefore?.toFixed(2)}` : 'N/A';
              break;
            case 'balanceAfter':
              cellValue = typeof r.balanceAfter !== 'undefined' ? `$${r.balanceAfter?.toFixed(2)}` : 'N/A';
              break;
            case 'balance':
              cellValue =
                r.invoices.length > 0 && r.invoices[0]?.provider[0]?.balance ? r.invoices[0]?.provider[0]?.balance : '-';
              break;
            case 'debt':
              cellValue = r.invoices.length > 0 ? r.invoices[0]?.provider[0]?.debt : '-';
              break;
            // Participant -
            // My Balance/Credit State +
            case 'myBalanceBefore':
              cellValue = r.provider.length && r.provider[0].myBalanceBefore ? r.provider[0].myBalanceBefore : '-';
              break;
            case 'providerBalance':
              cellValue = r.provider.length > 0 ? r?.provider[0]?.balance.toFixed(2) : '-';
              break;
            case 'providerDebt':
              cellValue = r.provider.length > 0 ? r?.provider[0]?.debt : '-';
              break;
            case 'myCreditBefore':
              cellValue = r.provider.length > 0 && r.provider[0]?.myCreditBefore ? r.provider[0]?.myCreditBefore : '-';
              break;
            case 'myCreditAfter':
              cellValue = r.provider.length > 0 && r.provider[0]?.myCreditAfter ? r.provider[0]?.myCreditAfter : '-';
              break;
            case 'myCreditEndDate':
              cellValue = r.provider.length > 0 && r.provider[0]?.myCreditEndDate ? r?.provider[0]?.myCreditEndDate : '-';
              break;
            // My Balance/Credit State -
            default:
              cellValue = '-';
              break;
          }
          rowValues[key] = cellValue;
        }
      }
      dataset.push(rowValues);
    }

    return excel.buildExport(
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      [
        {
          name: 'Report', // <- Specify sheet name (optional)
          heading, // <- Raw heading array (optional)
          merges, // <- Merge cell ranges
          specification, // <- Report specification
          data: dataset, // <-- Report data
        },
      ]
    );
  }

  exportUserListTable(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (key !== 'avatar') {
          if (isShow) {
            switch (key) {
              case 'firstname':
                currentValue = row.firstname;
                break;
              case 'number':
                currentValue = row.number;
                break;
              case 'rolesInfo':
                let rf = '';
                if (row.rolesInfo.cashier) {
                  rf += 'Cashier ';
                }
                if (row.rolesInfo.support) {
                  rf += 'Support ';
                }
                if (row.rolesInfo.admin) {
                  rf += 'Admin';
                }
                currentValue = rf;
                break;
              case 'lastIp':
                currentValue = row?.geoInfo?.realIp ? row.geoInfo?.realIp : '-';
                break;
              case 'countryCode':
                currentValue = row.country ? row.country : '-';
                break;
              case 'geoInfo':
                currentValue = '-';
                break;
              case 'lastActiveTime':
                currentValue = row.lastActiveTime;
                break;
              case 'loginAttempt':
                currentValue = row.loginAttempt;
                break;
              case 'createdAt':
                currentValue = row.createdAt;
                break;
              case 'provider':
                currentValue = row.provider.name.filter((c) => c.lang === 'us').name;
                break;
              case 'phone':
                currentValue = row.phone.phoneNumber;
                break;
              case 'email':
                currentValue = row.email ? row.email : '-';
                break;
              case 'accessEnable':
                currentValue = '-';
                break;
              case 'timezone':
                currentValue = row.timezone ? row.timezone : '-';
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.title,
            });
          }
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        if (item.value !== 'Avatar') {
          currentItem[item.key] = item.value;
          const nameLength = item.name?.length ?? 5;
          specification[item.key] = {
            displayName: item.name,
            width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
            headerStyle: {
              fill: {
                fgColor: {
                  rgb: 'FFFFFFFF',
                },
              },
              font: {
                color: {
                  rgb: 'FF000000',
                },
                sz: 12,
                bold: true,
                underline: false,
              },
            },
          };
        }
      }
      dataset.push(currentItem);
    }
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportUserActivityTable(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (key !== 'avatar') {
          if (isShow) {
            switch (key) {
              case 'id':
                currentValue = row.id;
                break;
              case 'firstName':
                currentValue = row.firstname;
                break;
              case 'role':
                let rf = '';
                if (row.rolesInfo.cashier) {
                  rf += 'Cashier ';
                }
                if (row.rolesInfo.support) {
                  rf += 'Support ';
                }
                if (row.rolesInfo.admin) {
                  rf += 'Admin';
                }
                currentValue = rf;
                break;
              case 'ipAddress':
                currentValue = row?.geoInfo?.realIp ? row.geoInfo?.realIp : '-';
                break;
              case 'city':
                currentValue = '-';
                break;
              case 'country':
                currentValue = '-';
                break;
              case 'loginDateTime':
                currentValue = row.loginDateTime;
                break;
              case 'logoutDateTime':
                currentValue = '-';
                break;
              case 'duration':
                currentValue = '-';
                break;
              case 'loginStatus':
                currentValue = '-';
                break;
              case 'phoneNumber':
                currentValue = row.phoneNumber;
                break;
              case 'email':
                currentValue = row.email ? row.email : '-';
                break;
              case 'userStatus':
                currentValue = row.status === 1 ? 'Enable' : 'Disable';
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.name,
            });
          }
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        if (item.value !== 'Avatar') {
          currentItem[item.key] = item.value;
          const nameLength = item.name?.length ?? 5;
          specification[item.key] = {
            displayName: item.name,
            width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
            headerStyle: {
              fill: {
                fgColor: {
                  rgb: 'FFFFFFFF',
                },
              },
              font: {
                color: {
                  rgb: 'FF000000',
                },
                sz: 12,
                bold: true,
                underline: false,
              },
            },
          };
        }
      }
      dataset.push(currentItem);
    }
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportProviderList(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    // let isDefault = true;
    if (settingsObject) {
      // isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (key !== 'avatar') {
          if (isShow) {
            switch (key) {
              case 'number':
                currentValue = row.number;
                break;
              case 'name':
                currentValue = row.name && row.name.length ? row.name[0].name : '-';
                break;
              case 'country':
                currentValue = row.country;
                break;
              case 'emails':
                if (row.emails && row.emails.length) {
                  let x = row.emails.filter((xm) => xm.isMain)[0];
                  if (x) {
                    currentValue = x.address;
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'addresses':
                currentValue = row.addresses;
                if (row.addresses.length) {
                  let isMainAddress = row.addresses.filter((adrs) => adrs.isMain)[0];
                  if (isMainAddress) {
                    if (
                      isMainAddress.address &&
                      isMainAddress.suite &&
                      isMainAddress.city &&
                      isMainAddress.zip &&
                      isMainAddress.country
                    ) {
                      currentValue =
                        isMainAddress.address +
                        ', ' +
                        isMainAddress.suite +
                        ', ' +
                        isMainAddress.city +
                        ', ' +
                        isMainAddress.zip +
                        ', ' +
                        isMainAddress.country;
                    } else {
                      currentValue =
                        isMainAddress.address +
                        ', ' +
                        isMainAddress.city +
                        ', ' +
                        isMainAddress.zip +
                        ', ' +
                        isMainAddress.country;
                    }
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'clients':
                currentValue = row.clients.length ? row.clients[0].clientCount : 0;
                break;
              case 'resellers':
                currentValue = row.resellers.length ? row.resellers[0].resellerCount : 0;
                break;
              case 'logins':
                currentValue = row.logins && row.logins.length > 0 ? row.logins : '-';
                break;
              case 'activeLogins':
                currentValue = row?.activeLogins;
                break;
              case 'inactiveLogin':
                currentValue = row?.inactiveLogin;
                break;
              case 'priceGroup':
                if (row.priceGroup) {
                  currentValue = row.priceGroup.name[0].name;
                } else {
                  currentValue = 'Default';
                }
                break;
              case 'currentMonthPayments':
                currentValue = row.transactions.length > 0 ? row.currentMonthPayments : '-';
                break;
              case 'currentMonthIncome': // 12
                currentValue = row.transactions.length > 0 ? row.currentMonthIncome : '-';
                break;
              case 'creditFromParent':
                currentValue = row.credits;
                if (row.credits.length) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let { creditAmount } = lastCredit;
                  if (creditAmount) {
                    currentValue = '$' + creditAmount;
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'creditStartDate':
                if (row.credits.length) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let creditStart = lastCredit.creditStartDate;
                  currentValue = creditStart;
                } else {
                  currentValue = '-';
                }
                break;
              case 'creditTerm':
                if (row.credits.length) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let { creditTerm } = lastCredit;
                  currentValue = creditTerm + ' days';
                } else {
                  currentValue = '-';
                }
                break;
              case 'creditAutoExtend':
                currentValue = row.credits;
                if (row.credits.length) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let { creditAutoextend } = lastCredit;
                  if (creditAutoextend) {
                    currentValue = creditAutoextend;
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'clientsPauseAfterDays':
                if (row.credits.length > 0) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let { clientsPauseAfterDays } = lastCredit;
                  if (clientsPauseAfterDays) {
                    currentValue = clientsPauseAfterDays + ' days';
                  } else {
                    currentValue = '-';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'daysRemainCreditEnd':
                if (row.credits.length > 0) {
                  let lastCredit = row.credits[row.credits.length - 1];
                  let { creditTerm } = lastCredit;
                  if (creditTerm <= 5) {
                    currentValue = creditTerm + ' days';
                  } else {
                    currentValue = creditTerm + ' days';
                  }
                } else {
                  currentValue = '-';
                }
                break;
              case 'daysRemainPauseClient':
                currentValue = row.daysRemainPauseClient || '-';
                break;
              case 'balance':
                currentValue =
                  row.balance > 0
                    ? '$' + row.balance.toFixed(2)
                    : // eslint-disable-next-line no-useless-concat
                    row.balance < 0
                    ? '-' + '$' + row.balance.toString().replace('-', '')
                    : row.balance;
                break;
              case 'debt':
                currentValue = row.debt;
                break;
              case 'channels':
                currentValue = row.channels || 0;
                break;
              case 'clientPackages':
                currentValue = row.clientPackages || 0;
                break;
              case 'channelsInCLientPackages':
                currentValue = row.channelsInCLientPackages || 0;
                break;
              case 'resellingPackages': // 25
                currentValue = row.resellingPackages || 0;
                break;
              case 'channelsResellingPackages':
                currentValue = row.channelsResellingPackages || 0;
                break;
              case 'state':
                switch (row.state) {
                  case 0:
                    currentValue = 'Pending';
                    break;
                  case 1:
                    currentValue = 'Approved';
                    break;
                  case 2:
                    currentValue = 'Reject';
                    break;
                  default:
                    currentValue = 'Disabled';
                    break;
                }
                break;
              case 'createdAt':
                currentValue = row.createdAt;
                break;
              case 'registerBy':
                currentValue = row.registerBy;
                if (row.registerBy && row.registerBy.length > 0) {
                  let fullName = row.registerBy.filter((name) => name.lang === 'en');
                  if (fullName[0]) {
                    currentValue = fullName[0].firstname + ' ' + fullName[0].lastname;
                  }
                } else {
                  currentValue = '-';
                }
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.title,
            });
          }
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        if (item.value !== 'Avatar') {
          currentItem[item.key] = item.value;
          const nameLength = item.name?.length ?? 5;
          specification[item.key] = {
            displayName: item.name,
            width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
            headerStyle: {
              fill: {
                fgColor: {
                  rgb: 'FFFFFFFF',
                },
              },
              font: {
                color: {
                  rgb: 'FF000000',
                },
                sz: 12,
                bold: true,
                underline: false,
              },
            },
          };
        }
      }
      dataset.push(currentItem);
    }
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Providers', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }

  exportReviewList(inputList, user, settingsKey, orderKey) {
    let settingsObject;
    let settingsSortList;
    let settingsSortListIsValid = false;
    if (user.settings && user.settings[settingsKey]) {
      settingsObject = user.settings[settingsKey];
    }
    let isDefault = true;
    if (settingsObject) {
      isDefault = settingsObject.isDefault;
      settingsSortList = settingsObject[orderKey];
      if (typeof settingsSortList === 'object') {
        settingsSortList = settingsSortList.sort(function (a, b) {
          if (a.defaultDragIndex === b.defaultDragIndex) {
            // Price is only important when cities are the same
            return a.mainIndex - b.mainIndex;
          }
          return b.defaultDragIndex > a.defaultDragIndex ? -1 : 1;
        });
      }
      if (settingsSortList && settingsSortList.length) {
        let allTrue = true;
        // eslint-disable-next-line no-restricted-syntax
        for (const item of settingsSortList) {
          if (!item.key) {
            allTrue = false;
            break;
          }
        }
        settingsSortListIsValid = allTrue;
      }
    }
    const orderItems = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const row of inputList) {
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      const list = [];
      let currentValue;
      // eslint-disable-next-line no-restricted-syntax
      for (const columnOrder of settingsSortList) {
        // eslint-disable-next-line prefer-const
        let { key, isShow } = columnOrder;
        if (key !== 'avatar') {
          if (isShow) {
            switch (key) {
              case 'status':
                currentValue = row.state === 0 ? 'Pending' : 'Reject';
                break;
              case 'firstname':
                currentValue = row.user.firstname + ' ' + row.user.firstname;
                break;
              case 'clients':
                currentValue = '-';
                break;
              case 'ipAddress':
                currentValue = row.user?.geoInfo?.realIp;
                break;
              case 'company':
                currentValue = row.name[0].name;
                break;
              case 'country':
                currentValue = row?.user?.geoInfo?.countryCode;
                break;
              case 'webpage':
                currentValue = row.website;
                break;
              case 'companyEmail':
                currentValue = row?.user?.email;
                break;
              case 'phone':
                currentValue = '-';
                break;
              case 'email':
                currentValue = row?.emails[0]?.address;
                break;
              case 'channels':
                currentValue = row.channelAmount;
                break;
              case 'date':
                currentValue = '-';
                break;
              case 'loginAttempt':
                currentValue = row.user.loginAttempt;
                break;
              case 'id':
                currentValue = row.number;
                break;
              default:
                break;
            }
            list.push({
              value: currentValue,
              key,
              name: columnOrder.title,
            });
          }
        }
      }
      orderItems.push(list);
    }
    const specification = {};
    logger.info(`exporting excel`);
    const dataset = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const orderItem of orderItems) {
      const currentItem = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const item of orderItem) {
        if (item.value !== 'Avatar') {
          currentItem[item.key] = item.value;
          const nameLength = item.name?.length ?? 5;
          specification[item.key] = {
            displayName: item.name,
            width: nameLength > 6 ? nameLength * 10 : nameLength * 14,
            headerStyle: {
              fill: {
                fgColor: {
                  rgb: 'FFFFFFFF',
                },
              },
              font: {
                color: {
                  rgb: 'FF000000',
                },
                sz: 12,
                bold: true,
                underline: false,
              },
            },
          };
        }
      }
      dataset.push(currentItem);
    }
    return excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report', // <- Specify sheet name (optional)
        // heading, // <- Raw heading array (optional)
        // merges, // <- Merge cell ranges
        specification, // <- Report specification
        data: dataset, // <-- Report data
      },
    ]);
  }
}

module.exports = ExcelService;
