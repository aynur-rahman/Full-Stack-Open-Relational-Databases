const router = require('express').Router()
const { Session } = require('../models')
const { authenticate } = require('../util/middleware')
router.delete('/', authenticate, async (req, res) => {
  await Session.destroy({ where: { userId: req.user.id } })
  res.status(204).end()
})
module.exports = router
