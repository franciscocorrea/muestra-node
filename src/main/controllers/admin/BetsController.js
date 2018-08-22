let models = require('../../models')
var db = models.seaquel

module.exports = class TransactionsController {
  static index (params) {
    return db.queryAll(`
        SELECT
          bets."id" AS "id",
          MAX(bets."game") AS "game",
          MAX(bets."bet") AS "bet",
          MAX(bets."price") AS "price",
          (SELECT ABS(transactions."amount") FROM transactions WHERE transactions."betId" = bets."id") AS "total",
          MAX(bets."createdAt") AS "createdAt",
          MAX(bets."date") AS "date",
          MAX(bets."validationDate") AS "validationDate",
          MAX(bets."prize") AS "prize",
          MAX(bets."userId") FILTER (WHERE bets."groupId" IS NULL) AS "userId",
          MAX(bets."groupId") AS "groupId",
          MAX(groups."name") AS "groupName",
          MAX(bets."externalId") AS "externalId",
          CONCAT(MAX(users."firstName") FILTER (WHERE bets."groupId" IS NULL), ' ', MAX(users."lastName")FILTER (WHERE bets."groupId" IS NULL)) "userName",
          array_agg(bets."userId") FILTER (WHERE bets."userId" IS NOT NULL) AS "users",
          MAX(bets."paidAt") AS "paidAt",
          MAX(bets."scrutinizedAt") AS "scrutinizedAt",
          MAX(bets."lluvia") AS "lluvia",
          MAX(bets."millones") AS "millones",
          MAX(bets."num") AS "num"
        FROM bets
        LEFT JOIN "groups" ON bets."groupId" = groups."id"
        LEFT JOIN "users" ON bets."userId" = users."id"
        GROUP BY bets."externalId", bets."id"
        ORDER BY "createdAt" DESC
      `, null)
      .then((bets) => {
        for (var bet in bets) {
          bets[bet].total = bets[bet].price * bets[bet].num
          if (bets[bet].game === 'euromillones') {
            bets[bet].bet = (bets[bet].millones ? bets[bet].bet + '  Millon: ' + bets[bet].millones : bets[bet].bet + '')
            bets[bet].bet = (bets[bet].lluvia ? bets[bet].bet + '    Lluvia: ' + bets[bet].lluvia : bets[bet].bet + '')
          }
        }
        params.bets = bets
      })
      .then(() => params)
  }
}
