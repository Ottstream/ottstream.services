/* eslint-disable prefer-promise-reject-errors */
const { uuid } = require('uuidv4');
const CacheService = require('../cache/CacheService');

class TokenService {
  // eslint-disable-next-line class-methods-use-this
  static async generateToken(info) {
    const expireMinutes = 1;
    const token = uuid();
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + expireMinutes);
    const storeData = {
      expireDate: currentDate,
      token,
      info,
    };
    await CacheService.setex(token, storeData, expireMinutes * 60);
    const hasKey = await CacheService.hasKey(token);
    return hasKey ? token : null;
  }

  static async validateToken(token) {
    return CacheService.hasKey(token);
  }

  static async deactivateToken(token) {
    return CacheService.removeKey(token);
  }
}
module.exports = TokenService;
