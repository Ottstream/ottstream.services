const jwt = require('jsonwebtoken');
const moment = require('moment');
const { uuid } = require('uuidv4');
// const { repositories } = require('ottstream.dataaccess');
const config = require('../../config/config');

// const { userRepository, tokenRepository } = repositories;
const CacheService = require('../cache/CacheService');

class AuthService {
  static generateToken(userId, expires, secret = config.jwt.secret) {
    const id = uuid();
    const payload = {
      sub: userId,
      id,
      iat: moment().unix(),
      exp: expires.unix(),
    };
    return { token: jwt.sign(payload, secret), id };
  }

  static async refreshAuth(refreshToken) {
    try {
      const refreshTokenDoc = await tokenRepository.verifyToken(refreshToken, 'refresh');
      const user = await userRepository.getUserById(refreshTokenDoc.user);
      if (!user) {
        throw new Error();
      }
      await refreshTokenDoc.remove();
      return AuthService.generateAuthTokens(user);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate auth tokens
   * @param {User} user
   * @returns {Promise<Object>}
   */
  static async generateAuthTokens(user) {
    const accessTokenExpires = moment().add(365, 'days');
    const accessToken = AuthService.generateToken(user.id, accessTokenExpires);

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = AuthService.generateToken(user.id, refreshTokenExpires);
    // await tokenRepository.saveToken(refreshToken, user.id, refreshTokenExpires, 'refresh');

    await CacheService.setex(`token-user-${accessToken.id}`, accessToken, config.jwt.accessExpirationMinutes * 60);
    return {
      access: {
        token: accessToken.token,
        expires: accessTokenExpires.toDate(),
      },
      refresh: {
        token: refreshToken.token,
        expires: refreshTokenExpires.toDate(),
      },
    };
  }
}

module.exports = AuthService;
