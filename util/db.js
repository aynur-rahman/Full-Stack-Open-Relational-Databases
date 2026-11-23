const path = require('node:path')
const { Sequelize } = require('sequelize')
const { Umzug, SequelizeStorage } = require('umzug')
const { databaseUrl } = require('./config')
const sequelize = new Sequelize(databaseUrl, { logging: false })
const migrator = new Umzug({
  migrations: { glob: ['*.js', { cwd: path.join(__dirname, '../migrations') }] },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
  logger: console
})
const connectToDatabase = async () => {
  await sequelize.authenticate()
  await migrator.up()
}
module.exports = { sequelize, migrator, connectToDatabase }
