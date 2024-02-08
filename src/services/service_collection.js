class ServiceCollection {
  constructor() {
    this.services = {};

    this.filteredClients = (key) => {
      this.services[key] = this.services[key].filter((r) => r && r._readyState === 1);
    };
  }

  send(key, scope, message) {
    if (this.services[key]) {
      this.filteredClients(key);
      this.services[key].forEach((client) => {
        client.send(
          JSON.stringify({
            scope,
            message,
          })
        );
      });
    }
  }

  addSingleton(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'singleton',
    };
  }

  addScoped(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'scoped',
    };
  }

  addTransient(_name, _class, params = {}) {
    this.services[_name] = {
      Method: _class,
      instance: null,
      params,
      type: 'transient',
    };
  }

  getService(_name, getClass = false) {
    let responseInstance;
    if (_name in this.services) {
      const service = this.services[_name];
      const { type, Method, instance, params } = service;
      switch (type) {
        case 'singleton':
          if (!instance) service.instance = new Method(params);
          responseInstance = getClass ? Method : service.instance;
          break;
        case 'scoped':
          responseInstance = getClass ? Method : new Method(params);
          break;
        case 'transient':
          responseInstance = getClass ? Method : new Method(params);
          break;
        default:
          responseInstance = getClass ? Method : new Method(params);
          break;
      }
    }
    return responseInstance;
  }
}

const serviceCollection = new ServiceCollection();

const AuthorizeService = require('./payment/merchant/authorize.service');
const StripeService = require('./payment/merchant/stripe.service');
const CloverService = require('./payment/merchant/clover.service');
const PaymentObjectValidator = require('./payment/payment_object_validator.service');
const EasyshipService = require('./shiping/merchant/easyship.service');
const CheckeeperService = require('./payment/merchant/checkeeper.service');
const TaxjarService = require('./payment/merchant/taxjar.service');
const SocketService = require('./socket/ws.services');
const ExcelService = require('./excel/excel.service');
const AxiosService = require('./shared/axios.service');
const TimezoneService = require('./shared/timezone.service');
const AggregationService = require('./shared/aggregation.service');
const EventBusService = require('./event_bus/eventbusService.service');
const RedisCache = require('./cache/RedisCache');
const TelegramBotService = require('./telegram/telegram_bot.service');

serviceCollection.addTransient('authorizeService', AuthorizeService, {});
serviceCollection.addTransient('stripeService', StripeService, {});
serviceCollection.addTransient('cloverService', CloverService, {});
serviceCollection.addTransient('paymentObjectValidator', PaymentObjectValidator, {});
serviceCollection.addTransient('easyshipService', EasyshipService, {});
serviceCollection.addTransient('checkeeperService', CheckeeperService, {});
serviceCollection.addTransient('taxjarService', TaxjarService, {});
serviceCollection.addTransient('excelService', ExcelService, {});
serviceCollection.addTransient('axiosService', AxiosService, {});
serviceCollection.addTransient('timezoneService', TimezoneService, {});
serviceCollection.addTransient('aggregationService', AggregationService, {});

serviceCollection.addSingleton('socketService', SocketService, {});
serviceCollection.addSingleton('receiverEventBusService', EventBusService, {});
serviceCollection.addSingleton('publisherEventBusService', EventBusService, { connect: true });
serviceCollection.addSingleton('redisCacheStore', RedisCache, { connect: true });
serviceCollection.addSingleton('telegramBotService', TelegramBotService, {});

module.exports = serviceCollection;
