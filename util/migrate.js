const { sequelize, migrator } = require('./db')
;(async () => {
  try {
    await sequelize.authenticate()
    if (process.argv[2] === 'down') await migrator.down()
    else await migrator.up()
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exitCode = 1
  } finally { await sequelize.close() }
})()
