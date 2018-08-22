'use strict'

const moment = require('moment')

class DatesService {
  static gameDate (game, date) {
    date = moment(date, 'DD/MM/YYYY')
    switch (game) {
      case 'euromillones':
        return date.add(20, 'hours')

      case 'bonoloto':
        return date.add(19.5, 'hours')

      case 'primitiva':
        return date.add(19, 'hours').add(40, 'minutes')

      case 'gordo':
        return date.add(20.5, 'hours')

      case 'loteria':
        if (date.date() === 22 && date.month() === 11) {
          return date.add(8.5, 'hours')
        }
        if (date.day() === 6) {
          return date.add(13, 'hours')
        } else if (date.day() === 4) {
          return date.add(21, 'hours')
        }
    }
  }
}

module.exports = DatesService
