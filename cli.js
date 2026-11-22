require('dotenv').config({ quiet: true })
const { Sequelize, QueryTypes } = require('sequelize')

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false })

const main = async () => {
  try {
    const blogs = await sequelize.query('SELECT author, title, likes FROM blogs ORDER BY id', { type: QueryTypes.SELECT })
    for (const blog of blogs) {
      console.log(`${blog.author}: '${blog.title}', ${blog.likes} likes`)
    }
  } catch (error) {
    console.error('Could not list blogs:', error.message)
    process.exitCode = 1
  } finally {
    await sequelize.close()
  }
}

main()
