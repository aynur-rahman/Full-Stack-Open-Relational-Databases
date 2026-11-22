const { port, secret, testing } = require('./util/config')
const { sequelize, connectToDatabase } = require('./util/db')
const app = require('./app')
const start = async () => {
  if (!secret) throw new Error('SECRET is required')
  await connectToDatabase()
  const server = app.listen(port, testing ? '127.0.0.1' : '0.0.0.0', () => console.log(`Server running on port ${port}`))
  const shutdown = () => server.close(async () => { await sequelize.close() })
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  server.on('error', error => { console.error('Server failed:', error.code); process.exitCode = 1; sequelize.close() })
}
start().catch(async error => {
  console.error('Startup failed:', error.message)
  process.exitCode = 1
  await sequelize.close()
})
