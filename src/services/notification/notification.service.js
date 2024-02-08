// eslint-disable-next-line no-unused-vars
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../utils/logger/logger');

const { notificationRepository, ottProviderPermissionRepositor } = repositories;
// const notificationRepository = require('../../repository/notification/notification.repository');
// const ottProviderPermissionRepository = require('../../repository/ottprovider/ottprovider_permission.repository');
// eslint-disable-next-line no-unused-vars
const config = require('../../config/config');
const BroadcastService = require('../socket/broadcastService.service');
const RoleService = require('../role/role.service');

// TODO smarter sync not to delete all, just update and keep numeric ids
class NotificationService {
  static async GenerateCommentNotification(comment) {
    const newNotification = {
      comment: comment._id.toString(),
      type: 1,
      note: `notification to comment ${comment.comment}`,
    };
    if (comment.user) {
      newNotification.user = comment.user._id.toString();
    }
    if (comment.client) {
      newNotification.client = comment.client._id.toString();
    }
    newNotification.isPrivate = comment.isPrivate;
    if (comment?.provider?._id) {
      newNotification.provider = comment.provider._id.toString();
    } else if (comment?.client?.provider?._id) {
      newNotification.provider = comment?.client?.provider?._id.toString();
    }
    newNotification.providers = [];
    const ottProviderPermission = await ottProviderPermissionRepository.getOttProviderPermission(newNotification.provider);
    if (ottProviderPermission) {
      try {
        ottProviderPermission.permissions = await RoleService.GetOttPermissions(
          newNotification.provider,
          ottProviderPermission.permissions
        );
        const notifyToParent = ottProviderPermission.permissions.filter((r) => r.permission === 'notifyToParent' && r.state);
        if (notifyToParent.length && notifyToParent[0].onOff && notifyToParent[0].state) {
          const parent = comment?.client?.provider ? comment?.client?.provider.parent : comment?.client?.provider?.parent;
          newNotification.providers.push(parent);
        }
      } catch (ex) {
        logger.error(ex);
      }
    }

    if (comment?.client?.provider?._id) {
      // eslint-disable-next-line no-await-in-loop
      if (!comment.isPrivate) {
        await BroadcastService.broadcastToProvider(comment?.client?.provider?._id?.toString(), 'notification-info', {
          comment,
        });
        if (newNotification.providers.length) {
          await BroadcastService.broadcastToProvider(newNotification.providers[0].toString(), 'notification-info', {
            comment,
          });
        }
      } else {
        await BroadcastService.broadcastToUser(comment?.user?._id?.toString(), 'notification-info', {
          comment,
        });
      }
    }
    // eslint-disable-next-line no-await-in-loop
    return notificationRepository.createNotification(newNotification, null);
  }

  static async GenerateLocationStatusNotification(location) {
    const newNotification = {
      type: 2,
      note: `location: ${location.login} status updated!`,
    };
    if (location.user) {
      newNotification.user = location.user._id.toString();
    }
    if (location.clientId) {
      newNotification.client = location.clientId;
    }
    if (location?.provider) {
      newNotification.provider = location.provider;
    }
    const notification = await notificationRepository.createNotification(newNotification, null);
    if (location?.provider) {
      // eslint-disable-next-line no-await-in-loop
      await BroadcastService.broadcastToProvider(location?.provider, 'notification-info', {
        notification,
      });
    }
    return notification;
  }

  static async GenerateShippingCreateNotification(shipping) {
    const newNotification = {
      type: 2,
      note: `EasyShip shipping created ${shipping.easyship_shipment_id}`,
    };
    if (shipping.user) {
      newNotification.user = shipping.user._id.toString();
    }
    if (shipping.client) {
      newNotification.client = shipping.clientId;
    }
    if (shipping?.provider) {
      newNotification.provider = shipping.provider;
    }
    const notification = await notificationRepository.createNotification(newNotification, null);
    if (shipping?.provider) {
      // eslint-disable-next-line no-await-in-loop
      await BroadcastService.broadcastToProvider(shipping?.provider, 'notification-info', {
        notification,
      });
    }
    return notification;
  }

  static async GenerateShippingRemoteUpdateNotification(shipping) {
    const newNotification = {
      type: 2,
      note: `Shipping ${shipping.easyship_shipment_id} updates from EasyShip!`,
    };
    if (shipping.user) {
      newNotification.user = shipping.user._id.toString();
    }
    if (shipping.client) {
      newNotification.client = shipping.clientId;
    }
    if (shipping?.provider) {
      newNotification.provider = shipping.provider;
    }
    const notification = await notificationRepository.createNotification(newNotification, null);
    if (shipping?.provider) {
      // eslint-disable-next-line no-await-in-loop
      await BroadcastService.broadcastToProvider(shipping?.provider, 'notification-info', {
        notification,
      });
      // eslint-disable-next-line no-await-in-loop
      await BroadcastService.broadcastToProvider(shipping?.provider, 'shipping-info', {
        shipping,
      });
    }
    return notification;
  }

  static async GenerateLocationExpiringNotification(location) {
    const newNotification = {
      type: 3,
      note: `location (${location.login}) expire invoice generated!`,
    };
    if (location.user) {
      newNotification.user = location.user._id.toString();
    }
    if (location.clientId) {
      newNotification.client = location.clientId;
    }
    if (location?.provider) {
      newNotification.provider = location.provider;
    }
    const notification = await notificationRepository.createNotification(newNotification, null);
    if (location?.provider) {
      // eslint-disable-next-line no-await-in-loop
      await BroadcastService.broadcastToProvider(location?.provider, 'notification-info', {
        notification,
      });
    }
    return notification;
  }
}

module.exports = NotificationService;
