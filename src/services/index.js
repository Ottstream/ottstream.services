module.exports.authService = require('./auth/auth.service');
module.exports.cacheService = require('./cache/CacheService');
module.exports.cacheRedisService = require('./cache/RedisCache');
module.exports.chatService = require('./chat/ChatService');
module.exports.ClientService = require('./client/ClientActivityService');
module.exports.emailService = require('./email/EmailService.service');
module.exports.eventbusService = require('./event_bus/eventbusService.service');
module.exports.exelService = require('./excel/excel.service');
module.exports.geoipService = require('./geoip/geoip.service');
module.exports.locationService = require('./location/LocationService.service');
module.exports.notificationService = require('./notification/notification.service');
module.exports.paymentMerchantAuthorizeResponseService = require('./payment/merchant/authorize_response_codes');
module.exports.paymentMerchantAuthorizeService = require('./payment/merchant/authorize.service');
module.exports.paymentMerchantCheckeeperService = require('./payment/merchant/checkeeper.service');
module.exports.paymentMerchantCloverService = require('./payment/merchant/clover.service');
module.exports.paymentMerchantSquareService = require('./payment/merchant/square.service');
module.exports.paymentMerchantStripeService = require('./payment/merchant/stripe.service');
module.exports.paymentMerchantTaxjarService = require('./payment/merchant/taxjar.service');
module.exports.paymentCardService = require('./payment/card.service');
module.exports.paymentInvoiceService = require('./payment/invoice.service');
module.exports.paymentObjectValidatorService = require('./payment/payment_object_validator.service');
module.exports.paymentTransactionService = require('./payment/transaction.service');
module.exports.postalService = require('./postal/postal.service');
module.exports.printerService = require('./printer/printer.service');
module.exports.roleService = require('./role/role.service');
module.exports.roleModelService = require('./role/models/ott_permission.model');
module.exports.sharedAggregationService = require('./shared/aggregation.service');
module.exports.sharedAxiosService = require('./shared/axios.service');
module.exports.sharedTimezonService = require('./shared/timezone.service');
module.exports.shipingMerchantService = require('./shiping/merchant/easyship.service');
module.exports.shippingService = require('./shiping/shipping.service');
module.exports.smsService = require('./sms/twilio.service');
module.exports.socketBroadcastService = require('./socket/broadcastService.service');
module.exports.socketWsService = require('./socket/ws.services');
module.exports.statisticsService = require('./statistics/statistic.service');
module.exports.streetService = require('./street/street.service');
module.exports.subscriptionService = require('./subscription/subscription.service');
module.exports.syncLiveService = require('./sync/live/live_sync.service');
module.exports.syncLocationService = require('./sync/location/location_sync.service');
module.exports.syncLocationCrudService = require('./sync/location/location_sync_crud.service');
module.exports.syncLocationModelService = require('./sync/location/location_sync_model.service');
module.exports.syncLocationUsedDeviceCrudService = require('./sync/location/used_device/location_used_device_sync_crud.service');
module.exports.syncLocationUsedDeviceService = require('./sync/location/used_device/location_used_device_sync.service');
module.exports.syncOttproviderCrudService = require('./sync/ott_provider/ott_sync_crud.service');
module.exports.syncOttproviderService = require('./sync/ott_provider/ott_sync.service');
module.exports.syncPackageService = require('./sync/package/package_sync.service');
module.exports.telegramBotService = require('./telegram/telegram_bot.service');
module.exports.telegramService = require('./telegram/telegram.service');
module.exports.tokenService = require('./token/token.service');
module.exports.collectionService = require('./service_collection');
















































