let models = require('../../models')

module.exports = class TransactionsController {
  static index (params) {
    let filter = ''

    if (params.type && params.id) {
      filter = params.type === 'user' ? 'WHERE users."id" = ' + params.id : 'WHERE groups."id" = ' + params.id
    }

    return models.seaquel.queryAll(`
      SELECT
        transactions."id",
        transactions."description",
        transactions."amount",
        transactions."price",
        transactions."type",
        transactions."previousCredit",
        transactions."createdAt",
        transactions."userId",
        transactions."groupId",
        users."firstName" AS "userFirstName",
        users."lastName" AS "userLastName",
        groups."name" AS "groupName",
        bets."id" AS "betId",
        bets."date" AS "date",
        bets."subscription" as "subscription",
        bets."externalId" as "order",
        array_agg(memberships."userId") AS "groupUsers",
        SUM(users."loadedCredit" + users."earnedCredit") AS "userCredit",
        MAX(groups."credit") AS "groupCredit"
        FROM transactions
        LEFT JOIN "users" ON users."id" = transactions."userId"
        LEFT JOIN "groups" ON groups."id" = transactions."groupId"
        LEFT JOIN "memberships" ON memberships."groupId" = transactions."groupId"
        LEFT JOIN "bets" ON bets."id" = transactions."betId"
        ${filter}
        GROUP BY transactions."id", users."firstName", users."lastName", groups."name", bets."id"
        ORDER BY transactions."createdAt" DESC
        `, null
    )
      .then((transactions) => {
        let transactionsLength = transactions.length - 1
        let balance = []

        for (let i = transactionsLength; i >= 0; i--) {
          if (transactions[i].userId) {
            if (!balance[transactions[i].userId]) {
              balance[transactions[i].userId] = 0
            }
            balance[transactions[i].userId] += transactions[i].amount
            transactions[i].userCredit = balance[transactions[i].userId]
          } else if (transactions[i].groupId) {
            if (!balance[transactions[i].groupId]) {
              balance[transactions[i].groupId] = 0
            }
            balance[transactions[i].groupId] += transactions[i].amount
            transactions[i].groupCredit = balance[transactions[i].groupId]
          }
        }

        if (params.type && params.id) {
          if (params.type !== 'user') {
            var filterElement = transactions.filter((item) => {
              return (item.type === 'group' && item.userId === null) || ((item.type === 'bet' && item.userId === null) || item.type === 'prize')
            })

            transactions = filterElement
          }
        }
        params.transactions = transactions
      })
      .then(() => params)
  }
}
