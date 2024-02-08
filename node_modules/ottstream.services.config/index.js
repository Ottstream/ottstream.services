
// Import Config class
const { Config } = require('./config');

// Instantiate Config if needed
const configInstance = new Config();

// Check if configInstance is true or false
if (configInstance === true) {
  console.log(configInstance,1);
} else {
  console.log(configInstance,2);
}

// Export Config class
module.exports = {
  Config,
};
