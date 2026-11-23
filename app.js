const express = require('express')
const cors = require('cors')
const { sequelize } = require('./util/db')
const { testing } = require('./util/config')
const { errorHandler } = require('./util/middleware')
const app = express()
app.use(cors())
app.use(express.json({ limit: '100kb' }))
app.get('/', (req, res) => res.status(200).json({ status: 'ok' }))
for (const resource of ['blogs', 'users', 'login', 'logout', 'readinglists', 'authors']) {
  app.use(`/api/${resource}`, require(`./controllers/${resource}`))
}
if (testing) app.post('/api/reset', async (req, res) => {
  await sequelize.query('TRUNCATE TABLE sessions, reading_lists, blogs, users RESTART IDENTITY CASCADE')
  res.status(204).end()
})
app.use((req, res) => res.status(404).json({ error: 'unknown endpoint' }))
app.use(errorHandler)
module.exports = app
