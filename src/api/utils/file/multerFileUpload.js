const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uuid } = require('uuidv4');
const config = require('../../../config/config');
const { channelSetImageDestinationFunction, channelSetImageFileNameFunction } = require('./channelIconFunctions');

class MulterFileUpload {
  constructor(storagePath, destinationFunction, nameFunction) {
    this.storagePath = storagePath;
    this.destinationFunction = destinationFunction;
    this.nameFunction = nameFunction;
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        this.destinationFunction(this, req, file, cb);
      },
      filename: (req, file, cb) => {
        this.nameFunction(this, req, file, cb);
      },
    });
    this.upload = multer({
      storage: this.storage,
      limits: {
        fields: 5,
        fieldNameSize: 50, // TODO: Check if this size is enough
        fieldSize: 20000, // TODO: Check if this size is enough
        // TODO: Change this line after compression
        fileSize: 15000000000, // 150 KB for a 1080x1080 JPG 90
      },
      fileFilter(_req, file, cb) {
        // Allowed ext
        const filetypes = /jpeg|jpg|png|gif|mp4|webm|avi|mpeg|svg/;
        // Check ext
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        // Check mime
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) return cb(null, true);
        // Create a new Error object with a custom message
        const error = new Error('File type is not allowed!');
        error.statusCode = 400; // Bad Request
        return cb(error, false);
      },
    });
  }

  getInstance() {
    return this.upload;
  }
}

function fileDestinationFunction(self, req, file, cb) {
  const currentDate = new Date();
  const finalPath = path.join(
    self.storagePath,
    currentDate.getFullYear().toString(),
    currentDate.getMonth().toString(),
    currentDate.getDay().toString()
  );
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(finalPath)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.mkdirSync(finalPath, { recursive: true });
  }
  cb(null, finalPath);
}
function fileNameFunction(self, req, file, cb) {
  const ext = path.extname(file.originalname);
  const tempName = uuid();
  const filename = `${tempName}${ext}`;
  // const fileName = file.originalname.toLowerCase().split(' ').join('-');
  cb(null, filename);
}

const fileMulterService = new MulterFileUpload(config.file.file_storage_path, fileDestinationFunction, fileNameFunction);
const channelSetTypeImageMulterService = new MulterFileUpload(
  config.file.file_storage_path,
  channelSetImageDestinationFunction,
  channelSetImageFileNameFunction
);

module.exports = {
  fileMulterService,
  channelSetTypeImageMulterService,
};
