const { QueryTypes } = require('sequelize')
const { sequelize } = require('./util/db')
;(async () => {
  try {
    const blogs = await sequelize.query('SELECT author, title, likes FROM blogs ORDER BY id', { type: QueryTypes.SELECT })
    for (const blog of blogs) console.log(`${blog.author ?? 'Unknown author'}: '${blog.title}', ${blog.likes} likes`)
  } catch (error) {
    console.error('Could not list blogs:', error.message)
    process.exitCode = 1
  } finally { await sequelize.close() }
})()
