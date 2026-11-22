require('dotenv').config({ quiet: true })
const testing = process.env.TESTING === 'true'
if (testing && process.env.NODE_ENV === 'production') throw new Error('Test mode is forbidden in production')
const databaseUrl = testing ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
if (!databaseUrl) throw new Error(testing ? 'TEST_DATABASE_URL is required' : 'DATABASE_URL is required')
const databaseName = value => {
  let url
  try { url = new URL(value) }
  catch { throw new Error('Database URL must be a valid PostgreSQL URL') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Database URL must use PostgreSQL')
  const destinationOptions = new Set(['host', 'hostaddr', 'port', 'database', 'db', 'dbname', 'service', 'servicefile'])
  for (const key of url.searchParams.keys()) {
    if (destinationOptions.has(key.toLowerCase())) throw new Error(`Database URL destination override is forbidden: ${key}`)
  }
  if (!url.hostname || !url.pathname || url.pathname === '/') throw new Error('Database URL must specify a host and database name')
  try { return decodeURIComponent(url.pathname.slice(1)) }
  catch { throw new Error('Database URL must have a valid encoded database name') }
}
const selectedDatabaseName = databaseName(databaseUrl)
if (testing && process.env.DATABASE_URL && selectedDatabaseName === databaseName(process.env.DATABASE_URL)) {
  throw new Error('Test and application database names must be different, regardless of host')
}
module.exports = { testing, databaseUrl, secret: process.env.SECRET, port: Number(process.env.PORT) || 3001 }
