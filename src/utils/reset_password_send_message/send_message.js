const nodemailer = require('nodemailer');
const config = require('../../config/config');

const sendEmail = async (email, text) => {
  try {
    const smtpTransport = nodemailer.createTransport(config.email.smtp.full);

    await smtpTransport.sendMail({
      from: config.email.smtp.auth.user,
      to: email,
      subject: 'Your password has been changed',
      // eslint-disable-next-line no-undef
      text,
    });
  } catch {
    throw new Error('Email not sent');
  }
};

module.exports = { sendEmail };
