const nodemailer = require('nodemailer');
const { repositories } = require('ottstream.dataaccess');
const config = require('../../config/config');
const logger = require('../../utils/logger/logger');

const { ottProviderEmailRepository } = repositories;

const registrationHtml = `
        <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi Name
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Email about approval process.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
         Dear Name,
         Your registration application has been submitted to review.
         You'll get an email after verification.
        </p>
          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;

const registrationApproveHtml = `
         <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi Name
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Email about approval process.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
         Congratulations, your account has been successfully created.

<a style='color: #ffffff;
        border-radius: 4px;
        background-color: #01b2b8;
        padding:10px 16px;
        text-align:center;

      display:block;
          width:100px;
          margin:0 auto;
          margin-top:30px;'

    href='BASE_URL/auth/sign-in'
         > Sign In </a>
          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;

const registrationRejectHtml = ` <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi Name
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Email about approval process.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
Sorry Your account was not approved You will receive an email about why your application was rejected.

          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>`;

const transport = nodemailer.createTransport({
  service: 'Yandex',
  auth: {
    user: config.email.smtp.auth.user,
    pass: config.email.smtp.auth.pass,
  },
}); // TODO if works on production normal move to configs: config.email.smtp Object file

/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch((e) => logger.warn(e.message));
}

class EmailService {
  static resetPasswordHtml(name, baseUrl, token) {
    return `
         <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi ${name}
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Here are your password reset instructions.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
         A request to reset your password has been made. If you did not make this request, simply ignore this email.
         If you did make this request, please reset your password.

<a style='color: #ffffff;
        border-radius: 4px;
        background-color: #01b2b8;
        padding:10px 16px;
        text-align:center;

      display:block;
          width:100px;
          margin:0 auto;
          margin-top:30px;'

    href='${baseUrl}/auth/password-change?token=${token}'
         > Reset Password </a>
          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;
  }

  static emailResetPasswordHtml(name, frontUrl, token) {
    return `
         <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi ${name}
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Here are your password reset instructions.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
         An email was requested to reset your password.

<a style='color: #ffffff;
        border-radius: 4px;
        background-color: #01b2b8;
        padding:10px 16px;
        text-align:center;

      display:block;
          width:100px;
          margin:0 auto;
          margin-top:30px;'

href='${frontUrl}/auth/password-change?token=${token}'
         > Reset Password </a>
          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;
  }

  static generateLoginPasswordHtml(name, password, login) {
    return `
         <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          Hi ${name}
        </h1>
        <span style=" color: #A5AAC6;
              font-size: 14px;
              padding-bottom: 25px;
              margin: 0 0 25px 0;
              border-bottom: 1px solid #D6D9E5;font-family: 'Segoe UI';">
              Here are the instructions for your new password.
        </span>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
       A request to generate your login and password has been made. If you didn't make this request, just ignore this email.
       If you have made this request, please give yours login: ${login} and password: ${password}.

          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;
  }

  static sendNotificationHtml(name, defaultSalePercent, dateStart, dateEnd) {
    return `
         <div style='
         max-width: 600px;
         width: 100%;
         background: #FFFFFF 0% 0% no-repeat padding-box;
         box-shadow: 0px 0px 13px #A5AAC626;
         margin: 0 auto';
        >
        <div style="background-image: url('https://i.ibb.co/p45PtKc/Group-56.png');
         background-position: center;
         background-repeat: no-repeat;
         background-size: contain;
         width: 200px;
         height: 80px;
         margin: 0px auto 60px";
         ></div>
        <div style='  width: 600px;
          height: 364px;
          padding: 25px;
          background: white;
          border-radius: 4px;
          margin: 0 auto;
'>
      <h1 style=" font-size: 18px;
          font-weight: 500;
          color: #164066;
          font-family: 'Segoe UI';
          margin-bottom: 10px;">
          You can take advantage of this ${name} discount
        </h1>
        <p style="color: #164066;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 50px;font-family: 'Segoe UI';
          margin-top: 45px; max-width: 600px;">
         Some text about discount...
         The ${defaultSalePercent} discount will last from ${dateStart} to ${dateEnd} days.
          <h3 style="
               color: #164066; font-size: 14px; font-family: 'Segoe UI'; display: block; font-weight: 500;
                text-align: center">
              Thank you,<br/>
              Team Ottstream
           </h3>
</div>
</div>
    <div style='width: 430px; margin: 70px auto;'>
      <span style='width:100%;
                  display:block;
                  margin-bottom:25px;
                  height:1px;
                  background-color:#8080804a
                  '></span>
    <img src='https://i.ibb.co/8MfD3W6/Logo-icon-2x.png'
         style='width: 45px;height: 45px;margin: 30px auto 57px;display: block;'
</div>
`;
  }

  static async sendEmail(to, subject, html, customConfig) {
    // eslint-disable-next-line no-unused-vars
    const msg = { from: config.email.smtp.auth.user, to, subject, html };
    try {
      let customTransport = null;
      if (customConfig) {
        /* smtp: {
          ssl: {
            type: Boolean,
              required: false,
          },
          server: { type: String, required: false },
          port: { type: Number, min: 1, max: 65534, required: false },
          username: { type: String, required: false },
          password: { type: String, required: false },
        }, */
        // customTransport = nodemailer.createTransport({
        //   service: 'Yandex',
        //   auth: {
        //     user: customConfig.username,
        //     pass: customConfig.password,
        //   },
        // }); // TODO if works on production normal move to configs: config.email.smtp Object file

        const customSmtpConfig = {
          host: customConfig.server, // Replace with your SMTP server host
          port: customConfig.port, // Replace with your SMTP server port
          secure: customConfig.ssl, // Set to true for SSL, false for non-secure
          auth: {
            user: customConfig.username, // Replace with your SMTP username
            pass: customConfig.password, // Replace with your SMTP password
          },
        };

        msg.from = customConfig.username;
        customTransport = nodemailer.createTransport(customSmtpConfig);
      }
      const port = customTransport || transport;
      await port.sendMail(msg);
    } catch (ex) {
      logger.error(ex);
    }
  }

  static async isValidConfig(customConfig) {
    const response = {
      status: false,
      message: ``,
    };
    if (!customConfig?.server) return response;
    const customSmtpConfig = {
      host: customConfig?.server, // Replace with your SMTP server host
      port: customConfig?.port, // Replace with your SMTP server port
      secure: customConfig?.ssl, // Set to true for SSL, false for non-secure
      auth: {
        user: customConfig?.username, // Replace with your SMTP username
        pass: customConfig?.password, // Replace with your SMTP password
      },
    };

    const customTransport = nodemailer.createTransport(customSmtpConfig);
    try {
      await customTransport.verify();
      response.status = true;
    } catch (ex) {
      logger.error(ex);
      response.status = false;
      response.message = ex;
    }
    return response;
  }

  static async sendNotification(to, name, defaultSalePercent, dateStart, dateEnd, customConfig) {
    const subject = 'Discount send notification';
    const html = EmailService.sendNotificationHtml(name, defaultSalePercent, dateStart, dateEnd, customConfig);
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendResetPasswordEmail(to, token, name, customConfig) {
    const subject = 'Reset password';
    const html = EmailService.resetPasswordHtml(name, config.front_url, token);
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendGenerateLoginPassword(to, password, login, name, providerId) {
    const emails = await ottProviderEmailRepository.getProviderEmails(providerId);
    let customConfig = null;
    if (emails.filter((r) => r.forSend).length) {
      customConfig = emails.filter((r) => r.forSend)[0].smtp;
    }
    const subject = 'Generate new login and password';
    const html = EmailService.generateLoginPasswordHtml(name, password, login);
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendCheckEmail(to, subject, body, providerId) {
    const emails = await ottProviderEmailRepository.getProviderEmails(providerId);
    let customConfig = null;
    if (emails.filter((r) => r.forSend).length) {
      customConfig = emails.filter((r) => r.forSend)[0].smtp;
    }
    const html = body;
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendEmailResetPasswordToken(to, name, token, customConfig) {
    const subject = 'Ott provider reset password';
    const html = EmailService.emailResetPasswordHtml(name, config.front_url, token);
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendRegistrationEmail(to, name, customConfig) {
    const subject = 'Ott provider registration';
    const find = 'Name';
    // eslint-disable-next-line security/detect-non-literal-regexp
    const html = registrationHtml.replace(new RegExp(find, 'g'), name);
    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendRegistrationApproveEmail(to, name, customConfig) {
    const subject = 'Ott provider registration';
    const temp = registrationApproveHtml.replace('Name', name);
    const html = temp.replace('BASE_URL', config.front_url);

    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async sendRegistrationRejectEmail(to, name, customConfig) {
    const subject = 'Ott provider registration';
    const html = registrationRejectHtml.replace('Name', name);

    await EmailService.sendEmail(to, subject, html, customConfig);
  }

  static async GetTransport() {
    return transport;
  }
}

module.exports = EmailService;
