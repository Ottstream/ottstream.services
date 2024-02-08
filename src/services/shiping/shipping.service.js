const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');
// eslint-disable-next-line no-unused-vars
const EasyShipService = require('./merchant/easyship.service');

const {
  shippingRepository,
  clientRepository,
  ottProviderAddressRepository,
  easyshipCourierRepository,
  equipmentRepository,
} = repositories;
const ApiError = require('../../api/utils/error/ApiError');
const EasyshipService = require('./merchant/easyship.service');

class ShippingService {
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  static async executeShipping(shipping) {
    logger.info('executing shipping to EasyShip');
    try {
      const incomingCategories = await EasyshipService.getItemCategories(shipping.provider);
      const easyshipCategories = incomingCategories.data.item_categories;
      const remoteBoxResponse = await EasyshipService.getBoxes(shipping.provider);
      const { boxes } = remoteBoxResponse.data;
      const percels = [];
      const equipmentItems = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const equipmentId of shipping.equipments) {
        // eslint-disable-next-line no-await-in-loop
        const dbEquipment = await equipmentRepository.getEquipmentById(equipmentId);
        let price = null;
        const quantity = 1;
        if (dbEquipment.prices.length) {
          if (dbEquipment.prices[0].pieces && dbEquipment.prices[0].pieces.filter((r) => r.piece === quantity).length) {
            price = dbEquipment.prices[0].pieces.filter((r) => r.piece === quantity)[0].price;
          }
        }
        const categoryNum = dbEquipment.information.category;
        let categoryName = null;
        if (categoryNum) {
          if (easyshipCategories.filter((r) => r.id === categoryNum).length) {
            categoryName = easyshipCategories.filter((r) => r.id === categoryNum)[0].slug;
          }
        }
        equipmentItems.push({
          description: dbEquipment.description ?? `no description`,
          category: categoryName,
          sku: dbEquipment.sku ?? 'no_sku_on_equipment',
          quantity: 1,
          dimensions: {
            length: dbEquipment?.information?.length,
            width: dbEquipment?.information?.width,
            height: dbEquipment?.information?.height,
          },
          actual_weight: shipping.boxes[0].weight / shipping.equipments.length,
          declared_currency: 'USD',
          declared_customs_value: price,
        });
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const box of shipping.boxes) {
        const boxInfo = {
          total_actual_weight: box.weight,
          box: {
            slug: !box.box ? null : boxes.filter((r) => r.id === box.box)[0].slug,
            length: box.length,
            width: box.width,
            height: box.height,
          },
          description: 'no description',
          items: equipmentItems,
        };
        percels.push(boxInfo);
      }
      const originZip = shipping.shipFrom.zip.split('-').length
        ? shipping.shipFrom.zip.split('-')[0]
        : shipping.shipFrom.zip;
      // eslint-disable-next-line camelcase
      const origin_address = {
        line_1: shipping.shipFrom.address,
        line_2: shipping.shipFrom.unit,
        state: shipping.shipFrom.state,
        city: shipping.shipFrom.city,
        postal_code: originZip,
        country_alpha2: shipping.shipFrom.country,
        contact_name: shipping.shipFrom.companyName,
        company_name: shipping.shipFrom.companyName,
        contact_phone: shipping.shipFrom.phone.number,
        contact_email: shipping.shipFrom.email,
      };
      const destinationZip = shipping.shipTo.zip.split('-').length ? shipping.shipTo.zip.split('-')[0] : shipping.shipTo.zip;
      // eslint-disable-next-line camelcase
      const destination_address = {
        line_1: shipping.shipTo.address,
        state: shipping.shipTo.province,
        city: shipping.shipTo.city,
        postal_code: destinationZip,
        country_alpha2: shipping.shipTo.country,
        contact_name: `${shipping.shipTo.firstname} ${shipping.shipTo.lastname}`,
        company_name: null,
        contact_phone: shipping.shipTo.phone,
        contact_email: shipping.shipTo.email,
      };
      // TODO create invoice with easyship service
      const executed = await EasyshipService.createShipment(
        {
          origin_address,
          sender_address: origin_address,
          return_address: origin_address,
          destination_address,
          metadata: {},
          set_as_residential: true,
          consignee_tax_id: null,
          eei_reference: null,
          incoterms: 'DDU',
          insurance: {
            is_insured: !!shipping.isPremiumShipping,
            // insured_amount: 10,
            // insured_currency: 'USD',
          },
          order_data: {
            platform_name: 'ott',
            platform_order_number: null,
            order_tag_list: ['VIP'],
            seller_notes: null,
            buyer_notes: null,
          },
          courier_selection: {
            selected_courier_id: shipping.selectedCourier?.courier_id ?? null,
            allow_courier_fallback: false,
            apply_shipping_rules: true,
          },
          shipping_settings: {
            units: {
              weight: 'lb',
              dimensions: 'in',
            },
            printing_options: {
              format: 'pdf',
              label: '4x6',
              commercial_invoice: 'A4',
              packing_slip: 'none',
            },
            buy_label: false,
            buy_label_synchronous: false,
          },
          parcels: percels,
        },
        shipping.provider
      );
      return {
        shipment: executed.data.shipment,
        status: executed.data.status,
      };
      // TODO from here tests
    } catch (ex) {
      return {
        status: false,
        message: ex.response?.data?.error?.message,
      };
    }
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  static async createLabel(shipping) {
    logger.info('creating shipping Label');
    try {
      const executed = await EasyshipService.labels(
        {
          shipments: [
            {
              easyship_shipment_id: shipping.easyship_shipment_id,
              // courier_id: shipping.selected_courier,
            },
          ],
        },
        shipping.provider
      );
      return {
        label: executed.data.labels[0],
        meta: executed.data.status,
        status: true,
      };
      // TODO from here tests
      // eslint-disable-next-line no-unreachable
    } catch (ex) {
      return {
        message: ex?.response?.data?.error?.message,
        status: false,
      };
    }
  }

  static async getEasyshipCouriers(providerId) {
    const dbCouriers = await easyshipCourierRepository.getEasyshipCouriers();
    if (!dbCouriers.length) {
      const couriersData1 = await EasyshipService.getCouriers(`?page=1&per_page=100`, providerId);
      const couriersData2 = await EasyshipService.getCouriers(`?page=2&per_page=100`, providerId);
      const couriersData3 = await EasyshipService.getCouriers(`?page=3&per_page=100`, providerId);

      const allCouriers = []
        .concat(couriersData1.data.couriers)
        .concat(couriersData2.data.couriers)
        .concat(couriersData3.data.couriers);
      // eslint-disable-next-line no-restricted-syntax
      for (const currentCourier of allCouriers) {
        // eslint-disable-next-line no-await-in-loop
        await easyshipCourierRepository.createEasyshipCourier({
          courier_id: currentCourier.id,
          logo_url: currentCourier.logo_url,
          data: currentCourier,
        });
      }
      return easyshipCourierRepository.getEasyshipCouriers();
    }
    return dbCouriers;
  }

  static async getRatesWorker(isShippingObject, incomingData, providerId) {
    const returnObject = { success: true };
    let rates = [];
    let ratesData = {};
    let shippingData = incomingData;
    if (!isShippingObject) {
      const dbClient = await clientRepository.getClientById(incomingData.client);
      if (!dbClient) {
        returnObject.success = false;
        returnObject.message = 'client not found';
        return returnObject;
      }

      const { addresses } = dbClient;
      const searchAddresses = addresses.filter((r) => r._id.toString() === incomingData.shipTo);
      if (!searchAddresses.length) {
        returnObject.success = false;
        returnObject.message = 'shipTo address not found';
        return returnObject;
      }

      const ottAddress = await ottProviderAddressRepository.getOttProviderAddressById(incomingData.shipFrom);
      if (!ottAddress) {
        returnObject.success = false;
        returnObject.message = 'shipFrom address not found';
        return returnObject;
      }

      const shipToAddress = searchAddresses[0];
      delete shipToAddress._id;
      delete ottAddress._id;

      shippingData = {
        client: incomingData.client,
        shipTo: shipToAddress,
        shipFrom: ottAddress,
        returnLabel: incomingData.returnLabel,
        isPremiumShipping: incomingData.isPremiumShipping,
        isStandartPickup: incomingData.isStandartPickup,
        addressOnLabel: incomingData.addressOnLabel,
        selectedCourier: incomingData.selectedCourier,
        equipments: incomingData.equipments,
        boxes: incomingData.boxes,
      };
    }
    try {
      const percels = [];
      const equipmentItems = [];
      const remoteBoxResponse = await EasyshipService.getBoxes();
      const { boxes } = remoteBoxResponse.data;
      // eslint-disable-next-line no-restricted-syntax
      for (const equipmentId of shippingData.equipments) {
        // eslint-disable-next-line no-await-in-loop
        const dbEquipment = await equipmentRepository.getEquipmentById(equipmentId);
        let price = null;
        const quantity = 1;
        if (dbEquipment.prices.length) {
          if (dbEquipment.prices[0].pieces && dbEquipment.prices[0].pieces.filter((r) => r.piece === quantity).length) {
            price = dbEquipment.prices[0].pieces.filter((r) => r.piece === quantity)[0].price;
          }
        }
        equipmentItems.push({
          description: dbEquipment.description,
          category: 'accessory_no_battery',
          sku: dbEquipment.sku ?? 'no_sku_on_equipment',
          quantity,
          dimensions: {
            length: dbEquipment.information.length,
            width: dbEquipment.information.width,
            height: dbEquipment.information.height,
          },
          actual_weight: shippingData.boxes[0].weight / shippingData.equipments.length,
          declared_currency: 'USD',
          declared_customs_value: price,
        });
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const box of shippingData.boxes) {
        const boxInfo = {
          total_actual_weight: box.weight,
          box: {
            slug: !box.box ? null : boxes.filter((r) => r.id === box.box)[0].slug,
          },
          items: equipmentItems,
        };
        if (!box.box) {
          boxInfo.box.length = box.length;
          boxInfo.box.width = box.width;
          boxInfo.box.height = box.height;
        }
        percels.push(boxInfo);
      }
      const originZip = shippingData.shipFrom.zip.split('-').length
        ? shippingData.shipFrom.zip.split('-')[0]
        : shippingData.shipFrom.zip;
      const destinationZip = shippingData.shipTo.zip.split('-').length
        ? shippingData.shipTo.zip.split('-')[0]
        : shippingData.shipTo.zip;
      ratesData = await EasyshipService.getRates(
        {
          origin_address: {
            line_1: shippingData.shipFrom.address,
            line_2: shippingData.shipFrom.unit,
            state: shippingData.shipFrom.state,
            city: originZip,
            postal_code: shippingData.shipFrom.zip,
            country_alpha2: shippingData.shipFrom.country,
            contact_name: shippingData.shipFrom.companyName,
            company_name: shippingData.shipFrom.companyName,
            contact_phone: shippingData.shipFrom.phone.number,
          },
          destination_address: {
            line_1: shippingData.shipTo.address,
            state: shippingData.shipTo.province,
            city: shippingData.shipTo.city,
            postal_code: destinationZip,
            country_alpha2: shippingData.shipTo.country,
            contact_name: `${shippingData.shipTo.firstname} ${shippingData.shipTo.lastname}`,
            company_name: null,
            contact_phone: shippingData.shipTo.phone,
            // contact_email: 'sonny@bill.com',
          },
          metadata: {},
          set_as_residential: true,
          consignee_tax_id: null,
          eei_reference: null,
          incoterms: 'DDU',
          insurance: {
            is_insured: !!shippingData.isPremiumShipping,
            // insured_amount: 10,
            // insured_currency: 'USD',
          },
          order_data: {
            platform_name: null,
            platform_order_number: null,
            order_tag_list: ['VIP'],
            seller_notes: null,
            buyer_notes: null,
          },
          courier_selection: {
            selected_courier_id: null,
            allow_courier_fallback: false,
            apply_shipping_rules: true,
          },
          parcels: percels,
        },
        providerId
      );
    } catch (exc) {
      let errorInfo = `wrong shipping data provided`;
      // eslint-disable-next-line prefer-destructuring
      if (exc.response.data.error.details.length) errorInfo = exc.response.data.error.details[0];
      returnObject.success = false;
      returnObject.message = errorInfo;
      return returnObject;
    }
    rates = ratesData.data.rates;
    const couriers = await ShippingService.getEasyshipCouriers(providerId);
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const i in rates) {
      // eslint-disable-next-line prefer-destructuring,no-loop-func
      rates[i].courier = couriers.filter((r) => r.courier_id === rates[i].courier_id)[0] ?? {};
    }
    rates = rates.filter((r) => !!r.courier);
    returnObject.shipping = shippingData;
    returnObject.rates = rates;
    return returnObject;
  }

  static async prepareShippingDataWithRates(incomingData, providerId) {
    logger.info('preparing shipping data');
    const {
      shipFrom,
      shipTo,
      boxes,
      client,
      returnLabel,
      isPremiumShipping,
      isStandartPickup,
      addressOnLabel,
      equipments,
      selectedCourier,
    } = incomingData;
    let rates = [];
    const ratesState = await ShippingService.getRatesWorker(
      false,
      {
        shipFrom,
        shipTo,
        boxes,
        client,
        returnLabel,
        isPremiumShipping,
        isStandartPickup,
        addressOnLabel,
        equipments,
        selectedCourier,
      },
      providerId
    );
    if (ratesState.success) {
      rates = ratesState.rates;
    } else {
      throw new ApiError(400, ratesState.message);
    }
    const createShippingData = {
      ...ratesState.shipping,
      pickupStartDate: incomingData.pickupStartDate,
      pickupEndDate: incomingData.pickupEndDate,
      pickupAddress: incomingData.pickupAddress,
      selectedCourier: rates.filter((r) => r.courier_id === incomingData.selectedCourier)[0],
    };
    if (createShippingData.selectedCourier) {
      createShippingData.insuranceFee = createShippingData.selectedCourier.insurance_fee;
      createShippingData.shipmentTotal = createShippingData.selectedCourier.shipment_charge_total;
      createShippingData.totalShipping = createShippingData.selectedCourier.total_charge;
    }
    return { createShippingData, rates };
  }

  static async createShipping(shippingData) {
    logger.info('creating shipping in db');
    return shippingRepository.createShipping(shippingData, {});
    // TODO create invoice with easyship service
  }

  static async syncEasyshipShippings(provider) {
    // get list of comments whdbShippingich are not notified and is time to notify
    const dbShippings = await shippingRepository.getAll();
    const shipmentsResponse = await EasyshipService.getShipments(provider.toString());
    const { shipments } = shipmentsResponse.data;
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars
    for (const shipment of shipments) {
      const dbShipping = dbShippings.filter((r) => r.easyship_shipment_id === shipment.easyship_shipment_id)[0];
      if (dbShipping) {
        const shippingUpdateBody = {};
        if (
          // eslint-disable-next-line radix
          parseInt(dbShipping.easyship_updated_at.getTime() / 1000) !==
            // eslint-disable-next-line radix
            parseInt(new Date(shipment.updated_at).getTime() / 1000) ||
          (dbShipping.label_state === 'printed' &&
            (!dbShipping.shipping_documents?.length || !dbShipping.trackings?.length)) ||
          !dbShipping.easyShipData
        ) {
          // eslint-disable-next-line no-await-in-loop
          const currentShipmentResponse = await EasyshipService.getShipment(shipment.easyship_shipment_id, provider);
          const currentShipment = currentShipmentResponse.data.shipment;
          shippingUpdateBody.easyShipData = currentShipment;
          shippingUpdateBody.delivery_state = currentShipment.delivery_state;
          shippingUpdateBody.pickup_state = currentShipment.pickup_state;
          shippingUpdateBody.label_state = currentShipment.label_state;
          shippingUpdateBody.shipment_state = currentShipment.shipment_state;
          shippingUpdateBody.shipment_state = currentShipment.shipment_state;
          shippingUpdateBody.tracking_page_url = currentShipment.tracking_page_url;
          if (dbShipping.selected_courier !== currentShipment.selected_courier?.id) {
            shippingUpdateBody.selected_courier = currentShipment.selected_courier?.id;
          }
          shippingUpdateBody.insurance = currentShipment.insurance;
          shippingUpdateBody.shipping_documents = currentShipment.shipping_documents;
          shippingUpdateBody.trackings = currentShipment.trackings;
          shippingUpdateBody.easyship_updated_at = new Date(currentShipment.updated_at);
          // eslint-disable-next-line no-await-in-loop, no-unused-vars
          const updatedShipping = await shippingRepository.updateShippingById(dbShipping._id, shippingUpdateBody);
          logger.info(`shipping ${dbShipping.easyship_shipment_id} synced from remote`);
          // eslint-disable-next-line no-await-in-loop
          // await NotificationService.GenerateShippingRemoteUpdateNotification(updatedShipping);
        }
      }
      // eslint-disable-next-line no-await-in-loop
      if (!shipment.order_data.platform_name) {
        // eslint-disable-next-line no-await-in-loop
        await EasyshipService.deleteShipment(shipment.easyship_shipment_id, provider);
      }
    }
  }
}

module.exports = ShippingService;
