const { Model, DataTypes } = require('sequelize')
const { sequelize } = require('../util/db')
class Session extends Model {}
Session.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false }
}, { sequelize, underscored: true, modelName: 'session' })
module.exports = Session
