const { describe, it, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const axios = require('axios')
const { sequelize } = require('../util/db')
const { User, Session } = require('../models')

assert.equal(process.env.TESTING, 'true', 'Regressions must run against the test database')
const api = axios.create({ baseURL: 'http://localhost:3001/api', validateStatus: () => true })
const auth = token => ({ headers: { Authorization: `Bearer ${token}` } })
const payload = { title: 'A blog', author: 'An author', url: 'https://example.com' }
let owner, other, token, otherToken
const login = async (username = owner.username, password = 'password123') => {
  const response = await api.post('/login', { username, password })
  assert.equal(response.status, 200)
  return response.data.token
}
const blog = async (values = {}) => {
  const response = await api.post('/blogs', { ...payload, ...values }, auth(token))
  assert.equal(response.status, 201)
  return response.data
}
const reading = async blogId => {
  const response = await api.post('/readinglists', { blogId, userId: owner.id })
  assert.equal(response.status, 201)
  return response.data
}
const noSecrets = value => assert.doesNotMatch(JSON.stringify(value), /passwordHash|password_hash|password123|tokenHash|token_hash/)

describe('Additional API requirements', { concurrency: false }, () => {
  beforeEach(async () => {
    assert.equal((await api.post('/reset')).status, 204)
    const first = await api.post('/users', { name: 'Owner', username: 'owner@example.com', password: 'password123' })
    const second = await api.post('/users', { name: 'Other', username: 'other@example.com', password: 'password123' })
    assert.equal(first.status, 201)
    assert.equal(second.status, 201)
    owner = first.data
    other = second.data
    token = await login()
    otherToken = await login(other.username)
  })
  after(() => sequelize.close())

  it('validates unique email usernames and passwords without exposing secrets', async () => {
    for (const values of [
      { username: 'invalid' }, { username: owner.username }, { name: '   ' },
      { password: '12' }, { password: 'x'.repeat(73) }, { password: null }
    ]) {
      const response = await api.post('/users', { name: 'Test', username: 'new@example.com', password: 'password123', ...values })
      assert.equal(response.status, 400)
      noSecrets(response.data)
    }
    assert.equal((await api.post('/login', { username: owner.username, password: 'incorrect' })).status, 401)
    assert.equal((await api.post('/login', { username: owner.username, password: 'x'.repeat(73) })).status, 401)
    noSecrets(owner)
    noSecrets((await api.get('/users')).data)
    noSecrets((await api.get(`/users/${owner.id}`)).data)
    const stored = await User.unscoped().findByPk(owner.id)
    assert.notEqual(stored.passwordHash, 'password123')
    assert.match(stored.passwordHash, /^\$2[aby]\$/)
  })

  it('updates names and email usernames with advancing timestamps', async () => {
    assert.ok(Number.isFinite(Date.parse(owner.createdAt)))
    assert.ok(Number.isFinite(Date.parse(owner.updatedAt)))
    const response = await api.put(`/users/${owner.username}`, { name: 'Updated', username: 'changed@example.com' })
    assert.equal(response.status, 200)
    assert.equal(response.data.name, 'Updated')
    assert.equal(response.data.username, 'changed@example.com')
    assert.equal(response.data.createdAt, owner.createdAt)
    assert.ok(Date.parse(response.data.updatedAt) > Date.parse(owner.updatedAt))
    assert.equal((await api.put('/users/changed@example.com', { username: other.username })).status, 400)
    assert.equal((await api.put('/users/changed@example.com', { username: 'not-an-email' })).status, 400)
    noSecrets(response.data)
  })

  it('searches title or author case-insensitively, treats wildcards literally and orders by likes', async () => {
    const first = await blog({ title: 'React 100%_guide', author: 'Ada', likes: 2 })
    const second = await blog({ title: 'Other', author: 'REACT writer', likes: 12 })
    await blog({ title: 'React ordinary', likes: 1 })
    const matches = (await api.get('/blogs', { params: { search: 'rEaCt' } })).data
    assert.deepEqual(matches.map(item => item.likes), [12, 2, 1])
    assert.equal(matches[0].id, second.id)
    assert.deepEqual((await api.get('/blogs', { params: { search: '%_' } })).data.map(item => item.id), [first.id])
    const all = (await api.get('/blogs')).data
    assert.deepEqual(all.map(item => item.likes), [12, 2, 1])
    assert.equal(all[0].user.id, owner.id)
    const users = (await api.get('/users')).data
    assert.equal(users.find(user => user.id === owner.id).blogs.length, 3)
    noSecrets(all)
    noSecrets(users)
  })

  it('aggregates author counts and likes in descending order', async () => {
    await blog({ author: 'Writer A', likes: 3 })
    await blog({ author: 'Writer A', likes: 5 })
    await blog({ author: 'Writer B', likes: 9 })
    const response = await api.get('/authors')
    assert.equal(response.status, 200)
    assert.deepEqual(response.data, [
      { author: 'Writer B', blogs: '1', likes: '9' },
      { author: 'Writer A', blogs: '2', likes: '8' }
    ])
  })

  it('accepts year boundaries and rejects out-of-range or noninteger years', async () => {
    const currentYear = new Date().getFullYear()
    for (const year of [1991, currentYear, null]) assert.equal((await blog({ year })).year, year)
    for (const year of [1990, currentYear + 1, 2000.5, '2000', false]) {
      const response = await api.post('/blogs', { ...payload, year }, auth(token))
      assert.equal(response.status, 400, `year ${JSON.stringify(year)}`)
      assert.ok(response.data.error)
    }
  })

  it('reports oversized text and invalid like counts as client errors', async () => {
    const longText = 'x'.repeat(256)
    assert.equal((await api.post('/users', { name: longText, username: 'long@example.com', password: 'password123' })).status, 400)
    assert.equal((await api.put(`/users/${owner.username}`, { name: longText })).status, 400)
    for (const values of [{ title: longText }, { author: longText }, { url: longText }, { likes: -1 }, { likes: 1.5 }, { likes: '1' }]) {
      assert.equal((await api.post('/blogs', { ...payload, ...values }, auth(token))).status, 400)
    }
    const created = await blog()
    for (const likes of [-1, 1.5, '1', null]) {
      assert.equal((await api.put(`/blogs/${created.id}`, { likes })).status, 400)
    }
    assert.equal((await api.get('/blogs')).data.find(item => item.id === created.id).likes, 0)
  })

  it('requires ownership and valid live sessions on protected operations', async () => {
    const created = await blog()
    const entry = await reading(created.id)
    assert.equal((await api.delete(`/blogs/${created.id}`, auth(otherToken))).status, 401)
    assert.equal((await api.put(`/readinglists/${entry.id}`, { read: true }, auth(otherToken))).status, 401)
    for (const invalid of [undefined, 'invalid-token']) {
      const options = invalid ? auth(invalid) : {}
      assert.equal((await api.post('/blogs', payload, options)).status, 401)
      assert.equal((await api.delete(`/blogs/${created.id}`, options)).status, 401)
      assert.equal((await api.put(`/readinglists/${entry.id}`, { read: true }, options)).status, 401)
    }
    await User.update({ disabled: true }, { where: { id: owner.id } })
    assert.equal((await api.post('/login', { username: owner.username, password: 'password123' })).status, 401)
    assert.equal((await api.post('/blogs', payload, auth(token))).status, 401)
    assert.equal((await api.delete(`/blogs/${created.id}`, auth(token))).status, 401)
    assert.equal((await api.put(`/readinglists/${entry.id}`, { read: true }, auth(token))).status, 401)
    await User.update({ disabled: false }, { where: { id: owner.id } })
    assert.equal((await api.delete(`/blogs/${created.id}`, auth(token))).status, 204)
  })

  it('logout revokes both distinct concurrent-login tokens without affecting other users', async () => {
    const tokens = await Promise.all([login(), login()])
    assert.notEqual(tokens[0], tokens[1])
    assert.equal((await api.delete('/logout', auth(tokens[0]))).status, 204)
    assert.equal(await Session.count({ where: { userId: owner.id } }), 0)
    for (const expired of [token, ...tokens]) assert.equal((await api.post('/blogs', payload, auth(expired))).status, 401)
    assert.equal((await api.post('/blogs', payload, auth(otherToken))).status, 201)
  })

  it('checks stored session expiry even when the signed token has not expired', async () => {
    await Session.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { userId: owner.id } })
    assert.equal((await api.post('/blogs', payload, auth(token))).status, 401)
  })

  it('filters reading status and validates booleans without changing invalid entries', async () => {
    const first = await blog({ title: 'Read this' })
    const second = await blog({ title: 'Later' })
    const entry = await reading(first.id)
    await reading(second.id)
    for (const read of ['true', 1, null]) assert.equal((await api.put(`/readinglists/${entry.id}`, { read }, auth(token))).status, 400)
    assert.equal((await api.put(`/readinglists/${entry.id}`, { read: true }, auth(token))).status, 200)
    const completed = (await api.get(`/users/${owner.id}?read=true`)).data.readings
    const pending = (await api.get(`/users/${owner.id}?read=false`)).data.readings
    assert.deepEqual(completed.map(item => item.id), [first.id])
    assert.deepEqual(pending.map(item => item.id), [second.id])
    assert.deepEqual(completed[0].reading_list, { id: entry.id, read: true })
    assert.equal((await api.get(`/users/${owner.id}`)).data.readings.length, 2)
    assert.equal((await api.get(`/users/${other.id}?read=true`)).data.readings.length, 0)
    assert.equal((await api.get(`/users/${owner.id}?read=invalid`)).status, 400)
  })
})
