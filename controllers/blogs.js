const router = require('express').Router()
const { Op } = require('sequelize')
const { Blog, User } = require('../models')
const { authenticate, failure, id } = require('../util/middleware')
const creator = { model: User, attributes: ['id', 'name', 'username'] }
router.get('/', async (req, res) => {
  const where = {}
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== 'string') throw failure(400, 'search must be text')
    const term = `%${req.query.search.replace(/[\\%_]/g, '\\$&')}%`
    where[Op.or] = [{ title: { [Op.iLike]: term } }, { author: { [Op.iLike]: term } }]
  }
  res.json(await Blog.findAll({ where, include: creator, order: [['likes', 'DESC'], ['id', 'ASC']] }))
})
router.post('/', authenticate, async (req, res) => {
  const { title, url, author, likes } = req.body || {}
  if (typeof title !== 'string' || !title.trim() || typeof url !== 'string' || !url.trim()) throw failure(400, 'title and url are required')
  if (author !== undefined && author !== null && typeof author !== 'string') throw failure(400, 'author must be text')
  if (likes !== undefined && (!Number.isInteger(likes) || likes < 0)) throw failure(400, 'likes must be a nonnegative integer')
  const blog = await Blog.create({ title: title.trim(), url: url.trim(), author, likes, userId: req.user.id })
  res.status(201).json(await Blog.findByPk(blog.id, { include: creator }))
})
router.put('/:id', async (req, res) => {
  const blog = await Blog.findByPk(id(req.params.id))
  if (!blog) throw failure(404, 'blog not found')
  const { likes } = req.body || {}
  if (!Number.isInteger(likes) || likes < 0) throw failure(400, 'likes must be a nonnegative integer')
  await blog.update({ likes })
  res.json(await Blog.findByPk(blog.id, { include: creator }))
})
router.delete('/:id', authenticate, async (req, res) => {
  const blog = await Blog.findByPk(id(req.params.id))
  if (!blog) throw failure(404, 'blog not found')
  if (blog.userId !== req.user.id) throw failure(401, 'only the creator can delete a blog')
  await blog.destroy()
  res.status(204).end()
})
module.exports = router
