'use strict'

const models = require('../../models')

module.exports = class TpvTransactionController {
    /**
     * Lists tpv transaction.
     *
     * @param {*} param
     */
  static async index (params) {
    let filter = ''

    if (params.id) {
      filter = 'WHERE tpv_transactions."userId" = ' + params.id
    }

    const tpvTransactions = await models.seaquel.queryAll(`
        SELECT
          tpv_transactions."id",
          tpv_transactions."order",
          tpv_transactions."amount",
          tpv_transactions."cardBrand",
          tpv_transactions."cardNumber",
          tpv_transactions."expiryDate",
          tpv_transactions."processedAt",
          tpv_transactions."createdAt",
          users."firstName",
          users."lastName"
          FROM tpv_transactions
          INNER JOIN "users" ON users."id" = tpv_transactions."userId"
          ${filter}
          ORDER BY tpv_transactions."createdAt" DESC
          `, null)

    params.tpvs = tpvTransactions

    return params
  }
}
