'use strict'

const Transaction = require('../../models').transactions

class TransactionService {
  /**
   * register a transaction from an user
   * @param {*} amount
   * @param {*} type
   * @param {*} description
   * @param {*} user
   * @param betId
   * @param groupId
   * @param price
   */
  static async fromUser (amount, type, description, user, betId = null, groupId = null, price = null) {
    console.log('[Transaction Service] storing an user transction')
    return Transaction.insert({
      amount,
      type,
      description,
      groupId,
      price,
      betId,
      userId: user.id,
      previousCredit: user.loadedCredit + user.earnedCredit,
      createdAt: new Date()
    })
  }
}

module.exports = TransactionService
