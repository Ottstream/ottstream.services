const paymentImplementations = [
  {
    name: 'authorize',
    implementations: ['card', 'bank_account'],
  },
  {
    name: 'paypal',
    implementations: [],
  },
  {
    name: 'stripe',
    implementations: ['card', 'bank_account'],
  },
  {
    name: 'clover',
    implementations: ['card', 'bank_account'],
  },
  {
    name: 'square',
    implementations: ['card', 'bank_account'],
  },
  {
    name: 'square',
    implementations: ['card', 'bank_account'],
  },
];

module.exports = {
  paymentImplementations,
};
