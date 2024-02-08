const sharp = require('sharp');

sharp.cache(false);

const resizeImage = async (input, output, size) => {
  await sharp(input).resize({ width: size }).toFile(output);
};

const pdfToImage = async () => {
  // const options = {
  //   density: 100,
  //   saveFilename: 'untitled',
  //   savePath: './storage',
  //   format: 'png',
  //   width: 600,
  //   height: 600,
  // };
  // const convert = fromPath(inputPdf, options);
  // const pageToConvertAsImage = 1;

  return new Promise((resolve) => {
    // convert(pageToConvertAsImage, { responseType: 'image' }).then((data) => {
    //   resolve(data);
    // });
    resolve(true);
  });
};

module.exports = {
  resizeImage,
  pdfToImage,
};
