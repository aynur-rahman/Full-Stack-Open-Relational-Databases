const { Sequelize } = require('sequelize')
const { databaseUrl } = require('./config')
const sequelize = new Sequelize(databaseUrl, { logging: false })
const connectToDatabase = async () => {
  await sequelize.authenticate()
  await sequelize.sync()
}
module.exports = { sequelize, connectToDatabase }
