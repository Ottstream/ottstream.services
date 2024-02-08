const fs = require('fs');
const path = require('path');
const { repositories } = require('ottstream.dataaccess');

const { getIconTypeById, getChannelById, getChannelIconSetById } = repositories;
// const { getChannelIconSetById } = require('../../../repository/channel/channel_icon_set.repository');
// const { getIconTypeById } = require('../../../repository/icon_type/icon_type.repository');

async function channelSetImageDestinationFunction(self, req, file, cb) {
  const iconSet = await getChannelIconSetById(req.query.iconSet);
  const iconType = await getIconTypeById(req.query.iconType);
  const channel = await getChannelById(req.query.channel);
  const finalPath = path.join(
    self.storagePath,
    'channels',
    channel.number.toString(),
    iconSet.number.toString(),
    `${iconType.ratiox}x${iconType.ratioy}`
  );
  if (req.query.original) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.rmdirSync(finalPath, { recursive: true });
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(finalPath)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.mkdirSync(finalPath, { recursive: true });
  }
  cb(null, finalPath);
}

async function channelSetImageFileNameFunction(self, req, file, cb) {
  const channel = await getChannelById(req.query.channel);
  let fileName = `${channel.number}`;
  if (req.query.original) fileName += '_original';
  const ext = path.extname(file.originalname);
  // const tempName = uuid();
  const filename = `${fileName}${ext}`;
  // const fileName = file.originalname.toLowerCase().split(' ').join('-');
  cb(null, filename);
}

module.exports = {
  channelSetImageDestinationFunction,
  channelSetImageFileNameFunction,
};
