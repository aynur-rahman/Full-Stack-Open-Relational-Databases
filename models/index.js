const User = require('./user')
const Blog = require('./blog')
User.hasMany(Blog, { foreignKey: { name: 'userId', allowNull: false } })
Blog.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false } })
module.exports = { User, Blog }
