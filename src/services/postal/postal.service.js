/* eslint-disable prefer-promise-reject-errors */
const Postal = require('@atech/postal');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../../utils/logger/logger');

class PostalMethodService {
  // eslint-disable-next-line class-methods-use-this
  static async sendEmails(emails, postalConfig) {
    if (!postalConfig) {
      throw new Error(`postal config not set`);
    }
    // Create a new Postal client using a server key generated using your
    // installation's web interface
    const client = new Postal.Client(postalConfig.host, postalConfig.apiKey);

    // Create a new message
    const message = new Postal.SendMessage(client);

    // Add some recipients
    // eslint-disable-next-line no-restricted-syntax
    for (const email of emails) {
      message.to(email);
    }

    // Specify who the message should be from - this must be from a verified domain
    // on your mail server
    message.from(postalConfig.from);

    // Set the subject
    message.subject(postalConfig.subject);

    // Set the content for the e-mail
    // message.plainBody(postalConfig.plainBody);
    message.htmlBody(postalConfig.htmlBody);

    // Add any custom headers
    message.header('X-PHP-Test', 'value');

    // Attach any files
    // message.attach('textmessage.txt', 'text/plain', 'Hello world!');

    // Send the message and get the result
    message
      .send()
      .then(function (result) {
        const recipients = result.recipients();
        // Loop through each of the recipients to get the message ID
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const email in recipients) {
          const currentMessage = recipients[email];
          logger.info(currentMessage.id()); // Logs the message ID
          logger.info(currentMessage.token()); // Logs the message's token
        }
      })
      .catch(function (error) {
        // Do something with the error
        logger.error(error.code);
        logger.error(error.message);
      });
    return true;
  }

  static async SendLatterWithAddress(clientInfo, providerInfo, invoiceInfo, secretKey) {
    const apiUrl = 'https://api.secure.postalmethods.com/v1/Letter/sendWithAddress';
    const { filePath } = invoiceInfo;

    let isColored = true;
    let returnEnvelope = false;
    if (!invoiceInfo?.invoiceSettings?.postalMethod || invoiceInfo?.invoiceSettings?.postalMethod === 'manual')
      return new Promise(function (resolve) {
        // do a thing, possibly async, then…
        resolve({ status: false, message: 'Postal Method not selected from Company Invoice Settings' });
      });
    if (invoiceInfo?.invoiceSettings?.postalMethod) {
      if (invoiceInfo?.invoiceSettings?.postalMethod === 'bw') isColored = false;
      if (invoiceInfo?.invoiceSettings?.returnEnvelope) returnEnvelope = true;
    }
    const clientAddress = clientInfo.addresses.filter((r) => r.forContactInvoice).length
      ? clientInfo.addresses.filter((r) => r.forContactInvoice)[0]
      : clientInfo.addresse[0];
    const formData = {
      myDescription: `invoice for client ${clientInfo?.personalInfo?.firstname} ${clientInfo?.personalInfo?.lastname}`,
      perforation: 'false',
      replyOnEnvelope: returnEnvelope ? 'true' : 'false',
      'returnAddress.Name': providerInfo.providerInfo.name.length
        ? providerInfo.providerInfo.name[0].name
        : 'no provider name',
      'returnAddress.Company': providerInfo.addressInfo.companyName,
      'returnAddress.AddressLine1': providerInfo.addressInfo.address,
      'returnAddress.AddressLine2': providerInfo.addressInfo.address,
      'returnAddress.City': providerInfo.addressInfo.city,
      'returnAddress.State': providerInfo.addressInfo.state,
      'returnAddress.Zipcode': providerInfo.addressInfo.zip,
      'returnAddress.Country': providerInfo.addressInfo.country,
      'sendToAddress.Name': `${clientAddress.firstname} ${clientAddress.lastname}`,
      'sendToAddress.Company': '',
      'sendToAddress.AddressLine1': `${clientAddress.address} ${clientAddress.suite}`,
      'sendToAddress.AddressLine2': '',
      'sendToAddress.City': clientAddress.city,
      'sendToAddress.State': clientAddress.province,
      'sendToAddress.Zipcode': clientAddress.zip,
      'sendToAddress.Country': clientAddress.country,
      fileUrl: '',
      templateId: '0',
      isColored: isColored ? 'true' : 'false',
      isDoubleSided: 'false',
      appendPageForAddress: 'false',
      isReturnAddressAppended: 'true',
      // 'replyonEvelopeAddress.Name': providerInfo.providerInfo.name.length
      //   ? providerInfo.providerInfo.name[0].name
      //   : 'no provider name',
      'replyonEvelopeAddress.AddressLine1': providerInfo.addressInfo.address,
      // 'replyonEvelopeAddress.AddressLine2': providerInfo.addressInfo.address,
      'replyonEvelopeAddress.Company': providerInfo.addressInfo.companyName,
      'replyonEvelopeAddress.City': providerInfo.addressInfo.city,
      'replyonEvelopeAddress.State': providerInfo.addressInfo.state,
      'replyonEvelopeAddress.Zipcode': providerInfo.addressInfo.zip,
      'replyonEvelopeAddress.Country': providerInfo.addressInfo.country,
      appendReplyOnEnvelopeAddress: 'true',
    };

    const data = new FormData();
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in formData) {
      data.append(key, formData[key]);
    }
    const fileStream = await fs.createReadStream(filePath);
    data.append('File', fileStream);
    const headers = {
      'Secret-Key': secretKey,
      ...data.getHeaders(),
    };
    // data.append('file', fs.createReadStream(filePath));

    return new Promise(function (resolve) {
      // do a thing, possibly async, then…
      axios
        .post(apiUrl, data, { headers })
        .then((response) => {
          resolve({ status: true, response });
        })
        .catch((error) => {
          logger.error('Error:', error);
          resolve({ status: false, error, message: `invoice postal sent error: ${error?.response?.data?.error?.message}` });
        });
    });
  }

  static async CancelLatter(invoice, secretKey) {
    if (invoice.postalMethodId) {
      const apiUrl = `https://api.secure.postalmethods.com/v1/Letter/${invoice.postalMethodId}/cancel`;

      const headers = {
        'Secret-Key': secretKey,
      };
      return new Promise(function (resolve) {
        // do a thing, possibly async, then…
        axios
          .put(apiUrl, {}, { headers })
          .then((response) => {
            resolve({ status: true, response });
          })
          .catch((error) => {
            logger.error('Error:', error);
            resolve({
              status: false,
              error,
              message: `invoice postal cancel error: ${error?.response?.data?.error?.message}`,
            });
          });
      });
    }
    // data.append('file', fs.createReadStream(filePath));

    return new Promise(function (resolve) {
      resolve({ status: false, message: `invoice does not have postal methods id` });
    });
  }

  static async GetStatus(invoice, secretKey) {
    if (invoice.postalMethodId) {
      const apiUrl = `https://api.secure.postalmethods.com/v1/Letter/status?Id=${invoice.postalMethodId}`;

      const headers = {
        'Secret-Key': secretKey,
      };
      return new Promise(function (resolve, reject) {
        // do a thing, possibly async, then…
        axios
          .get(apiUrl, { headers })
          .then((response) => {
            resolve({ status: true, response });
          })
          .catch((error) => {
            reject({
              status: false,
              error,
              message: `invoice postal get status error: ${error?.response?.data?.error?.message}`,
            });
          });
      });
    }
    // data.append('file', fs.createReadStream(filePath));

    return new Promise(function (resolve, reject) {
      reject({ status: false, message: `invoice does not have postal methods id` });
    });
  }

  static async GetBalance(secretKey) {
    const apiUrl = `https://api.secure.postalmethods.com/v1/balance`;

    const headers = {
      'Secret-Key': secretKey,
    };
    return new Promise(function (resolve) {
      // do a thing, possibly async, then…
      axios
        .get(apiUrl, { headers })
        .then((response) => {
          resolve({ status: true, response });
        })
        .catch((error) => {
          resolve({
            status: false,
            error,
            message: `error: ${error?.response?.data?.error?.message}`,
          });
        });
    });
  }
}
module.exports = PostalMethodService;
