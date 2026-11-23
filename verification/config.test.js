const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')

const configPath = path.resolve(__dirname, '../util/config.js')
const normal = 'postgres://sample:sample@localhost:5432/blogs'
const isolated = 'postgres://sample:sample@localhost:5432/blogs_test'
let emptyDirectory
before(() => { emptyDirectory = mkdtempSync(path.join(tmpdir(), 'fso-config-test-')) })
after(() => { rmSync(emptyDirectory, { recursive: true, force: true }) })
const load = variables => spawnSync(process.execPath, ['-e', `require(${JSON.stringify(configPath)})`], {
  cwd: emptyDirectory,
  env: { ...variables },
  encoding: 'utf8'
})
const rejects = (variables, message) => {
  const result = load(variables)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, message)
}

test('test mode cannot fall back to the application URL or the repository dotenv file', () => {
  rejects({ TESTING: 'true', DATABASE_URL: normal }, /TEST_DATABASE_URL is required/)
})
test('normal mode requires its own database URL', () => {
  rejects({ TEST_DATABASE_URL: isolated }, /DATABASE_URL is required/)
})
test('test mode is forbidden in production even with separate database names', () => {
  rejects({ TESTING: 'true', NODE_ENV: 'production', DATABASE_URL: normal, TEST_DATABASE_URL: isolated }, /Test mode is forbidden in production/)
})
test('distinct test database names and harmless connection options are allowed', () => {
  const result = load({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: `${isolated}?sslmode=disable&application_name=course-tests` })
  assert.equal(result.status, 0, result.stderr)
})
for (const host of ['localhost', '127.0.0.1', '[::1]', '[::ffff:127.0.0.1]', 'localhost.']) {
  test(`the same database through loopback alias ${host} is rejected`, () => {
    rejects({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: `postgres://other:other@${host}/blogs` }, /Test and application database names must be different/)
  })
}
for (const option of ['host=localhost', 'port=5432', 'database=blogs', 'db=blogs', 'dbname=blogs', 'hostaddr=127.0.0.1', 'service=production', 'servicefile=production', 'HOST=localhost']) {
  test(`destination query override ${option} is rejected`, () => {
    rejects({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: `${isolated}?${option}` }, /destination override is forbidden/)
  })
}
test('a host override cannot conceal that the test URL targets the normal database', () => {
  rejects({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: 'postgres://sample:sample@different-host:5432/blogs?host=localhost' }, /destination override is forbidden/)
})
test('destination overrides in the normal URL are rejected too', () => {
  rejects({ DATABASE_URL: `${normal}?host=another-server` }, /destination override is forbidden/)
})
test('matching database names are rejected even when hosts and ports differ', () => {
  rejects({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: 'postgres://sample:sample@another-host:5433/blogs' }, /database names must be different, regardless of host/)
})
test('encoded database names cannot bypass identity comparison', () => {
  rejects({ TESTING: 'true', DATABASE_URL: normal, TEST_DATABASE_URL: 'postgres://sample:sample@localhost/%62logs' }, /Test and application database names must be different/)
})
for (const url of ['postgres://localhost', 'postgres://localhost/', 'https://localhost/blogs', 'invalid']) {
  test(`invalid destination ${url} is rejected without trying to connect`, () => {
    rejects({ DATABASE_URL: url }, /Database URL must/)
  })
}
