const { DataTypes } = require('sequelize')
module.exports = {
  up: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.addColumn('users', 'disabled', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, { transaction })
    await q.createTable('sessions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction })
  }),
  down: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.dropTable('sessions', { transaction })
    await q.removeColumn('users', 'disabled', { transaction })
  })
}
