const { DataTypes } = require('sequelize')
module.exports = {
  up: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.createTable('reading_lists', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      blog_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'blogs', key: 'id' }, onDelete: 'CASCADE' },
      read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    }, { transaction })
    await q.addConstraint('reading_lists', { fields: ['user_id', 'blog_id'], type: 'unique', name: 'reading_lists_user_blog_unique', transaction })
  }),
  down: async ({ context: q }) => q.dropTable('reading_lists')
}
