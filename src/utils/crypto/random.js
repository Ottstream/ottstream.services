const randomNumberSequence = (length) => {
  const result = [];
  const characters = '0123456789';
  const charactersWIthNoZero = '123456789';
  const charactersLength = characters.length;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    if (i === 0) {
      result.push(charactersWIthNoZero.charAt(Math.floor(Math.random() * charactersLength - 1)));
    } else {
      result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
    }
  }
  return result.join('');
};

module.exports = {
  randomNumberSequence,
};
