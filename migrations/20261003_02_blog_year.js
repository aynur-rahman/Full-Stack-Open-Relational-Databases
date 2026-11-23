const { DataTypes } = require('sequelize')
module.exports = {
  up: async ({ context: q }) => q.sequelize.transaction(async transaction => {
    await q.addColumn('blogs', 'year', { type: DataTypes.INTEGER }, { transaction })
    await q.sequelize.query('ALTER TABLE blogs ADD CONSTRAINT blogs_year_range CHECK (year >= 1991 AND year <= EXTRACT(YEAR FROM CURRENT_DATE))', { transaction })
  }),
  down: async ({ context: q }) => q.removeColumn('blogs', 'year')
}
