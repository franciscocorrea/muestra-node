'use strict'

let models = require('../../models')
const moment = require('moment')
const Withdrawal = require('../../models').withdrawals

module.exports = class WithdrawalsController {
  static index (params) {
    let filter = ''

    if (params.id) {
      filter = 'WHERE withdrawals."userId" = ' + params.id
    }

    return models.seaquel.queryAll(`
      SELECT
        withdrawals."id",
        withdrawals."amount",
        withdrawals."createdAt",
        withdrawals."userId",
        withdrawals."processedAt",
        users."firstName" AS "userFirstName",
        users."lastName" AS "userLastName",
        withdrawals."ibn" AS "bankAccount"
        FROM withdrawals
        LEFT JOIN "users" ON users."id" = withdrawals."userId"
        ${filter}
        ORDER BY withdrawals."createdAt" DESC
        `, null
    )
      .then((results) => {
        params.withdrawls = results
      })
      .then(() => params)
  }

  /**
   *
   * @param {*} params
   */
  static async update (params) {
    const withdrawals = await Withdrawal.selectOne({id: params.id})
    withdrawals.processedAt = new Date()
    await Withdrawal.update(withdrawals)
    return {sucess: true, date: moment(withdrawals.processedAt, 'YYYY-MM-DD').format('DD/MM/YY HH:mm:ss')}
  }
}
