const router = require('express').Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('node:crypto')
const { User, Session } = require('../models')
const { secret } = require('../util/config')
const { failure, tokenHash } = require('../util/middleware')
router.post('/', async (req, res) => {
  const { username, password } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) throw failure(401, 'invalid username or password')
  const user = await User.unscoped().findOne({ where: { username } })
  if (!user || user.disabled || !(await bcrypt.compare(password, user.passwordHash))) throw failure(401, 'invalid credentials or account disabled')
  const token = jwt.sign({ id: user.id, username: user.username }, secret, { algorithm: 'HS256', expiresIn: '1h', jwtid: randomUUID() })
  await Session.create({ userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(jwt.decode(token).exp * 1000) })
  res.json({ token, username: user.username, name: user.name })
})
module.exports = router
