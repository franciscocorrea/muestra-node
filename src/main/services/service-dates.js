const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Madrid')

exports.parseDate = (value, time) => {
  if (value.length === 'DD/MM/YY'.length) {
    if (time) return moment(`${value} ${time}`, 'DD/MM/YY HH:mm')
    return moment(value, 'DD/MM/YY')
  } else if (value.length === 'DD/MM/YYYY'.length) {
    if (time) return moment(`${value} ${time}`, 'DD/MM/YYYY HH:mm')
    return moment(value, 'DD/MM/YYYY')
  } else if (value.length === 'DD/MM/YYYY HH:mm'.length) {
    return moment(value, 'DD/MM/YYYY HH:mm')
  } else if (value.length === 'DD/MM/YYYY HH:mm:ss'.length) {
    return moment(value, 'DD/MM/YYYY HH:mm:ss')
  }
}

exports.next = (dayINeed, from = new Date()) => {
  // if we haven't yet passed the day of the week that I need:
  if (moment(from).isoWeekday() < dayINeed) {
    // then just give me this week's instance of that day
    return moment(from).isoWeekday(dayINeed)
  } else {
    // otherwise, give me next week's instance of that day
    return moment(from).add(1, 'weeks').isoWeekday(dayINeed)
  }
}

exports.prev = (dayINeed, from = new Date()) => {
  // if we haven't yet passed the day of the week that I need:
  if (moment(from).isoWeekday() > dayINeed) {
    // then just give me this week's instance of that day
    return moment(from).isoWeekday(dayINeed)
  } else {
    // otherwise, give me next week's instance of that day
    return moment(from).add(-1, 'weeks').isoWeekday(dayINeed)
  }
}
