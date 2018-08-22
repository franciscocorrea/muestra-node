let models = require('../../models')

module.exports = class GroupsController {
  static index (params) {
    return models.seaquel.queryAll(`
        SELECT
          groups."id",
          groups."createdAt",
          groups."name",
          groups."game",
          groups."membersCount",
          groups."shareInitial",
          groups."share",
          groups."credit",
          array_agg(memberships."userId") AS "users",
          array_agg(memberships."level") AS "levels",
          (SELECT "subscription" FROM bets WHERE "groupId" = groups."id" ORDER BY "groupId", "date" DESC LIMIT 1) AS recurrent
        FROM groups
        LEFT JOIN "memberships" ON memberships."groupId" = groups."id"
        GROUP BY groups."id"
        ORDER BY groups."id" DESC
      `, null)
      .then((groups) => {
        params.groups = groups
      })
      .then(() => params)
  }
}
