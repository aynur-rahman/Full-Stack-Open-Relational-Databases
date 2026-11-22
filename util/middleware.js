const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { secret } = require('./config')
const failure = (status, message) => Object.assign(new Error(message), { status })
const id = value => {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw failure(400, 'id must be a positive integer')
  }
  return Number(value)
}
const authenticate = async (req, res, next) => {
  const authorization = req.get('authorization') || ''
  if (!/^Bearer \S+$/i.test(authorization)) throw failure(401, 'token missing or invalid')
  let decoded
  try { decoded = jwt.verify(authorization.split(' ')[1], secret, { algorithms: ['HS256'] }) }
  catch { throw failure(401, 'token missing or invalid') }
  const user = await User.findByPk(decoded.id)
  if (!user) throw failure(401, 'token missing or invalid')
  req.user = user
  next()
}
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'username already exists' })
  if (error.name === 'SequelizeValidationError') return res.status(400).json({ error: error.errors.map(e => e.message) })
  if (error.name === 'SequelizeForeignKeyConstraintError') return res.status(400).json({ error: 'referenced user does not exist' })
  if (error.name === 'SequelizeDatabaseError' && error.parent?.code === '22001') return res.status(400).json({ error: 'text fields must not exceed 255 characters' })
  if (error.name === 'SequelizeDatabaseError' && ['23514', '22P02', '22003'].includes(error.parent?.code)) return res.status(400).json({ error: 'invalid field value' })
  if (error.status && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.status === 413 ? 'request too large' : error.message })
  console.error('Request failed:', error.name)
  res.status(500).json({ error: 'internal server error' })
}
module.exports = { authenticate, errorHandler, failure, id }
