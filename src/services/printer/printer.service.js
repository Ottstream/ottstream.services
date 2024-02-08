/* eslint-disable prefer-promise-reject-errors */
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const logger = require('../../utils/logger/logger');

class PrinterService {
  static async checkPrinter(config) {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Printer type: 'star' or 'epson'
      interface: `tcp://${config.ip}`, // Printer interface
      characterSet: CharacterSet.PC437_USA, // Printer character set - default: SLOVENIA
      removeSpecialCharacters: false, // Removes special characters - default: false
      lineCharacter: '=', // Set character for lines - default: "-"
      breakLine: BreakLine.WORD, // Break line after WORD or CHARACTERS. Disabled with NONE - default: WORD
      options: {
        // Additional options
        timeout: 5000, // Connection timeout (ms) [applicable only for network printers] - default: 3000
      },
    });
    const isConnected = printer.isPrinterConnected();
    printer.clear();
    return isConnected;
  }

  // eslint-disable-next-line class-methods-use-this
  static async printImage(info, config) {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Printer type: 'star' or 'epson'
      interface: `tcp://${config.ip}`, // Printer interface
      characterSet: CharacterSet.PC437_USA, // Printer character set - default: SLOVENIA
      removeSpecialCharacters: false, // Removes special characters - default: false
      lineCharacter: '=', // Set character for lines - default: "-"
      breakLine: BreakLine.WORD, // Break line after WORD or CHARACTERS. Disabled with NONE - default: WORD
      options: {
        // Additional options
        timeout: 5000, // Connection timeout (ms) [applicable only for network printers] - default: 3000
      },
    });

    await printer.isPrinterConnected(); // Check if printer is connected, return bool of status
    try {
      // eslint-disable-next-line no-param-reassign
      if (!info.count) info.count = 1;
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < info.count; i++) {
        // eslint-disable-next-line no-await-in-loop
        await printer.printImage(info.path);
        // eslint-disable-next-line no-await-in-loop
        await printer.cut();
      }
      printer.execute(); // Executes all the commands. Returns success or throws error
      printer.clear();
      // const raw = await printer.raw(Buffer.from('Hello world')); // Print instantly. Returns success or throws error
    } catch (e) {
      printer.clear();
      logger.error(e);
      return false;
    }
    return true;
  }
}
module.exports = PrinterService;
