const router = require('express').Router()
const bcrypt = require('bcrypt')
const { User, Blog } = require('../models')
const { failure, id } = require('../util/middleware')
const safe = user => {
  const data = user.toJSON()
  delete data.passwordHash
  return data
}
router.post('/', async (req, res) => {
  const { name, username, password } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || typeof username !== 'string' || !username.trim()) throw failure(400, 'name and username are required')
  if (typeof password !== 'string' || password.length < 3 || Buffer.byteLength(password) > 72) throw failure(400, 'password must have at least 3 characters and at most 72 bytes')
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name: name.trim(), username: username.trim(), passwordHash })
  res.status(201).json(safe(user))
})
router.get('/', async (req, res) => res.json(await User.findAll({ include: { model: Blog, attributes: { exclude: ['userId'] } }, order: [['id', 'ASC']] })))
router.get('/:id', async (req, res) => {
  if (req.query.read !== undefined && !['true', 'false'].includes(req.query.read)) throw failure(400, 'read must be true or false')
  const through = { attributes: ['id', 'read'] }
  if (req.query.read !== undefined) through.where = { read: req.query.read === 'true' }
  const user = await User.findByPk(id(req.params.id), {
    include: [{ model: Blog }, { model: Blog, as: 'readings', through, required: false }]
  })
  if (!user) throw failure(404, 'user not found')
  res.json(user)
})
router.put('/:username', async (req, res) => {
  const user = await User.findOne({ where: { username: req.params.username } })
  if (!user) throw failure(404, 'user not found')
  const { name, username } = req.body || {}
  if (name === undefined && username === undefined) throw failure(400, 'name or username is required')
  const values = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw failure(400, 'name is required')
    values.name = name.trim()
  }
  if (username !== undefined) {
    if (typeof username !== 'string' || !username.trim()) throw failure(400, 'username is required')
    values.username = username.trim()
  }
  await user.update(values)
  res.json(user)
})
module.exports = router
