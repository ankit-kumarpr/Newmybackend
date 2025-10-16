const { default: cryptoRandomString } = require('crypto-random-string');

function generatePassword(length = 10) {
  return cryptoRandomString({ length, type: 'alphanumeric' });
}

module.exports = generatePassword;
