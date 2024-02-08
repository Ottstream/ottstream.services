/**
 * Choose translation language for user
 * @param {Object} options
 * @param {Object} user
 * @returns {String}
 */
const langPick = (options, user) => {
  if (options.lang) return options.lang;

  if (user.lang) return user.lang;

  return 'en';
};

module.exports = langPick;
