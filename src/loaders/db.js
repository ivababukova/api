const conn = require('../db/conn');
const logger = require('../utils/logging');

module.exports = async () => {
  logger.log('Opening databse connection...');
  await conn;
  logger.log('Database is now open.');
};
