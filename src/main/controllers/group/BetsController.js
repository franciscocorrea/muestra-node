'use strict'

const Bets = require('../../models').bets

class BetsController {
  /**
   * lists all the bets.
   * @param {*} params
   */
  static async index (params) {
    const bets = await Bets
      .selectAll({userId: params.user.id}, {limit: 1000, orderBy: 'date ASC'})

    return {bets}
  }

  /**
   * stores a new bet for an user
   * @param {*} params
   */
  static async store (params) {

  }
}

module.exports = BetsController
