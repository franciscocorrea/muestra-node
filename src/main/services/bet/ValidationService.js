'use strict'
const moment = require('moment')
const Date = require('../../services/bet/DatesService')

class ValidationService {
  static date (game, date) {
    date = moment(date,'DD/MM/YYYY')
    const dateHour = Date.gameDate(game, date)
    var currentDate = moment().format('DD/MM/YYYY');
    var currentHour = moment().hour()
   
    if ((currentDate > date)) {
      return false
    }

     if ((current = date) && (currentHour > dateHour.hour())){
       return false
     }
    
    switch (game) {
      case 'euromillones':
        if ([2, 5].includes(date.day())) {
          return true
        }
        break

      case 'bonoloto':
        if ([0, 2, 3, 4, 5, 6].includes(date.day())) {
          return true
        }
        break

      case 'primitiva':
        if ([4, 6].includes(date.day())) {
          return true
        }
        break

      case 'gordo':
        if ([0].includes(date.day())) {
          return true
        }
        break

      case 'loteria':
        if (date.date() === 22 && date.month() === 11) {
          return true
        }
        if ([4, 6].includes(date.day())) {
          return true
        }
    }
  }
}

module.exports = ValidationService
