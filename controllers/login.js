const router = require('express').Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { secret } = require('../util/config')
const { failure } = require('../util/middleware')
router.post('/', async (req, res) => {
  const { username, password } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) throw failure(401, 'invalid username or password')
  const user = await User.unscoped().findOne({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw failure(401, 'invalid username or password')
  const token = jwt.sign({ id: user.id, username: user.username }, secret, { algorithm: 'HS256' })
  res.json({ token, username: user.username, name: user.name })
})
module.exports = router
