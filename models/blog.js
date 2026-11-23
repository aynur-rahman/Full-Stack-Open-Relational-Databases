const { Model, DataTypes } = require('sequelize')
const { sequelize } = require('../util/db')
class Blog extends Model {}
Blog.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  author: { type: DataTypes.STRING },
  url: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
  title: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
  likes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { isInt: true, min: 0 } },
  year: { type: DataTypes.INTEGER, validate: { validYear(value) {
    if (value != null && (!Number.isInteger(value) || value < 1991 || value > new Date().getFullYear())) {
      throw new Error(`year must be an integer from 1991 to ${new Date().getFullYear()}`)
    }
  } } }
}, { sequelize, underscored: true, modelName: 'blog' })
module.exports = Blog
