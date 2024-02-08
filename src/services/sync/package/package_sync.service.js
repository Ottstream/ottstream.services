const request = require('request');
const { repositories } = require('ottstream.dataaccess');
const logger = require('../../../utils/logger/logger');

const {
  packageChannelRepository,
  packageRepository,
  channelRepository,
  ottProviderRepository,
  // eslint-disable-next-line no-unused-vars
  serverRepository,
  groupRepository,
  iconRepository,
  // eslint-disable-next-line no-unused-vars
  clientLocationRepository,
  deviceOptionRepository,
} = repositories;
// const deviceOptionRepository = require('../../../repository/device/device_option.repository');

class PackageSyncService {
  static async updatePackageChannels(packageChannelsToUpdate) {
    logger.info('updating package channel bindings');
    // eslint-disable-next-line no-restricted-syntax
    for (const item of packageChannelsToUpdate) {
      // eslint-disable-next-line no-await-in-loop
      const currentList = await packageChannelRepository.getPackageChannelsByPackageMiddlewareId(item.packageMiddlewareId);
      // compare to add

      logger.info(
        `current packet: ${item.packageMiddlewareId} in channels: ${item.channels.length} list: ${currentList.length}`
      );

      // eslint-disable-next-line no-await-in-loop
      const _package = await packageRepository.getPackageByMiddlewareId(item.packageMiddlewareId);

      if (_package) {
        // eslint-disable-next-line no-restricted-syntax
        for (const curListItem of currentList) {
          if (parseInt(curListItem.channelMiddlewareId, 10) === 8) {
            logger.info(`exist channel ${curListItem.channelMiddlewareId} ${!item.channels.filter(
              (r) => r.cid === curListItem.channelMiddlewareId
            ).length}
          ${!item.channels.filter((r) => parseInt(r.cid, 10) === parseInt(curListItem.channelMiddlewareId, 10)).length}`);
          }
          if (!item.channels.filter((r) => r.cid === curListItem.channelMiddlewareId).length) {
            logger.info(`removing package channel from ${curListItem.channelMiddlewareId} ${curListItem._id.toString()}`);
            // eslint-disable-next-line no-await-in-loop
            await packageChannelRepository.RemovePackageChannel(curListItem._id.toString());
          }
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const packet of item.channels) {
          const id = packet.cid;
          // eslint-disable-next-line no-await-in-loop
          if (!currentList.filter((r) => r.channelMiddlewareId === id).length) {
            // eslint-disable-next-line no-await-in-loop
            const _channel = await channelRepository.getChannelByMiddlewareId(id);
            if (_channel) {
              // eslint-disable-next-line no-await-in-loop
              const added = await packageChannelRepository.AddChannelToPackage(
                _package._id,
                _channel._id,
                item.packageMiddlewareId,
                id
              );
              logger.info(
                `channel package added package: ${item.packageMiddlewareId}, channel: ${id}, status: ${added !== null}`
              );
            }
          } else {
            logger.info(`channel package exists  package: ${item.packageMiddlewareId}, channel: ${id}`);
          }
          // get packet
          // eslint-disable-next-line no-await-in-loop
        }
      }
    }
  }

  static async syncPackages() {
    const url = 'https://iptv.ottstream.live/api_test/ottstream/configs';

    const options = { json: true };

    return new Promise((resolve, reject) => {
      request(url, options, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            // do something with JSON, using the 'body' variable

            if (body.packets && body.packets.length) {
              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const i in body.packets) {
                // eslint-disable-next-line guard-for-in,no-restricted-syntax
                const packet = body.packets[i];
                // logger.info(`key: ${i}`);
                const { id } = packet;
                // get packet
                // eslint-disable-next-line no-await-in-loop
                const _package = await packageRepository.getPackageByMiddlewareId(id);
                if (!_package) {
                  // create package
                  logger.info(`new package: ${id}`);
                  // get superadmin provider
                  // eslint-disable-next-line no-await-in-loop
                  const baseOttProvider = await ottProviderRepository.getBaseOttProvider();
                  if (!baseOttProvider) {
                    logger.error(`no base ott provider to sync channels`);
                  } else {
                    // eslint-disable-next-line no-await-in-loop
                    const created = await packageRepository.createPackage(
                      {
                        name: packet.name,
                        middlewareName: packet.name,
                        middlewareId: packet.id,
                        aEnable: packet.a_enbl,
                        vEnable: packet.v_enbl,
                        tEnable: packet.t_enbl,
                      },
                      {
                        provider: {
                          id: baseOttProvider._id,
                        },
                      }
                    );
                    if (!created) {
                      logger.error(`error create new sync package middlewareId: ${packet.id}`);
                    } else {
                      logger.info(`middleware package created: ${created._id} - ${created.middlewareId}`);
                    }
                  }
                } else {
                  // do update
                  // eslint-disable-next-line no-await-in-loop
                  const updated = await packageRepository.updatePackageById(_package._id, {
                    middlewareName: packet.name,
                    aEnable: packet.a_enbl,
                    vEnable: packet.v_enbl,
                    tEnable: packet.t_enbl,
                  });
                  logger.info(`update package: ${updated._id} - ${updated.middlewareId}`);
                }
              }
            }
          }
          resolve(true);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async syncGroups() {
    const url = 'https://iptv.ottstream.live/api_test/ottstream/channels_groups';

    const options = { json: true };

    return new Promise((resolve, reject) => {
      request(url, options, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            // do something with JSON, using the 'body' variable

            if (body.groups && body.groups.length) {
              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const i in body.groups) {
                // eslint-disable-next-line guard-for-in,no-restricted-syntax
                const packet = body.groups[i];
                // prepare list of channels
                const id = packet.group_id;
                // get packet
                // eslint-disable-next-line no-await-in-loop
                const _group = await groupRepository.getGroupByMiddlewareId(id);
                if (!_group) {
                  // create package
                  logger.info(`new group: ${id}`);
                  // get superadmin provider
                  // eslint-disable-next-line no-await-in-loop
                  const baseOttProvider = await ottProviderRepository.getBaseOttProvider();
                  if (!baseOttProvider) {
                    logger.error(`no base ott provider to sync groups`);
                  } else {
                    // eslint-disable-next-line no-await-in-loop
                    const created = await groupRepository.createGroup(
                      {
                        name: packet.name,
                        middlewareId: packet.group_id,
                        color: packet.color,
                        channels: packet.channels,
                      },
                      {
                        provider: {
                          id: baseOttProvider._id,
                        },
                      }
                    );
                    if (!created) {
                      logger.error(`error create new sync group middlewareId: ${packet.group_id}`);
                    } else {
                      logger.info(`middleware group created: ${created._id} - ${created.middlewareId}`);
                    }
                  }
                } else {
                  // do update
                  // eslint-disable-next-line no-await-in-loop
                  const updated = await groupRepository.updateGroupById(_group._id, {
                    name: packet.name,
                    color: packet.color,
                    channels: packet.channels,
                  });
                  logger.info(`update group: ${updated._id} - ${updated.middlewareId}`);
                }
              }
            }
          }
          resolve(true);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async syncOptionsHosted() {
    let result = false;
    try {
      const deviceOptions = await deviceOptionRepository.getDeviceOptions();
      if (
        !deviceOptions ||
        !deviceOptions.updatedAt ||
        new Date().getTime() - deviceOptions.updatedAt.getTime() > 1000 * 60 * 60 // TODO move to configuraiton
      ) {
        await PackageSyncService.syncOptions();
      }
    } catch (e) {
      logger.error(e);
      result = false;
    }
    return result;
  }

  static async syncOptions() {
    const url = 'https://iptv.ottstream.live/api_test/ottstream/configs';

    const options = { json: true };

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-vars
      request(url, options, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            await deviceOptionRepository.updateDeviceOptions(null, {
              http_caching: body.http_caching,
              bitrate: body.bitrate,
              servers: body.servers,
              audiotrack_default: body.audiotrack_default,
              definition_filter: body.definition_filter,
              stream_quality: body.stream_quality,
              lang: body.lang,
              background_player: body.background_player,
              ui_font_size: body.ui_font_size,
              box_models: body.box_models,
            });
            /*
            const removedServerIds = [];
            // update serverList
            // eslint-disable-next-line no-unreachable
            if (body.servers && body.servers.length) {
              const dbServers = await serverRepository.getList();
              // eslint-disable-next-line no-restricted-syntax
              for (const dbServer of dbServers) {
                if (!body.servers.filter((r) => r.id === dbServers.middlewareId).length) {
                  // eslint-disable-next-line no-await-in-loop
                  removedServerIds.push(dbServer._id.toString());
                  // eslint-disable-next-line no-await-in-loop
                  await serverRepository.deleteServerById(dbServer._id.toString());
                }
              }
              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const i in body.servers) {
                // eslint-disable-next-line guard-for-in,no-restricted-syntax
                const packet = body.servers[i];
                logger.info(`server ip: ${packet.ip}`);
                // logger.info(`key: ${i}`);
                const { id } = packet;
                // get packet
                // eslint-disable-next-line no-await-in-loop
                const _server = await serverRepository.getServerByMiddlewareId(id);
                if (!_server) {
                  // create package
                  logger.info(`new server: ${id}`);
                  // get superadmin provider
                  // eslint-disable-next-line no-await-in-loop
                  const baseOttProvider = await ottProviderRepository.getBaseOttProvider();
                  if (!baseOttProvider) {
                    logger.error(`no base ott provider to sync channels`);
                  } else {
                    // eslint-disable-next-line no-await-in-loop
                    const created = await serverRepository.createServer(
                      {
                        name: packet.name,
                        ip: packet.ip,
                        middlewareId: packet.id,
                        spdtest_url: packet.spdtest_url,
                      },
                      {
                        provider: {
                          id: baseOttProvider._id,
                        },
                      }
                    );
                    if (!created) {
                      logger.error(`error create new sync server middlewareId: ${packet.id}`);
                    } else {
                      logger.info(`middleware server created: ${created._id} - ${created.middlewareId}`);
                    }
                  }
                } else {
                  // do update
                  // eslint-disable-next-line no-await-in-loop
                  const updated = await serverRepository.updateServerById(_server._id, {
                    name: packet.name,
                    ip: packet.ip,
                    spdtest_url: packet.spdtest_url,
                  });
                  logger.info(`update server: ${updated._id} - ${updated.middlewareId}`);
                }
              }
            }

            const dbServers = await serverRepository.getList();
            if (!dbServers.length) {
              logger.warn(`server list is empty synced from middleware`);
            } else {
              // get location which server is not object
              const locationWithServers = await clientLocationRepository.getClientLocations({}, [{ path: 'server' }], {
                server: 1,
              });
              const locationsWithNoServers = locationWithServers.filter((r) => !r.server || !r.server._id);
              // eslint-disable-next-line no-restricted-syntax
              for (const locationWithNoServer of locationsWithNoServers) {
                // eslint-disable-next-line no-await-in-loop
                await clientLocationRepository.updateClientLocationById(locationWithNoServer._id.toString(), {
                  server: dbServers[0]._id,
                });
              }
            }
            */
          }
          resolve(true);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async syncChannels() {
    const url = 'https://iptv.ottstream.live/api_test/ottstream/channels';

    const options = { json: true };

    return new Promise((resolve, reject) => {
      request(url, options, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            // do something with JSON, using the 'body' variable

            const updatePackageChannelHelperObject = {};
            const updatePackageChannelList = [];
            if (body.channels && body.channels.length) {
              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const i in body.channels) {
                try {
                  // eslint-disable-next-line guard-for-in,no-restricted-syntax
                  const packet = body.channels[i];

                  logger.info(`channel: ${packet.cid} packets: ${packet.packets.length}`);
                  // get package updates
                  // eslint-disable-next-line no-restricted-syntax
                  for (const pack of packet.packets) {
                    if (pack in updatePackageChannelHelperObject) {
                      logger.info(`list push packet channel: ${pack}  channel: ${packet.cid}`);
                      updatePackageChannelHelperObject[pack].channels.push(packet);
                    } else {
                      logger.info(`list new packet channel: ${pack}  channel: ${packet.cid}`);
                      updatePackageChannelHelperObject[pack] = {
                        packageMiddlewareId: pack,
                        channels: [packet],
                      };
                    }
                  }
                  // eslint-disable-next-line no-continue
                  // prepare list of channels
                  // eslint-disable-next-line no-unreachable
                  const id = packet.cid;
                  // get packet
                  // eslint-disable-next-line no-await-in-loop
                  const _channel = await channelRepository.getChannelByMiddlewareId(id);
                  if (!_channel) {
                    // create package
                    logger.info(`new channel: ${id}`);
                    // get superadmin provider
                    // eslint-disable-next-line no-await-in-loop
                    const baseOttProvider = await ottProviderRepository.getBaseOttProvider();
                    if (!baseOttProvider) {
                      logger.error(`no base ott provider to sync channels`);
                    } else {
                      // eslint-disable-next-line no-await-in-loop
                      const created = await channelRepository.createChannel(
                        {
                          name: packet.name,
                          middlewareId: packet.cid,
                          group_id: packet.group_id,
                          icon_path: packet.icon_path,
                          enabled: packet.enabled,
                          packets: packet.packets,
                        },
                        {
                          provider: {
                            id: baseOttProvider._id,
                          },
                        }
                      );
                      if (!created) {
                        logger.error(`error create new sync channel middlewareId: ${packet.channel_id}`);
                      } else {
                        logger.info(`middleware channel created: ${created._id} - ${created.middlewareId}`);
                        // eslint-disable-next-line no-await-in-loop
                      }
                    }
                  } else {
                    // do update
                    // eslint-disable-next-line no-await-in-loop
                    const updated = await channelRepository.updateChannelById(_channel._id, {
                      name: packet.name,
                      group_id: packet.group_id,
                      icon_path: packet.icon_path,
                      enabled: packet.enabled,
                      packets: packet.packets,
                    });
                    logger.info(`update channel: ${updated._id} - ${updated.middlewareId}`);
                    // eslint-disable-next-line no-await-in-loop
                  }
                } catch (e) {
                  logger.error(e.message);
                }
              }

              // get middleware packets
              const middlewarePackages = await packageRepository.getMiddlewarePackages();
              // eslint-disable-next-line no-restricted-syntax
              for (const middlewarePackage of middlewarePackages) {
                if (!(middlewarePackage.middlewareId in updatePackageChannelHelperObject)) {
                  updatePackageChannelHelperObject[middlewarePackage.middlewareId] = {
                    packageMiddlewareId: middlewarePackage.middlewareId,
                    channels: [],
                  };
                }
              }

              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const [, value] of Object.entries(updatePackageChannelHelperObject)) {
                updatePackageChannelList.push(value);
              }
            }

            // update channel package bindings
            await PackageSyncService.updatePackageChannels(updatePackageChannelList);
            // sync icons
          }
          resolve(true);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }

  static async syncIcons() {
    const url = 'https://iptv.ottstream.live/api_test/ottstream/channels';

    const options = { json: true };

    return new Promise((resolve, reject) => {
      request(url, options, async (error, res, body) => {
        if (error) {
          reject(error);
          logger.error(error);
        }
        try {
          if (!error && res.statusCode === 200) {
            // do something with JSON, using the 'body' variable

            if (body.icons && body.icons.length) {
              // eslint-disable-next-line guard-for-in,no-restricted-syntax
              for (const i in body.icons) {
                // eslint-disable-next-line guard-for-in,no-restricted-syntax
                const packet = body.icons[i];
                // prepare list of icons
                const { size } = packet;
                // get packet
                // eslint-disable-next-line no-await-in-loop
                const _icon = await iconRepository.getIconBySize(size);
                if (!_icon) {
                  // create package
                  logger.info(`new icon: ${size}`);
                  // get superadmin provider
                  // eslint-disable-next-line no-await-in-loop
                  const baseOttProvider = await ottProviderRepository.getBaseOttProvider();
                  if (!baseOttProvider) {
                    logger.error(`no base ott provider to sync icons`);
                  } else {
                    // eslint-disable-next-line no-await-in-loop
                    const created = await iconRepository.createIcon(
                      {
                        size: packet.size,
                        base_url: packet.base_url,
                        formats: packet.formats,
                      },
                      {
                        provider: {
                          id: baseOttProvider._id,
                        },
                      }
                    );
                    if (!created) {
                      logger.error(`error create new sync icon middlewareId: ${packet.size}`);
                    } else {
                      logger.info(`middleware icon created: ${created._id} - ${created.size}`);
                    }
                  }
                } else {
                  // do update
                  // eslint-disable-next-line no-await-in-loop
                  const updated = await iconRepository.updateIconBySize(_icon.size, {
                    size: packet.size,
                    base_url: packet.base_url,
                    formats: packet.formats,
                  });
                  logger.info(`update icon: ${updated._id} - ${updated.size}`);
                }
              }
            }
            // sync icons
          }
          resolve(true);
        } catch (exc) {
          reject(exc);
        }
      });
    });
  }
}

module.exports = PackageSyncService;
