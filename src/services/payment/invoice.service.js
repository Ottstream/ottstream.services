/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { uuid } = require('uuidv4');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const bwipjs = require('bwip-js');
const PDFMerger = require('pdf-merger-js');
const moment = require('moment');
const { models, repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const {
  equipmentRepository,
  equipmentSubscriptionRepository,
  subscriptionRepository,
  invoiceRepository,
  clientLocationRepository,
  clientRepository,
  ottProviderRepository,
  ottProviderAddressRepository,
  ottProviderPhoneRepository,
  ottProviderEmailRepository,
  ottProviderInvoiceRepository,
  ottProviderPaymentGatewayRepository,
  shippingRepository,
  transactionRepository,
} = repositories;
// const invoiceRepository = require('../../repository/payment/invoice.repository');
// const subscriptionRepository = require('../../repository/subscription/subscription.repository');
const ApiError = require('../../api/utils/error/ApiError');

const { Subscription } = models;

// const equipmentSubscriptionRepository = require('../../repository/subscription/equipment_subscription.repository');
// const equipmentRepository = require('../../repository/equipement/equipement.repository');
const TransactionService = require('./transaction.service');
// const { getOttTabs } = require('../../repository/ottprovider/ottprovider.repository');
// const { clientRepository } = require('../../repository');
// const { getOttProviderInvoiceByProviderId } = require('../../repository/ottprovider/ottprovider_invoice.repository');
const config = require('../../config/config');
const ShippingService = require('../shiping/shipping.service');
// const priceUtils = require('../../utils/price')
// const {
//   clientRepository,
//   ottProviderRepository,
//   ottProviderAddressRepository,
//   ottProviderPhoneRepository,
//   ottProviderEmailRepository,
//   ottProviderInvoiceRepository,
//   ottProviderPaymentGatewayRepository,
//   shippingRepository,
//   transactionRepository,
// } = require('../../repository');
// const TimezoneService = require('../shared/timezone.service');
const LocationSyncService = require('../sync/location/location_sync.service');
const SubscriptionService = require('../subscription/subscription.service');
const NotificationService = require('../notification/notification.service');
const ClientActivityService = require('../client/ClientActivityService');
const TimezoneService = require('../shared/timezone.service');
// eslint-disable-next-line no-unused-vars

const getFormatedDate = (date, viewProvider) => {
  try {
    let dayMonth = '';
    if (viewProvider) {
      const localized = TimezoneService.LocalizeDate(date, {
        provider: viewProvider,
      });
      // eslint-disable-next-line no-unused-vars
      const [localizedDate, localizedTime, localizePM] = localized.split(' ');
      // timeFormat = `${localizedTime} ${localizePM || null}`;
      dayMonth = localizedDate;
    } else {
      const day = `0${date.getDate()}`.slice(-2);
      const month = `0${date.getMonth() + 1}`.slice(-2);
      const year = date.getFullYear();
      // const hours = `0${date.getHours()}`.slice(-2);
      // const minutes = `0${date.getMinutes()}`.slice(-2);
      // timeFormat = `${hours}:${minutes}`;
      dayMonth = `${month}/${day}/${year}`;
    }
    return dayMonth;
    // let day = date.getDate(); // Get the day
    // day = day < 10 ? `0${day}` : day; // Prepend with '0' if less than 10

    // let month = date.getMonth() + 1; // Get the month (0-11, hence the '+ 1' to make it 1-12)
    // month = month < 10 ? `0${month}` : month; // Prepend with '0' if less than 10

    // const year = date.getFullYear(); // Get the year

    // return `${month}/${day}/${year}`;
  } catch (err) {
    return 'N/A';
  }
};

class InvoiceService {
  constructor() {
    logger.info(`InvoiceService() initiated`);
  }

  // eslint-disable-next-line no-unused-vars
  // static async padTo2Digits(date, format) {
  //   const mnt = (date.getMonth() + 1).toString();
  //   const day = date.getDate().toString();
  //   const formatArr = format.split('/');
  //   const newDate = [];
  //   // eslint-disable-next-line no-plusplus
  //   for (let f = 0; f < formatArr.length; f++) {
  //     switch (formatArr[f]) {
  //       case 'dd':
  //         newDate.push(day.padStart(2, '0'));
  //         break;
  //       case 'mm':
  //         newDate.push(mnt.padStart(2, '0'));
  //         break;
  //       case 'yyyy':
  //         newDate.push(date.getFullYear());
  //         break;
  //       default:
  //         break;
  //     }
  //   }
  //   return newDate.join('/');
  // }
// eslint-disable-next-line no-unused-vars
static async padTo2Digits(date, format) {
  const mnt = (date.getMonth() + 1).toString();
  const day = date.getDate().toString();
  const formatArr = format.split('/');
  const newDate = [];

  // Pad to 2 digits manually
  function pad2Digits(num) {
    return num < 10 ? `0${num}` : num.toString();
  }

  // Map format specifiers to actions
  const formatActions = {
    'dd': () => newDate.push(pad2Digits(day)),
    'mm': () => newDate.push(pad2Digits(mnt)),
    'yyyy': () => newDate.push(date.getFullYear())
    // Add more format specifiers here as needed
  };

  // Process each format specifier
  formatArr.forEach(formatSpecifier => {
    const action = formatActions[formatSpecifier];
    if (action) {
      action();
    } else {
      // If the format specifier is unknown, just push it as is
      newDate.push(formatSpecifier);
    }
  });

  return newDate.join('/');
}

  static async exportTransaction(transactionList, jpeg = false, forPrint = false, viewProvider = null) {
    const promises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const transactionId of transactionList) {
      logger.info(`preparing transactions..`);
      promises.push(
        // eslint-disable-next-line no-async-promise-executor
        new Promise(async (resolve, reject) => {
          try {
            const invoiceTemplatePath = `${__dirname}/../../config/templates/${
              forPrint ? 'check.html' : 'check_email.html'
            }`;
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const data = await fs.readFile(invoiceTemplatePath);

            const savePath = `${config.file.file_storage_path}./${transactionId}_index.${jpeg ? 'png' : '.pdf'}`;

            let html = data.toString();
            const transaction = await transactionRepository.getTransactionById(transactionId);

            const toProvider = transaction.to_provider ? transaction.to_provider : transaction.from_provider;
            // if (transaction.invoice) {
            //   const invoice = await invoiceRepository.getInvoiceById(transaction.invoice);
            //   let client = null;
            //   if (invoice.client) {
            //     client = await clientRepository.getClientById(invoice.client);
            //   }
            // }
            // const provider = await ottProviderRepository.getOttProviderById(toProvider);
            const provider = await ottProviderRepository.getOttProviderById(toProvider);
            const providerAddress = await ottProviderAddressRepository.getOttProviderAddressesByProviderId(toProvider);
            const providerPhones = await ottProviderPhoneRepository.getOttProviderPhones(toProvider);
            const providerEmails = await ottProviderEmailRepository.getOttProviderEmails(toProvider);
            const ottProviderInvoice = await ottProviderInvoiceRepository.getOttProviderInvoiceByProviderId(toProvider);
            let logoPath = `https://media.istockphoto.com/vectors/road-icon-vector-id848192216?k=20&m=848192216&s=612x612&w=0&h=Bd-9wXbgeJHZ8lEnOYdcLXci0tpCpZqrm737zIwcMoI=`;
            if (ottProviderInvoice.length && ottProviderInvoice[0].design?.logo) {
              logoPath = `${
                config.public_url ? config.public_url : `http://localhost:${config.port}`
              }/v1/files/icon/${ottProviderInvoice[0].design.logo.toString()}`;
            }
            // const name = provider.name.length ? provider.name[0].name : 'PROVIDER_COMPANY_NAME';
            // const { website } = provider;
            const phone = providerPhones.filter((r) => r.forInvoice && r.inUse).length
              ? providerPhones.filter((r) => r.forInvoice && r.inUse)[0].number
              : `PROVIDER_PHONE`;
            const email = providerEmails.filter((r) => r.forInvoice && r.inUse).length
              ? providerEmails.filter((r) => r.forInvoice && r.inUse)[0].address
              : `PROVIDER_EMAIL`;

            html = html.replace('CH_logo', logoPath);
            html = html.replace('CH_phone', phone);
            const currentAddresses = providerAddress.filter((r) => r.forInvoice);
            if (currentAddresses.length) {
              // fill address part
              const currentAddress = currentAddresses[0];
              const { unit, address, state, country, zip, city } = currentAddress;

              html = html.replace('CH_OTT_zip', zip);
              html = html.replace('CH_OTT_unit', unit);
              html = html.replace('CH_OTT_address', address);
              html = html.replace('CH_OTT_city', city);
              html = html.replace('CH_OTT_province', state);
              html = html.replace('CH_OTT_country', country);
            }
            const CH_MERCHANT_DISPLAY = transaction.transactionId ? '' : 'display: none';
            html = html.replace('CH_MERCHANT_DISPLAY', CH_MERCHANT_DISPLAY);
            html = html.replace('CH_MERCHANT_TRANSACTION_ID', transaction.transactionId);
            html = html.replace('CH_TRANSACTION_ID', transaction.number);

            const CH_INVOICE_DISPLAY = transaction.invoice ? '' : 'display: none';
            const CH_DECLINE_DISPLAY = transaction.state === 0 ? '' : 'display: none';
            const CH_REFUNDED_DISPLAY = transaction.state === 5 ? '' : 'display: none';
            html = html.replace('CH_INVOICE_DISPLAY', CH_INVOICE_DISPLAY);
            html = html.replace('CH_DECLINE_DISPLAY', CH_DECLINE_DISPLAY);
            html = html.replace('CH_REFUNDED_DISPLAY', CH_REFUNDED_DISPLAY);
            let CH_BANK_FEE_DISPLAY = 'display: none';
            let CH_PAY_BY_CARD_DISPLAY = 'display: none';
            let CH_ACCOUNTS_DISPLAY = 'display: none';
            let CH_EQUIPMENTS_DISPLAY = 'display: none';
            let locationHtml = '';
            let equipmentHtml = '';
            if (transaction.invoice) {
              const invoice = await invoiceRepository.getInvoiceById(transaction.invoice);
              html = html.replace('CH_INVOICE_NUMBER', invoice.number);
              if (invoice.generateDisplayInfo?.locationsInfo?.locations.filter((r) => r.packages.length).length) {
                const locationInfo = invoice.generateDisplayInfo?.locationsInfo?.locations.filter(
                  (r) => r.packages.length
                )[0];

                if (forPrint) {
                  locationHtml = `
                  <div>
                      <div class="grey-bg text-25">Account : ${locationInfo.locationLogin}</div>
                      <div class="py-2">
                          <table class="account-infos-table py-2 text-25">`;
                  for (const packageInfo of locationInfo.packages) {
                    let packageName = packageInfo.packageName[0].name;
                    if (packageInfo.packageName.filter((r) => r.lang === 'en').length) {
                      packageName = packageInfo.packageName.filter((r) => r.lang === 'en')[0].name;
                    }
                    const { expireNew, totalPrice } = packageInfo;
                    locationHtml += `
                    <tr>
                        <td class="border-right-solid"><p>${packageName} (Subscription To ${getFormatedDate(
                      expireNew,
                      viewProvider
                    )})</p></td>
                        <td><p>${new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format(totalPrice)}</p></td>
                    </tr>`;
                  }
                  locationHtml += `
                          </table>
                      </div>

                      <p class="mb-0">===================================================================</p>
                  </div>`;
                } else {
                  locationHtml = `
                  <div>
                      <div class="grey-bg text-18 p-1 text-center">Account : ${locationInfo.locationLogin}</div>
                      <div class="py-2">
                          <table class="account-infos-table py-2 text-18">`;
                  for (const packageInfo of locationInfo.packages) {
                    let packageName = packageInfo.packageName.en
                      ? packageInfo.packageName.en.name
                      : packageInfo.packageName[0].name;
                    if (packageInfo.packageName.filter((r) => r.lang === 'en').length) {
                      packageName = packageInfo.packageName.filter((r) => r.lang === 'en')[0].name;
                    }
                    const { expireNew, totalPrice } = packageInfo;
                    locationHtml += `
                    <tr>
                        <td class="border-right-solid"><p>${packageName} (Subscription To ${getFormatedDate(
                      expireNew,
                      viewProvider
                    )})</p></td>
                        <td><p>${new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format(totalPrice)}</p></td>
                    </tr>`;
                  }
                  locationHtml += `
                          </table>
                      </div>
                  </div>`;
                }
              }
              if (invoice.generateDisplayInfo?.equipmentInfo?.equipment.equipments.filter((r) => r.piece).length) {
                const equipmentInfos = invoice.generateDisplayInfo?.equipmentInfo?.equipment.equipments.filter(
                  (r) => r.piece
                );
                if (forPrint) {
                  equipmentHtml = `
                  <div>
                      <div class="py-2">
                          <table class="account-infos-table py-2 text-25">`;
                  for (const equipmentInfo of equipmentInfos) {
                    const { equipment } = equipmentInfo;
                    const equipmentName = equipment.name.filter((r) => r.lang === 'en').legth
                      ? equipment.name.filter((r) => r.lang === 'en')[0].name
                      : equipment.name[0].name;
                    let pieceInfo = ``;
                    if (equipmentInfo.piece > 1) pieceInfo = `x${equipmentInfo.piece}`;
                    equipmentHtml += `
                    <tr>
                        <td class="border-right-solid"><p>$${equipmentName} ${pieceInfo}</p></td>
                        <td><p>${new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format(equipmentInfo.price)}</p></td>
                    </tr>`;
                  }
                  equipmentHtml += `
                          </table>
                      </div>

                      <p class="mb-0">===================================================================</p>
                  </div>`;
                } else {
                  equipmentHtml = `
                  <div>
                      <div class="py-2">
                          <table class="account-infos-table py-2 text-18">`;
                  for (const equipmentInfo of equipmentInfos) {
                    const { equipment } = equipmentInfo;
                    const equipmentName = equipment.name.filter((r) => r.lang === 'en').legth
                      ? equipment.name.filter((r) => r.lang === 'en')[0].name
                      : equipment.name[0].name;
                    let pieceInfo = ``;
                    if (equipmentInfo.piece > 1) pieceInfo = `x${equipmentInfo.piece}`;
                    equipmentHtml += `
                    <tr>
                        <td class="border-right-solid"><p>${equipmentName} ${pieceInfo}</p></td>
                        <td><p>${new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format(equipmentInfo.price)}</p></td>
                    </tr>`;
                  }
                  equipmentHtml += `
                          </table>
                      </div>
                  </div>`;
                }
              }
              if (typeof invoice.payloadCalculated.bankFee !== 'undefined' && transaction.transaction_type === 'C_TO_A') {
                CH_BANK_FEE_DISPLAY = '';
              }
              if (
                typeof invoice.payloadCalculated.bankFee !== 'undefined' &&
                (transaction.transaction_type === 'C_TO_A' || invoice.payloadCalculated.bankFee)
              ) {
                html = html.replace(
                  'CH_PAY_BANK_FEE',
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(invoice.payloadCalculated.bankFee.toFixed(2))
                );
              }

              if (transaction.transaction_type === 'C_TO_A') {
                CH_PAY_BY_CARD_DISPLAY = '';
              }
              if (transaction.transaction_type === 'C_TO_A') {
                if (transaction.sourcePay.brand === 'mastercard') {
                  html = html.replace(
                    'CH_PAY_CARD_LOGO',
                    // `
                    //   <svg width="46" height="19" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    // <path d="M14.504 3.26369L9.3395 3.28144L9.49599 12.7364L14.6605 12.7186L14.504 3.26369Z" fill="#FF5F00"/>
                    // <path d="M9.67941 8.02798C9.64745 6.10492 10.5089 4.39621 11.8582 3.28786C10.8398 2.48864 9.56289 2.00804 8.17875 2.01278C4.89963 2.02401 2.29142 4.72537 2.34672 8.05309C2.40202 11.3808 5.09971 14.064 8.37883 14.0528C9.76297 14.048 11.0237 13.5587 12.0155 12.7526C10.6298 11.6704 9.71137 9.95103 9.67941 8.02798Z" fill="#EB001B"/>
                    // <path d="M21.6533 7.94694C21.7086 11.2747 19.1004 13.976 15.8213 13.9873C14.4371 13.992 13.1603 13.5114 12.1418 12.7122C13.5076 11.6038 14.3526 9.89511 14.3206 7.97206C14.2886 6.049 13.3705 4.34639 11.9845 3.24741C12.9763 2.4413 14.237 1.95201 15.6212 1.94727C18.9003 1.93604 21.5983 4.63595 21.6533 7.94694Z" fill="#F79E1B"/>
                    // </svg>
                    // `
                    '<span class="text-25">&nbsp;Master Card&nbsp;</span>'
                  );
                } else if (transaction.sourcePay.brand === 'visa') {
                  html = html.replace(
                    'CH_PAY_CARD_LOGO',
                    //   `<svg xmlns="http://www.w3.org/2000/svg" width="46.145" height="19" viewBox="0 0 46.145 14.934">
                    //   <g id="g4158" transform="translate(-81.166 -105.048)">
                    //     <path id="polygon9" d="M437.245,125.184h-3.738l2.338-14.457h3.738Z" transform="translate(-336.083 -5.417)" fill="#00579f"/>
                    //     <path id="path11" d="M576.392,105.663a9.212,9.212,0,0,0-3.353-.615c-3.691,0-6.291,1.968-6.307,4.783-.031,2.076,1.861,3.23,3.276,3.922,1.446.707,1.938,1.169,1.938,1.8-.015.968-1.169,1.415-2.245,1.415a7.439,7.439,0,0,1-3.507-.769l-.492-.231-.523,3.245a11.377,11.377,0,0,0,4.169.769c3.922,0,6.476-1.938,6.506-4.937.015-1.646-.984-2.907-3.138-3.937-1.307-.661-2.108-1.107-2.108-1.784.015-.615.677-1.245,2.153-1.245a6.351,6.351,0,0,1,2.785.554l.338.154.508-3.122Z" transform="translate(-461.679)" fill="#00579f"/>
                    //     <path id="path13" d="M796.305,120.062c.308-.831,1.492-4.045,1.492-4.045-.016.031.307-.846.492-1.384l.261,1.246s.708,3.46.862,4.183Zm4.614-9.335h-2.891a1.844,1.844,0,0,0-1.954,1.2l-5.552,13.257h3.922l.784-2.169h4.8c.107.508.446,2.169.446,2.169h3.461l-3.016-14.457Z" transform="translate(-676.625 -5.417)" fill="#00579f"/>
                    //     <path id="path15" d="M175.064,110.727l-3.661,9.858-.4-2a11.065,11.065,0,0,0-5.168-6.06l3.353,12.642h3.953l5.876-14.441Z" transform="translate(-80.763 -5.417)" fill="#00579f"/>
                    //     <path id="path17" d="M87.241,110.727H81.227l-.062.292c4.691,1.2,7.8,4.091,9.075,7.567l-1.307-6.644a1.547,1.547,0,0,0-1.692-1.215Z" transform="translate(0 -5.417)" fill="#faa61a"/>
                    //   </g>
                    // </svg>`
                    '<span class="text-25">&nbsp;Visa&nbsp;</span>'
                  );
                } else if (transaction.sourcePay.brand) {
                  html = html.replace(
                    'CH_PAY_CARD_LOGO',
                    //   `<svg xmlns="http://www.w3.org/2000/svg" width="46.145" height="19" viewBox="0 0 46.145 14.934">
                    //   <g id="g4158" transform="translate(-81.166 -105.048)">
                    //     <path id="polygon9" d="M437.245,125.184h-3.738l2.338-14.457h3.738Z" transform="translate(-336.083 -5.417)" fill="#00579f"/>
                    //     <path id="path11" d="M576.392,105.663a9.212,9.212,0,0,0-3.353-.615c-3.691,0-6.291,1.968-6.307,4.783-.031,2.076,1.861,3.23,3.276,3.922,1.446.707,1.938,1.169,1.938,1.8-.015.968-1.169,1.415-2.245,1.415a7.439,7.439,0,0,1-3.507-.769l-.492-.231-.523,3.245a11.377,11.377,0,0,0,4.169.769c3.922,0,6.476-1.938,6.506-4.937.015-1.646-.984-2.907-3.138-3.937-1.307-.661-2.108-1.107-2.108-1.784.015-.615.677-1.245,2.153-1.245a6.351,6.351,0,0,1,2.785.554l.338.154.508-3.122Z" transform="translate(-461.679)" fill="#00579f"/>
                    //     <path id="path13" d="M796.305,120.062c.308-.831,1.492-4.045,1.492-4.045-.016.031.307-.846.492-1.384l.261,1.246s.708,3.46.862,4.183Zm4.614-9.335h-2.891a1.844,1.844,0,0,0-1.954,1.2l-5.552,13.257h3.922l.784-2.169h4.8c.107.508.446,2.169.446,2.169h3.461l-3.016-14.457Z" transform="translate(-676.625 -5.417)" fill="#00579f"/>
                    //     <path id="path15" d="M175.064,110.727l-3.661,9.858-.4-2a11.065,11.065,0,0,0-5.168-6.06l3.353,12.642h3.953l5.876-14.441Z" transform="translate(-80.763 -5.417)" fill="#00579f"/>
                    //     <path id="path17" d="M87.241,110.727H81.227l-.062.292c4.691,1.2,7.8,4.091,9.075,7.567l-1.307-6.644a1.547,1.547,0,0,0-1.692-1.215Z" transform="translate(0 -5.417)" fill="#faa61a"/>
                    //   </g>
                    // </svg>`
                    `<span class="text-25">&nbsp;${transaction.sourcePay.brand}&nbsp;</span>`
                  );
                } else {
                  html = html.replace(
                    'CH_PAY_CARD_LOGO',
                    //   `<svg xmlns="http://www.w3.org/2000/svg" width="46.145" height="19" viewBox="0 0 46.145 14.934">
                    //   <g id="g4158" transform="translate(-81.166 -105.048)">
                    //     <path id="polygon9" d="M437.245,125.184h-3.738l2.338-14.457h3.738Z" transform="translate(-336.083 -5.417)" fill="#00579f"/>
                    //     <path id="path11" d="M576.392,105.663a9.212,9.212,0,0,0-3.353-.615c-3.691,0-6.291,1.968-6.307,4.783-.031,2.076,1.861,3.23,3.276,3.922,1.446.707,1.938,1.169,1.938,1.8-.015.968-1.169,1.415-2.245,1.415a7.439,7.439,0,0,1-3.507-.769l-.492-.231-.523,3.245a11.377,11.377,0,0,0,4.169.769c3.922,0,6.476-1.938,6.506-4.937.015-1.646-.984-2.907-3.138-3.937-1.307-.661-2.108-1.107-2.108-1.784.015-.615.677-1.245,2.153-1.245a6.351,6.351,0,0,1,2.785.554l.338.154.508-3.122Z" transform="translate(-461.679)" fill="#00579f"/>
                    //     <path id="path13" d="M796.305,120.062c.308-.831,1.492-4.045,1.492-4.045-.016.031.307-.846.492-1.384l.261,1.246s.708,3.46.862,4.183Zm4.614-9.335h-2.891a1.844,1.844,0,0,0-1.954,1.2l-5.552,13.257h3.922l.784-2.169h4.8c.107.508.446,2.169.446,2.169h3.461l-3.016-14.457Z" transform="translate(-676.625 -5.417)" fill="#00579f"/>
                    //     <path id="path15" d="M175.064,110.727l-3.661,9.858-.4-2a11.065,11.065,0,0,0-5.168-6.06l3.353,12.642h3.953l5.876-14.441Z" transform="translate(-80.763 -5.417)" fill="#00579f"/>
                    //     <path id="path17" d="M87.241,110.727H81.227l-.062.292c4.691,1.2,7.8,4.091,9.075,7.567l-1.307-6.644a1.547,1.547,0,0,0-1.692-1.215Z" transform="translate(0 -5.417)" fill="#faa61a"/>
                    //   </g>
                    // </svg>`
                    `<span class="text-25">&nbsp;&nbsp;</span>`
                  );
                }
                html = html.replace(
                  'CH_PAY_BY_CARD_TOTAL',
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(transaction.amount)
                );
                html = html.replace(
                  'CH_PAY_CARD_NUMBER',
                  transaction.sourcePay.cardNumber.substring(transaction.sourcePay.cardNumber.length - 4)
                );
              }
              if (invoice.payloadCalculated.bankFee) {
                CH_BANK_FEE_DISPLAY = '';
              }

              html = html.replace(
                'CH_PAY_TOTAL_NO_FEE',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(
                  invoice.payloadCalculated.totalPrice
                    ? invoice.payloadCalculated.totalPrice
                    : invoice.payloadCalculated.price
                )
              );
              if (invoice.generateDisplayInfo.locationsInfo.locations.filter((r) => r.totalPrice !== 0).length) {
                CH_ACCOUNTS_DISPLAY = '';
              }
              if (invoice.generateDisplayInfo?.equipmentInfo?.equipment?.totalPrice !== 0) {
                CH_EQUIPMENTS_DISPLAY = '';
              }

              html = html.replace('CH_ACCOUNTS_DISPLAY', CH_ACCOUNTS_DISPLAY);
              html = html.replace('CH_EQUIPMENTS_DISPLAY', CH_EQUIPMENTS_DISPLAY);
            } else {
              html = html.replace('CH_PAY_TOTAL_NO_FEE', transaction.amount);
            }

            html = html.replace('CH_BANK_FEE_DISPLAY', CH_BANK_FEE_DISPLAY);
            html = html.replace('CH_PAY_BY_CARD_DISPLAY', CH_PAY_BY_CARD_DISPLAY);
            html = html.replace('CH_ACCOUNTS', locationHtml);
            html = html.replace('CH_EQUIPMENTS', equipmentHtml);

            const CH_PAY_BALANCE_DISPLAY =
              transaction.transaction_type === 'B_TO_B' || transaction.transaction_type === 'TO_B' ? '' : 'display: none';
            html = html.replace('CH_PAY_BALANCE_DISPLAY', CH_PAY_BALANCE_DISPLAY);
            if (transaction.transaction_type === 'B_TO_B' || transaction.transaction_type) {
              html = html.replace(
                'CH_PAY_BALANCE_TOTAL',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(transaction.amount)
              );
            }

            const CH_PAY_CASH_DISPLAY = transaction.transaction_type === 'CASH' ? '' : 'display: none';
            html = html.replace('CH_PAY_CASH_DISPLAY', CH_PAY_CASH_DISPLAY);
            if (transaction.transaction_type === 'CASH') {
              html = html.replace(
                'CH_PAY_CASH_TOTAL',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(transaction.amount)
              );
            }

            const CH_PAY_CHECK_DISPLAY = transaction.transaction_type === 'CH_TO_B' ? '' : 'display: none';
            html = html.replace('CH_PAY_CHECK_DISPLAY', CH_PAY_CHECK_DISPLAY);
            if (transaction.transaction_type === 'CH_TO_B') {
              html = html.replace(
                'CH_PAY_CHECK_TOTAL',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(transaction.amount)
              );
            }

            const CH_PAY_MO_DISPLAY = transaction.transaction_type === 'MO_TO_B' ? '' : 'display: none';
            html = html.replace('CH_PAY_MO_DISPLAY', CH_PAY_MO_DISPLAY);
            if (transaction.transaction_type === 'MO_TO_B') {
              html = html.replace(
                'CH_PAY_MO_TOTAL',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                }).format(transaction.amount)
              );
            }

            let dayMonth = null;
            let timeFormat = null;
            const date = transaction.executionDate;
            if (viewProvider) {
              const localized = TimezoneService.LocalizeDate(transaction.executionDate, { provider: viewProvider });
              const [localizedDate, localizedTime, localizePM] = localized.split(' ');
              timeFormat = `${localizedTime} ${localizePM || null}`;
              dayMonth = localizedDate;
            } else {
              const day = `0${date.getDate()}`.slice(-2);
              const month = `0${date.getMonth() + 1}`.slice(-2);
              const year = date.getFullYear();
              const hours = `0${date.getHours()}`.slice(-2);
              const minutes = `0${date.getMinutes()}`.slice(-2);
              timeFormat = `${hours}:${minutes}`;

              if (provider.country === 'US') {
                // Input time string
                const inputTime = timeFormat;

                // Parse the input time using moment.js
                const parsedTime = moment(inputTime, 'HH:mm');

                // Format the time in US format with AM/PM
                timeFormat = parsedTime.format('h:mm A');
              }
              dayMonth = `${month}/${day}/${year}`;
            }
            html = html.replace('CH_ORDER_date', dayMonth);
            html = html.replace('CH_ORDER_time', timeFormat);
            html = html.replace('CH_email', email);
            html = html.replace('CH_OTT_phone', phone);
            html = html.replace('CH_OTT_phone2', phone);
            // html = html.replace('CH_ORDER_transaction_id', transactionsString);
            // html = html.replace('CH_ORDER_order_id', invoice.number);
            // html = html.replace('CH_ORDER_equipments', equipmentHtml);
            // html = html.replace('CH_ORDER_packages', packagesHtml);
            // html = html.replace('CH_ORDER_total', invoice.totalAmount.toFixed(2));
            // html = html.replace('CH_ORDER_tax', 0);
            // html = html.replace('CH_ORDER_pay_from_balance', balancePay);
            // html = html.replace('CH_ORDER_fee', 0);
            // html = html.replace('CH_ORDER_cash_pay', cashPay);
            // html = html.replace('CH_ORDER_pay_by_card', cardPay);
            // html = html.replace('CH_ORDER_shipping', shippingPay);

            // bottom part
            resolve({
              html,
              savePath,
            });
            // client info
            // launch a new chrome instance
            // const browser = await puppeteer.launch({
            //   headless: true,
            //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // });
            //
            // try {
            //   // create a new page
            //   const page = await browser.newPage();
            //
            //   // set your html as the pages content
            //   await page.setContent(html, {
            //     waitUntil: 'load',
            //   });
            //   // const pageHeight = await page.evaluate(() => {
            //   //   window.innerHeight;
            //   // });
            //   // or a .pdf file
            //   await page.pdf({
            //     format: 'A4',
            //     path: savePath,
            //   });
            //   resolve(savePath);
            // // eslint-disable-next-line no-empty
            // } catch (exception) {
            //   reject(exception);
            // }
            // close the browser
            // await browser.close();
          } catch (ex) {
            logger.error(ex);
            reject(ex);
          }
        })
      );
    }
    const invoiceObjects = await Promise.all(promises);

    logger.info(`now need to save invoice..`);
    // launch a new chrome instance
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    logger.info(`opening browserr and saving list ${invoiceObjects.length}..`);
    const results = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const invoiceObject of invoiceObjects) {
      logger.info(`saving file to ${invoiceObject.savePath}..`);
      // eslint-disable-next-line no-await-in-loop
      await (async () => {
        try {
          const page = await browser.newPage();
          await page.setContent(invoiceObject.html, {
            waitUntil: 'load',
          });
          logger.info(`invoice html content loaded`);
          logger.info(`saving to ${invoiceObject.savePath}`);
          if (!jpeg) {
            const bodyHandle = await page.$('body');
            const { height } = await bodyHandle.boundingBox();
            await bodyHandle.dispose();

            const heightInInches = height / 96 + 1;
            // pdf saved
            await page.pdf({
              width: forPrint ? '3.3in' : '4.16in',
              height: `${heightInInches}in`,
              margin: {
                top: '0in',
                right: '0in',
                bottom: '0in',
                left: '0in',
              },
              path: invoiceObject.savePath,
            });
          } else {
            const bodyHandle = await page.$('body');
            const { height } = await bodyHandle.boundingBox();
            await bodyHandle.dispose();
            await page.setViewport({
              width: forPrint ? 580 : 400, // 3.3 inches in pixels (assuming 1 inch = 96 pixels)
              height: Math.ceil(height), // 8 inches in pixels
              deviceScaleFactor: 1,
            });
            // Take a scre/check.html`;
            await page.screenshot({ path: invoiceObject.savePath, type: 'png', fullPage: true });
          }

          logger.info(`invoice pdf saved to: ${invoiceObject.savePath}`);
        } catch (e) {
          logger.info(`invoice pdf saved error ${e.message}`);
          logger.error(e);
        }
        results.push(invoiceObject.savePath);
      })();
    }
    await browser.close();
    if (results.length === 1) return results[0];

    const merger = new PDFMerger();

    const savePath = `${config.file.file_storage_path}./merged_index.pdf`;
    await (async () => {
      results.forEach((pdfFile) => {
        merger.add(pdfFile);
      });
      await merger.save(savePath);

      results.forEach(() => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        // fs.unlinkSync(pdfFile);
      });
    })();
    return savePath;
  }

  // eslint-disable-next-line no-unused-vars
  static async exportPdfMulti(invoiceList, type = 1, user, jpeg = false) {
    const promises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const invoiceId of invoiceList) {
      logger.info(`preparing invoices..`);
      promises.push(
        // eslint-disable-next-line no-async-promise-executor
        new Promise(async (resolve) => {
          try {
            let invoiceTemplatePath = `${__dirname}/../../config/templates/invoice1.html`;
            if (type === 3) {
              invoiceTemplatePath = `${__dirname}/../../config/templates/invoice1_postal.html`;
            }
            if (type === 2) {
              invoiceTemplatePath = `${__dirname}/../../config/templates/check.html`;
            }
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const data = await fs.readFile(invoiceTemplatePath);

            const savePath = `${config.file.file_storage_path}./${invoiceId}_index.${jpeg ? 'jpg' : '.pdf'}`;

            // Your string for the barcode
            let html = data.toString();
            const invoice = await invoiceRepository.getInvoiceById(invoiceId);
            const toProvider = invoice.to_type === 1 ? invoice.to_provider.toString() : invoice.from_provider.toString();
            const fromClient = invoice.from_type === 2 ? invoice.from_client.toString() : invoice.to_client.toString();
            if (invoice) {
              const barcodeString = invoice.number;
              const options = {
                bcid: 'code128', // Barcode type (Code 128 in this example)
                text: barcodeString, // Text to encode
                scale: 2, // Scaling factor
                height: 10, // Bar height, in millimeters
                includetext: false, // Include the text below the barcode
                textxalign: 'center', // Text horizontal alignment
              };

              // Generate the barcode as SVG
              const base64Promise = () => {
                return new Promise((resolveBase64Promise) => {
                  bwipjs.toBuffer(options, (err, png) => {
                    // Convert the SVG buffer to base64
                    const base64String = png.toString('base64');
                    resolveBase64Promise(base64String);

                    // Optionally, save the barcode image to a file (PNG format)
                    // fs.writeFileSync('barcode.png', png);

                    // console.log('Barcode generated and saved successfully.');
                    // console.log('Base64 representation:', base64String);
                  });
                });
              };
              const client = await clientRepository.getClientById(fromClient);
              const provider = await ottProviderRepository.getOttProviderById(toProvider);
              const providerAddress = await ottProviderAddressRepository.getOttProviderAddressesByProviderId(toProvider);
              const providerPhones = await ottProviderPhoneRepository.getOttProviderPhones(toProvider);
              const providerEmails = await ottProviderEmailRepository.getOttProviderEmails(toProvider);
              const ottProviderInvoice = await ottProviderInvoiceRepository.getOttProviderInvoiceByProviderId(toProvider);
              let logoPath = `https://media.istockphoto.com/vectors/road-icon-vector-id848192216?k=20&m=848192216&s=612x612&w=0&h=Bd-9wXbgeJHZ8lEnOYdcLXci0tpCpZqrm737zIwcMoI=`;
              if (ottProviderInvoice.length && ottProviderInvoice[0].design?.logo) {
                logoPath = `${
                  config.public_url ? config.public_url : `http://localhost:${config.port}`
                }/v1/files/icon/${ottProviderInvoice[0].design.logo.toString()}`;
              }
              const displayCut = invoice.type === 2 ? 'block' : 'none';
              html = html.replace('CH_DISPLAY_CUT', displayCut);
              const paymentGateways = await ottProviderPaymentGatewayRepository.getOttProviderPaymentGatewayByProviderId(
                provider._id.toString()
              );
              let bankFeePercent = 0;
              let bankFeeFixed = 0;
              if (paymentGateways.length && paymentGateways[0].cardsFee && paymentGateways[0].cardsFee.percent) {
                bankFeePercent = paymentGateways[0].cardsFee.percent;
              }
              if (paymentGateways.length && paymentGateways[0].cardsFee && paymentGateways[0].cardsFee.fixed) {
                bankFeeFixed = paymentGateways[0].cardsFee.fixed;
              }
              // const name = provider.name.length ? provider.name[0].name : 'PROVIDER_COMPANY_NAME';
              const { website } = provider;
              const phone = providerPhones.filter((r) => r.forInvoice && r.inUse).length
                ? providerPhones.filter((r) => r.forInvoice && r.inUse)[0].number
                : `PROVIDER_PHONE`;
              const email = providerEmails.filter((r) => r.forInvoice && r.inUse).length
                ? providerEmails.filter((r) => r.forInvoice && r.inUse)[0].address
                : `PROVIDER_EMAIL`;

              const numberBase64 = await base64Promise();
              html = html.replace('CH_BASE64_BARCODE', numberBase64);
              if (type === 1 || type === 3) {
                html = html.replace('CH_email', email);
                html = html.replace('CH_phone', phone);
                html = html.replace('CH_web', website);
                html = html.replace('CH_logo', logoPath);
                const currentAddresses = providerAddress.filter((r) => r.forInvoice);
                if (currentAddresses.length) {
                  // fill address part
                  const currentAddress = currentAddresses[0];
                  const { unit, address, state, country, zip, city } = currentAddress;

                  html = html.replace('CH_zip', zip);
                  html = html.replace('CH_unit', unit);
                  html = html.replace('CH_address', address);
                  html = html.replace('CH_city', city);
                  html = html.replace('CA_province', state);
                  html = html.replace('CH_country', country);
                }

                // client info
                const clientAddreses = client && client.addresses ? client.addresses.filter((r) => r.forContactInvoice) : [];
                if (clientAddreses.length) {
                  const clientCurrentAddress = clientAddreses[0];

                  const { suite, address, province, country, zip, city, firstname, lastname } = clientCurrentAddress;

                  html = html.replace(new RegExp('CH_client_zip', 'g'), type === 1 ? zip : '');
                  html = html.replace(new RegExp('CH_client_suite', 'g'), type === 1 ? suite : '');
                  html = html.replace(new RegExp('CH_client_address', 'g'), type === 1 ? address : '');
                  html = html.replace(new RegExp('CH_client_city', 'g'), type === 1 ? city : '');
                  html = html.replace(new RegExp('CA_client_province', 'g'), type === 1 ? province : '');
                  html = html.replace(new RegExp('CH_client_country', 'g'), type === 1 ? country : '');
                  html = html.replace(new RegExp('CH_client_firstname', 'g'), type === 1 ? firstname : '');
                  html = html.replace(new RegExp('CH_client_lastname', 'g'), type === 1 ? lastname : '');
                  html = html.replace(new RegExp('CH_client_bottom_firstname', 'g'), firstname);
                  html = html.replace(new RegExp('CH_client_bottom_lastname', 'g'), lastname);

                  html = html.replace(new RegExp('CH_client_bottom_zip', 'g'), zip);
                  html = html.replace(new RegExp('CH_client_bottom_suite', 'g'), suite);
                  html = html.replace(new RegExp('CH_client_bottom_address', 'g'), address);
                  html = html.replace(new RegExp('CH_client_bottom_city', 'g'), city);
                  html = html.replace(new RegExp('CA_client_bottom_province', 'g'), province);
                }

                // invoice details
                const { amount, number } = invoice;
                html = html.replace(new RegExp('CH_amount', 'g'), amount.toFixed(2));
                html = html.replace(
                  new RegExp('CH_dueDate', 'g'),
                  getFormatedDate(
                    invoice.payloadCalculated.locations[0].packages.filter((r) => r.expireDate)[0]
                      ? invoice.payloadCalculated.locations[0].packages.filter((r) => r.expireDate)[0].expireDate
                      : invoice.createdAt
                  )
                );
                html = html.replace(new RegExp('CH_startDate', 'g'), getFormatedDate(invoice.createdAt, user));
                html = html.replace(new RegExp('CH_number', 'g'), number);

                // TODO take commision from provider payment gateway settings
                // orderPart
                html = html.replace(
                  new RegExp('CH_subtotal', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(invoice.payloadCalculated.totalPrice.toFixed(2))
                );

                html = html.replace(
                  new RegExp('CH_tax', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(invoice.payloadCalculated.totalTax.toFixed(2))
                );
                html = html.replace(
                  new RegExp('CH_total', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(invoice.payloadCalculated.totalPrice)
                );
                html = html.replace(
                  new RegExp('CH_1_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(invoice.payloadCalculated.price)
                );
                html = html.replace(
                  new RegExp('CH_1_card_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(
                    invoice.payloadCalculated.totalPrice !== invoice.payloadCalculated.price
                      ? invoice.payloadCalculated.totalPrice
                      : invoice.payloadCalculated.price * (1 + bankFeePercent / 100) + bankFeeFixed
                  )
                );
                html = html.replace(
                  new RegExp('CH_6_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(
                    invoice.generateDisplayInfo.calculated6Month
                      ? invoice.generateDisplayInfo.calculated6Month.price
                      : invoice.generateDisplayInfo.calculated6MonthTotal
                  )
                );
                html = html.replace(
                  new RegExp('CH_6_card_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(
                    invoice.generateDisplayInfo.calculated6Month
                      ? invoice.generateDisplayInfo.calculated6Month.totalPrice
                      : invoice.generateDisplayInfo.calculated6MonthTotal * (1 + bankFeePercent / 100) + bankFeeFixed
                  )
                );
                html = html.replace(
                  new RegExp('CH_12_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(
                    invoice.generateDisplayInfo.calculated12Month
                      ? invoice.generateDisplayInfo.calculated12Month.price
                      : invoice.generateDisplayInfo.calculated12MonthTotal
                  )
                );
                html = html.replace(
                  new RegExp('CH_12_card_total_month', 'g'),
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(
                    invoice.generateDisplayInfo.calculated12Month
                      ? invoice.generateDisplayInfo.calculated12Month.totalPrice
                      : invoice.generateDisplayInfo.calculated12MonthTotal * (1 + bankFeePercent / 100) + bankFeeFixed
                  )
                );
                // html = html.replace(new RegExp('CH_client_lastname', 'g'), lastname);

                // location part;
                let locationHtmls = ``;
                // eslint-disable-next-line no-restricted-syntax
                for (const location of invoice.payloadCalculated.locations) {
                  const packageNames = [];
                  let serviceStartDate = null;
                  let serviceEndDate = null;
                  // eslint-disable-next-line no-restricted-syntax
                  for (const locationPackage of location.packages) {
                    if (locationPackage.expireDate) serviceStartDate = locationPackage.expireDate;
                    else serviceStartDate = invoice.createdAt; // TODO important need see why not expireDate
                    if (!serviceEndDate || locationPackage.expireNew > serviceEndDate)
                      serviceEndDate = locationPackage.expireNew;
                    let packageName = locationPackage.packageName.en
                      ? locationPackage.packageName.en.name
                      : locationPackage.packageName[0].name;
                    if (locationPackage.packageName.filter((r) => r.lang === 'en').length) {
                      packageName = locationPackage.packageName.filter((r) => r.lang === 'en')[0].name;
                    }
                    packageNames.push(packageName);
                  }
                  let periodName = 'Month';
                  let periodNumber = 1;
                  if (invoice.payloadCalculated.locations.filter((r) => r.month || r.day)) {
                    const cur = invoice.payloadCalculated.locations.filter((r) => r.month || r.day)[0];
                    if (!cur) {
                      periodName = 'Refund';
                      periodNumber = 0;
                    } else {
                      if (cur.month) periodNumber = cur.month;
                      if (cur.day) {
                        periodNumber = cur.day;
                        periodName = 'Day';
                      }
                      html = html.replace(new RegExp('CH_period', 'g'), `${periodNumber} ${periodName}`);
                    }
                  }
                  let locationHtml = `
                      <div class="ott-table-login">Login : ${location.locationLogin} Rooms - ${location.room}</div>
                     `;

                  locationHtml += `<div class="ott-table-total flex-between">
                          <div class="item"><p>Connection for</p></div>
                          <div class="item"><p>${packageNames.join('</br>')}</p></div>
                          <div class="item"><p>${getFormatedDate(serviceStartDate)} - ${getFormatedDate(
                    serviceEndDate
                  )}</p></div>
                          <div class="item"><p>${periodNumber} ${periodName}</p></div>
                          <div class="item"><p>${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(location.totalPrice)}</p></div>
                          <div class="item"><p>${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(0)}</p></div>
                          <div class="item"><p>${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(location.totalPrice)}</p></div>
                        </div>`;
                  locationHtmls += locationHtml;
                }
                html = html.replace(new RegExp('CH_locations', 'g'), locationHtmls);
              } else if (type === 2) {
                const transactions = await transactionRepository.getTransactionByInvoiceId(invoice._id.toString());
                let transactionsString = transactions.length ? `` : `-`;
                // eslint-disable-next-line no-restricted-syntax
                for (const transaction of transactions) {
                  transactionsString += `${transaction.number} `;
                }
                const equipments = await equipmentSubscriptionRepository.getEquipmentSubscriptions(
                  {
                    invoice: invoice._id.toString(),
                  },
                  [{ path: 'equipment' }]
                );
                const date = invoice.updatedAt;
                const day = `0${date.getDate()}`.slice(-2);
                const month = `0${date.getMonth() + 1}`.slice(-2);
                const year = date.getFullYear();
                const hours = `0${date.getHours()}`.slice(-2);
                const minutes = `0${date.getMinutes()}`.slice(-2);

                let equipmentHtml = ``;
                if (equipments.length) {
                  equipmentHtml += `
<div style="display: flex; display: -webkit-box;">`;
                  equipmentHtml += `
  <div style="width: 75%; padding: 16px; border-right: 2px solid">`;
                  // eslint-disable-next-line no-restricted-syntax
                  for (const equipment of equipments) {
                    equipmentHtml += `
                    <div>
      <p style="margin: 0 0 10px">${equipment.equipment.name?.length ? equipment.equipment.name[0].name : '-'}</p>
    </div>`;
                  }
                  equipmentHtml += `</div>`;
                  equipmentHtml += `
  <div style="width: 14%; padding: 16px;">`;
                  // eslint-disable-next-line no-restricted-syntax
                  for (const equipment of equipments) {
                    equipmentHtml += `
    <div style="margin-bottom: 10px; text-align: end">
      <span>$${equipment.price}</span> <!-- TODO -->
    </div>`;
                  }
                  equipmentHtml += `</div>`;
                  equipmentHtml += `</div>`;
                } else {
                  equipmentHtml += `
<div style="background-color: #000; padding: 4px 0">
  <p style="text-align: center; color: #fff; margin: 0">-</p> <!-- TODO -->
</div> `;
                }
                let subscriptions = [];
                const returnSubscriptions = await subscriptionRepository.getSubscriptions(
                  { returnInvoice: invoice._id.toString() },
                  [{ path: 'package' }]
                );
                subscriptions = subscriptions.concat(returnSubscriptions);
                const buySubscriptions = await subscriptionRepository.getSubscriptions({ invoice: invoice._id.toString() }, [
                  { path: 'package' },
                ]);
                subscriptions = subscriptions.concat(buySubscriptions);
                let packagesHtml = ``;
                if (subscriptions.length) {
                  // eslint-disable-next-line no-restricted-syntax
                  for (const currentLocation of invoice.payload?.locations) {
                    // eslint-disable-next-line no-await-in-loop
                    const dbLocation = await clientLocationRepository.getClientLocationById(currentLocation.locationId);
                    packagesHtml += `
<div style="background-color: #000; padding: 4px 0">
  <p style="text-align: center; color: #fff; margin: 0">${dbLocation.login}</p> <!-- TODO -->
</div> `;
                    if (currentLocation.packageInfos.length) {
                      packagesHtml += `
<div style="display: flex; display: -webkit-box;">`;
                      packagesHtml += `
  <div style="width: 75%; padding: 16px; border-right: 2px solid">`;
                      // eslint-disable-next-line no-restricted-syntax
                      for (const packageId of currentLocation.packageInfos) {
                        const subscription = subscriptions.filter((r) => r.package._id.toString() === packageId)[0];
                        if (subscription) {
                          const subscribeDate = subscription.endDate;
                          const subscribeDateDay = `0${subscribeDate.getDate()}`.slice(-2);
                          const subscribeDateMonth = `0${subscribeDate.getMonth() + 1}`.slice(-2);
                          const subscribeDateYear = subscribeDate.getFullYear();
                          packagesHtml += `
                      <div>
        <p style="margin: 0 0 10px">${
          subscription.package?.name?.length ? subscription.package.name[0].name : '-'
        } (Subscribe to ${subscribeDateDay}/${subscribeDateMonth}/${subscribeDateYear})</p>
      </div>`;
                        } else {
                          packagesHtml += `
                      <div>
        <p style="margin: 0 0 10px">Package Id: ${packageId} (Subscribe to info not found)</p>
      </div>`;
                        }
                      }
                      packagesHtml += `</div>`;
                      packagesHtml += `
  <div style="width: 14%; padding: 16px;">`;
                      // eslint-disable-next-line no-restricted-syntax
                      for (const subscription of subscriptions) {
                        const subscriptionPriceUpdates = subscription.updates.filter(
                          (r) => r.hash === invoice.executionHash
                        );
                        packagesHtml += `
    <div style="margin-bottom: 10px; text-align: end">
      <span>$${
        subscriptionPriceUpdates.length ? subscriptionPriceUpdates[0].totalPrice.toFixed(2) : '-'
      }</span> <!-- TODO -->
    </div>`;
                      }
                      packagesHtml += `</div>`;
                      packagesHtml += `</div>`;
                    } else {
                      packagesHtml += `
<div style="background-color: #000; padding: 4px 0">
  <p style="text-align: center; color: #fff; margin: 0">-</p> <!-- TODO -->
</div> `;
                    }
                  }
                }

                const balanceTransactions = transactions.filter(
                  (r) => r.transaction_type === 'B_TO_B' && r.source_type === 'PAY_INVOICE' && r.from_type === 2
                );
                const cardTransactions = transactions.filter(
                  (r) => r.transaction_type === 'C_TO_A' && r.source_type === 'PAY_INVOICE' && r.from_type === 2
                );
                const cashTransactions = transactions.filter(
                  (r) => r.transaction_type === 'CASH' && r.source_type === 'PAY_INVOICE' && r.from_type === 2
                );
                const balancePay = balanceTransactions.reduce((accumulator, currentObject) => {
                  return accumulator + currentObject.amount;
                }, 0);
                const cardPay = cardTransactions.reduce((accumulator, currentObject) => {
                  return accumulator + currentObject.amount;
                }, 0);

                const cashPay = cashTransactions.reduce((accumulator, currentObject) => {
                  return accumulator + currentObject.amount;
                }, 0);

                const shippingPay = invoice.isShipping ? invoice.totalShipping : 0;

                const currentAddresses = providerAddress.filter((r) => r.forInvoice);
                if (currentAddresses.length) {
                  // fill address part
                  const currentAddress = currentAddresses[0];
                  const { unit, address, state, country, zip, city } = currentAddress;

                  html = html.replace('CH_OTT_zip', zip);
                  html = html.replace('CH_OTT_unit', unit);
                  html = html.replace('CH_OTT_address', address);
                  html = html.replace('CH_OTT_city', city);
                  html = html.replace('CH_OTT_province', state);
                  html = html.replace('CH_OTT_country', country);
                }

                html = html.replace('CH_email', email);
                html = html.replace('CH_OTT_phone', phone);
                html = html.replace('CH_OTT_phone2', phone);
                html = html.replace('CH_ORDER_date', `${month}/${day}/${year}`);
                html = html.replace('CH_ORDER_time', `${hours}:${minutes}`);
                html = html.replace('CH_ORDER_transaction_id', transactionsString);
                html = html.replace('CH_ORDER_order_id', invoice.number);
                html = html.replace('CH_ORDER_equipments', equipmentHtml);
                html = html.replace('CH_ORDER_packages', packagesHtml);
                html = html.replace('CH_ORDER_total', invoice.totalAmount.toFixed(2));
                html = html.replace('CH_ORDER_tax', 0);
                html = html.replace('CH_ORDER_pay_from_balance', balancePay);
                html = html.replace('CH_ORDER_fee', 0);
                html = html.replace('CH_ORDER_cash_pay', cashPay);
                html = html.replace('CH_ORDER_pay_by_card', cardPay);
                html = html.replace('CH_ORDER_shipping', shippingPay);

                // client info
              }
              // bottom part
            }
            resolve({
              html,
              savePath,
              status: true,
            });
          } catch (ex) {
            logger.error(ex);
            resolve({ status: false });
          }
        })
      );
    }
    const invoiceObjects = await Promise.all(promises);

    logger.info(`now need to save invoice..`);
    // launch a new chrome instance
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    logger.info(`opening browserr and saving list ${invoiceObjects.length}..`);
    const results = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const invoiceObject of invoiceObjects) {
      if (!invoiceObject.status) {
        logger.error(`error in printing invoice`);
        // eslint-disable-next-line no-continue
        continue;
      }
      logger.info(`saving file to ${invoiceObject.savePath}..`);
      // eslint-disable-next-line no-await-in-loop
      await (async () => {
        try {
          const page = await browser.newPage();
          await page.setContent(invoiceObject.html, {
            waitUntil: 'load',
          });
          logger.info(`invoice html content loaded`);
          logger.info(`saving to ${invoiceObject.savePath}`);
          if (!jpeg) {
            // pdf saved
            await page.pdf({
              width: '8.5in',
              height: '11in',
              margin: {
                top: '0in',
                right: '0in',
                bottom: '0in',
                left: '0in',
              },
              path: invoiceObject.savePath,
            });
          } else {
            // Take a screenshot of the page
            await page.screenshot({ path: invoiceObject.savePath, type: 'jpeg', fullPage: true });
          }

          logger.info(`invoice pdf saved to: ${invoiceObject.savePath}`);
        } catch (e) {
          logger.info(`invoice pdf saved error ${e.message}`);
          logger.error(e);
        }
        results.push(invoiceObject.savePath);
      })();
    }
    await browser.close();
    if (results.length === 1) return results[0];

    const merger = new PDFMerger();

    const savePath = `${config.file.file_storage_path}./merged_index.pdf`;
    await (async () => {
      results.forEach((pdfFile) => {
        merger.add(pdfFile);
      });
      await merger.save(savePath);

      results.forEach(() => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        // fs.unlinkSync(pdfFile);
      });
    })();
    return savePath;
  }

  static getAmount(amount, _invoice) {
    const leftAmount = _invoice.totalAmount - _invoice.payed;
    if (!amount) {
      return leftAmount;
    }
    if (amount > leftAmount) return leftAmount;
    return amount;
  }

  static async payInvoiceWithBalance(amount, _invoice, user) {
    // eslint-disable-next-line global-require
    const invoice = _invoice;
    const invoiceLeftAmount = invoice.totalAmount - invoice.payed;
    const payAmount = InvoiceService.getAmount(amount, _invoice);
    let _transaction = await TransactionService.createPayInvoiceWithBalanceTransaction(invoice, payAmount, user);
    _transaction = await TransactionService.executeTransaction(_transaction);
    const updateInvoice = {
      payed: invoice.payed,
    };
    if (_transaction.state === 1) {
      updateInvoice.lastPaymentType = 'balance';
      updateInvoice.payed += _transaction.amount;
      if (updateInvoice.payed >= invoiceLeftAmount) {
        updateInvoice.state = 1;
      }
    }
    return {
      invoice: await invoiceRepository.updateInvoiceById(invoice._id.toString(), updateInvoice),
      transaction: _transaction,
    };
  }

  static async payInvoiceWithCheck(amount, check, _invoice, user) {
    const response = { status: true, messages: [], invoice: _invoice };
    const invoice = _invoice;
    const invoiceLeftAmount = invoice.totalAmount - invoice.payed;
    const payAmount = InvoiceService.getAmount(amount, _invoice);
    let _transaction;
    const invoiceTransactionObject = await TransactionService.createPayInvoiceWithCheckTransaction(
      invoice,
      check,
      payAmount,
      user
    );
    if (invoiceTransactionObject.status) {
      _transaction = await TransactionService.executeTransaction(invoiceTransactionObject.transaction);
      const updateInvoice = {
        payed: invoice.payed,
      };
      response.transaction = _transaction;
      if (_transaction.state === 1) {
        updateInvoice.lastPaymentType = 'check';
        updateInvoice.payed += _transaction.amount;
        if (updateInvoice.payed >= invoiceLeftAmount) {
          updateInvoice.state = 1;
        }
      }
      response.transaction = _transaction;
      response.invoice = await invoiceRepository.updateInvoiceById(invoice._id.toString(), updateInvoice);
    } else {
      response.status = false;
      response.messages.push(invoiceTransactionObject.message);
    }
    return response;
  }

  static async payInvoiceWithMoneyOrder(amount, moneyOrder, bankName, _invoice, user) {
    const response = { status: true, messages: [], invoice: _invoice };
    const invoice = _invoice;
    const invoiceLeftAmount = invoice.totalAmount - invoice.payed;
    const payAmount = InvoiceService.getAmount(amount, _invoice);
    let _transaction;
    const invoiceTransactionObject = await TransactionService.createPayInvoiceWithMoneyOrderTransaction(
      invoice,
      moneyOrder,
      bankName,
      payAmount,
      user
    );
    if (invoiceTransactionObject.status) {
      _transaction = await TransactionService.executeTransaction(invoiceTransactionObject.transaction);
      const updateInvoice = {
        payed: invoice.payed,
      };
      response.transaction = _transaction;
      if (_transaction.state === 1) {
        updateInvoice.lastPaymentType = 'check';
        updateInvoice.payed += _transaction.amount;
        if (updateInvoice.payed >= invoiceLeftAmount) {
          updateInvoice.state = 1;
        }
      }
      response.transaction = _transaction;
      response.invoice = await invoiceRepository.updateInvoiceById(invoice._id.toString(), updateInvoice);
    } else {
      response.status = false;
      response.messages.push(invoiceTransactionObject.message);
    }
    return response;
  }

  static async payInvoiceWithCash(amount, _invoice, user) {
    const response = { status: true, messages: [], invoice: _invoice };
    const invoice = _invoice;
    const invoiceLeftAmount = invoice.totalAmount - invoice.payed;
    const payAmount = InvoiceService.getAmount(amount, _invoice);
    let _transaction;
    const invoiceTransactionObject = await TransactionService.createPayInvoiceWithCashTransaction(invoice, payAmount, user);
    if (invoiceTransactionObject.status) {
      _transaction = await TransactionService.executeTransaction(invoiceTransactionObject.transaction);
      const updateInvoice = {
        payed: invoice.payed,
      };
      response.transaction = _transaction;
      if (_transaction.state === 1) {
        updateInvoice.lastPaymentType = 'cash';
        updateInvoice.payed += _transaction.amount;
        if (updateInvoice.payed >= invoiceLeftAmount) {
          updateInvoice.state = 1;
        }
      }
      response.invoice = await invoiceRepository.updateInvoiceById(invoice._id.toString(), updateInvoice);
    } else {
      response.status = false;
      response.messages.push(invoiceTransactionObject.message);
    }
    return response;
  }

  static async payInvoiceWithCreditCard(amount, paymentMethodId, paymentObject, _invoice, user) {
    const response = { status: false, messages: [], invoice: _invoice };
    const invoice = _invoice;
    const invoiceLeftAmount = invoice.totalAmount - invoice.payed;
    const payAmount = InvoiceService.getAmount(amount, _invoice);
    let _transaction;
    // TODO get invoice transactions
    // TODO get last Transaction
    const invoiceTransactionObject = await TransactionService.createPayInvoiceWithCardTransaction(
      invoice,
      paymentMethodId,
      paymentObject,
      payAmount,
      _invoice.payloadCalculated.bankFee,
      payAmount - _invoice.payloadCalculated.bankFee,
      user
    );
    if (invoiceTransactionObject.status) {
      _transaction = await TransactionService.executeTransaction(invoiceTransactionObject.transaction);
      const updateInvoice = {
        payed: invoice.payed,
      };
      if (_transaction.state === 1) {
        updateInvoice.lastPaymentType = 'card';
        updateInvoice.payed += _transaction.totalAmount;
        if (updateInvoice.payed >= invoiceLeftAmount) {
          updateInvoice.state = 1;
        }
        response.status = true;
      } else {
        response.messages.push(_transaction.stateMessage);
      }
      response.transaction = _transaction;
      response.invoice = await invoiceRepository.updateInvoiceById(invoice._id.toString(), updateInvoice);
    } else {
      response.status = false;
      response.messages = response.messages.concat(invoiceTransactionObject.messages);
    }
    return response;
  }

  static async cancelInvoice(_invoice, user) {
    const cancelIds = [];
    const invoice = _invoice;
    const result = { status: true, message: '' };
    // TODO check if previously was true or false
    if (invoice) {
      if (invoice.type === 1 && invoice.payloadExecuted && !invoice.canceledExecuted) {
        const needToPays = invoice.payloadCalculated.locations.filter(
          (r) => r.toParents && r.toParents[Object.keys(r.toParents)[0]].amount
        );
        if (needToPays.length) {
          if (invoice.parentPayed) {
            for (const needToPay of needToPays) {
              for (const curParentKey of Object.keys(needToPay.toParents)) {
                const curPay = needToPay.toParents[curParentKey];
                if (curPay.amount !== 0 && curPay.from) {
                  const transaction = await TransactionService.createInvoiceExecutionTransaction(
                    invoice,
                    curPay.amount > 0 ? curParentKey : curPay.from,
                    curPay.amount > 0 ? curPay.from : curParentKey,
                    Math.abs(curPay.amount),
                    curPay.amount < 0,
                    user
                  );
                  const executed = await TransactionService.executeTransaction(transaction);
                  if (executed) invoice.parentPayed = true;
                }
              }
            }
          }
        } else {
          invoice.parentPayed = true;
        }
        if (invoice.parentPayed) {
          if (invoice.locationsExecuted) {
            invoice.canceledExecuted = true;
            invoice.payloadExecuted = false;
            // when executed, call save;
            await invoice.save(); // save invoice state
            subscriptionRepository.updateInvoiceSubscriptoins(invoice);
            // eslint-disable-next-line no-restricted-syntax
          }
        }
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await SubscriptionService.updateSubscriptionStates(invoice.client.toString(), cancelIds);
    result.invoice = invoice;
    return result;
  }

  static async executeInvoice(_invoice, user) {
    const cancelIds = [];
    const invoice = _invoice;
    const result = { status: true, message: '' };
    if (invoice && (!invoice.payloadExecuted || !invoice.canceledExecuted)) {
      if ((invoice.type === 1 || invoice.type === 2) && invoice.payloadCalculated) {
        const needToPays = invoice.payloadCalculated.locations.filter(
          (r) => r.toParents && r.toParents[Object.keys(r.toParents)[0]].amount
        );
        if (needToPays.length && !invoice.payloadExecuted) {
          if (!invoice.parentPayed) {
            for (const needToPay of needToPays) {
              for (const curParentKey of Object.keys(needToPay.toParents)) {
                const curPay = needToPay.toParents[curParentKey];
                if (curPay.amount !== 0 && curPay.from) {
                  const transaction = await TransactionService.createInvoiceExecutionTransaction(
                    invoice,
                    curPay.amount > 0 ? curPay.from : curParentKey,
                    curPay.amount > 0 ? curParentKey : curPay.from,
                    Math.abs(curPay.amount),
                    curPay.amount < 0,
                    user
                  );
                  const executed = await TransactionService.executeTransaction(transaction);
                  if (executed) invoice.parentPayed = true;
                }
              }
            }
            invoice.parentPayed = true;
            await invoice.save();
          }
        } else {
          invoice.parentPayed = true;
        }
        if (invoice.parentPayed) {
          if (!invoice.locationsExecuted) {
            invoice.locationsExecuted = true;
            invoice.executionHash = uuid();
            // eslint-disable-next-line no-restricted-syntax
            for (const location of invoice.payloadCalculated.locations) {
              // eslint-disable-next-line no-await-in-loop
              const existingSubscriptions = await subscriptionRepository.getLocationSubscriptions(location.locationId);
              // eslint-disable-next-line no-await-in-loop
              const dbLocation = await clientLocationRepository.getClientLocationById(location.locationId);
              if (!dbLocation) throw new ApiError(400, `location by id not found when executing invoice`);
              let hasCancel = false;
              // eslint-disable-next-line no-restricted-syntax
              for (const _package of location.packages) {
                const isDaySubscription = typeof location.day !== 'undefined' && typeof location.month !== 'undefined';
                const { packageId, expireNew, totalPrice, toResaleTotalPrice, stopPrice, toResaleStopPrice } = _package;
                const existings = existingSubscriptions.filter((r) => r.package && r.package._id.toString() === packageId);
                let existingHaveActive = false;
                if (existings.length) {
                  existingHaveActive = existings.filter((r) => r.isActive).length;
                  if (existings.length > 1) {
                    logger.warn(`location has same package subscription more than 1`);
                    // throw new ApiError(400, `location has same package subscription more than 1`);
                  }
                  // eslint-disable-next-line no-restricted-syntax,no-unused-vars
                  for (const item of existings) {
                    // eslint-disable-next-line no-await-in-loop
                    await subscriptionRepository.updateSubscriptionById(item._id.toString(), {
                      state: 0,
                      returnInvoice: invoice._id.toString(),
                    });
                  }
                }
                if (_package.stop) hasCancel = true;

                const compareDate = invoice.createdAt;
                let cancelStop = false;

                if (
                  _package.stop &&
                  _package.expireNew &&
                  _package.expireDate &&
                  _package.expireNew < _package.expireDate &&
                  _package.expireNew > compareDate
                ) {
                  cancelStop = true;
                }

                if (!_package.stop || cancelStop) {
                  const locationPackageSubscriptionBody = {
                    state: 1,
                    // currentPriceGroup: client.priceGroup,
                    // currentDiscounts:  // TODO discount
                    updates: [
                      {
                        hash: invoice.executionHash,
                        selectedMonth: location.month,
                        selectedDay: location.day,
                        selectedDate: isDaySubscription ? expireNew : location.subscribeToDate,
                        startDate: invoice.startDate,
                        room: location.room,
                        endDate: expireNew,
                        totalPrice,
                        toResaleTotalPrice,
                        stopPrice,
                        toResaleStopPrice,
                      },
                    ], // TODO price calculation from price helper utils
                    startDate: invoice.startDate,
                    lastPaymentType: invoice.lastPaymentType,
                    lastExecutionHash: invoice.executionHash,
                    recurringPayment: _package.recurringPayment,
                    endDate: _package.expireNew,
                    provider: dbLocation.clientId.provider,
                    client: dbLocation.clientId._id,
                    package: _package.packageId,
                    room: location.room,
                    isActive: existingHaveActive ? 1 : 0,
                    location: dbLocation._id.toString(),
                    invoice: invoice._id.toString(),
                  };

                  // eslint-disable-next-line no-await-in-loop
                  await Subscription.create(locationPackageSubscriptionBody);

                  // eslint-disable-next-line no-await-in-loop
                  await clientRepository.updateClientById(dbLocation.clientId._id.toString(), {
                    subscriptionExpireDate: expireNew,
                    subscriptionState: existingHaveActive !== 0 ? 3 : 1,
                  });

                  // update location room
                  // eslint-disable-next-line no-await-in-loop
                  await clientLocationRepository.updateClientLocationById(location.locationId, {
                    roomsCount: location.room,
                    roomsCountNew: location.room,
                  });
                }
                // eslint-disable-next-line no-await-in-loop
                // create subscription
              }
              if (hasCancel) cancelIds.push(dbLocation._id.toString());
              // invoice.payloadCalculated.

              // todo update locations for sync;
              // mark to sync
              // eslint-disable-next-line no-await-in-loop
              await LocationSyncService.markToSync(location.locationId, true);
            }

            if (invoice.payloadCalculated.equipment) {
              const { equipmentInfos } = invoice.payloadCalculated.equipment;
              // eslint-disable-next-line no-restricted-syntax
              for (const equipmentInfo of equipmentInfos) {
                // eslint-disable-next-line no-await-in-loop
                const equipment = await equipmentRepository.getEquipmentById(equipmentInfo);
                // eslint-disable-next-line no-continue
                if (!equipment) continue;
                const foundBodies = invoice.payloadCalculated.equipment?.equipments.filter(
                  (r) => r.equipment?.id === equipmentInfo
                );
                if (foundBodies.length) {
                  const saveEquipment = foundBodies[0];
                  saveEquipment.client = invoice.client.toString();
                  saveEquipment.equipment = saveEquipment.equipment?.id;
                  saveEquipment.invoice = invoice._id.toString();
                  // eslint-disable-next-line no-await-in-loop
                  await equipmentSubscriptionRepository.createEquipmentSubscription(saveEquipment);
                }
              }
            }

            invoice.locationsExecuted = true;
            await invoice.save();
          } else {
            const invoiceSubscriptions = await subscriptionRepository.getList({ invoice: invoice._id.toString() });
            for (const invoiceSubscription of invoiceSubscriptions) {
              await subscriptionRepository.updateSubscriptionById(invoiceSubscription._id.toString(), { state: 1 });
            }
          }
          // shipping part
          if (invoice.isShipping && invoice.payloadCalculated.shippingData && !invoice.canceledExecuted) {
            if (invoice.parentPayed) {
              try {
                const shipping = await ShippingService.createShipping({
                  ...invoice.payloadCalculated.shippingData,
                  provider: invoice.provider,
                  invoice: invoice.id,
                });
                if (shipping) {
                  // TODO test
                  const shippingExecutionResponse = await ShippingService.executeShipping(shipping);
                  if (shippingExecutionResponse.shipment) {
                    const shippingUpdateBody = {
                      easyship_shipment_id: shippingExecutionResponse.shipment.easyship_shipment_id,
                      delivery_state: shippingExecutionResponse.shipment.delivery_state,
                      pickup_state: shippingExecutionResponse.shipment.pickup_state,
                      label_state: shippingExecutionResponse.shipment.label_state,
                      shipment_state: shippingExecutionResponse.shipment.shipment_state,
                      insurance: shippingExecutionResponse.shipment.insurance,
                      easyship_updated_at: new Date(shippingExecutionResponse.shipment.updated_at),
                      tracking_page_url: shippingExecutionResponse.shipment.tracking_page_url,
                      selected_courier: shippingExecutionResponse.shipment.selected_courier?.id,
                    };
                    // const labelResponse = {
                    //   status: false,
                    //   message: 'disabled',
                    // };
                    const labelResponse = await ShippingService.createLabel({
                      ...shippingUpdateBody,
                      provider: invoice.to_provider,
                    });
                    if (labelResponse.status) {
                      const { label } = labelResponse;
                      shippingUpdateBody.label = label;
                      const updatedShipping = await shippingRepository.updateShippingById(shipping._id, shippingUpdateBody);
                      await NotificationService.GenerateShippingCreateNotification(updatedShipping);
                      invoice.payloadExecuted = true;
                      invoice.shippingExecuted = true;
                    } else {
                      result.status = false;
                      result.message = labelResponse.message;
                      await shippingRepository.updateShippingById(shipping._id, shippingUpdateBody);
                    }
                    logger.info(`syncing provider shippings from remote...`);
                    await ShippingService.syncEasyshipShippings(shipping.provider);
                  } else {
                    result.status = false;
                    result.message = shippingExecutionResponse.message;
                  }
                }
              } catch (exc) {
                result.status = false;
                result.message = exc.toString();
                logger.error(`error executing shipping`);
              }
            } else {
              result.status = false;
              result.message = `parent provider money not payed`;
            }
          } else if (invoice.parentPayed) {
            invoice.payloadExecuted = true;
          }
          if (invoice.state === 1) {
            invoice.sent = true;
          }
          // when executed, call save;
          await invoice.save(); // save invoice state

          await ClientActivityService.AddPackageUpdateLog({
            user,
            action: {
              type: 'BUY',
              amount: invoice.totalAmount,
            },
            client: invoice.client,
            provider: invoice.provider,
          });
        }
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await SubscriptionService.updateSubscriptionStates(invoice.client.toString(), cancelIds);
    result.invoice = invoice;
    return result;
  }
}

module.exports = InvoiceService;
