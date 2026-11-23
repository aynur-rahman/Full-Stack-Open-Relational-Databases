const { DataTypes } = require('sequelize')
module.exports = {
  up: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.createTable('users', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      password_hash: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction })
    await q.createTable('blogs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      author: { type: DataTypes.STRING },
      url: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      likes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction })
    await q.sequelize.query('ALTER TABLE blogs ADD CONSTRAINT blogs_likes_nonnegative CHECK (likes >= 0)', { transaction })
  }),
  down: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.dropTable('blogs', { transaction })
    await q.dropTable('users', { transaction })
  })
}
