var services = require('../services')
var moment = require('moment')

const mail = (date, invitation, group, user) => {
  services.email2.sendMail({
    to: invitation.email,
    subject: `${user.firstName} ${user.lastName} te ha invitado a la peña ${group.name}`,
    template: invitation.userId ? 'invited-exist-user' : 'invited-user',
    context: {
      admin: `${user.firstName} ${user.lastName}`,
      namePena: group.name,
      itunesUrl: 'https://itunes.apple.com/es/app/lotterapp/id1187324128?ls=1&mt=8',
      androidLastet: `${process.env.BASE_URL}/downloads/${process.env.LATEST_APK}`,
      nameDayLimit: moment(date).format('dddd'),
      dayLimit: moment(date).format('DD'),
      monthDay: moment(date).format('MMMM'),
      timeLimit: moment(date).format('HH:mm')
    }
  })
}

exports.notify = (date, invitation, group, user) => {
  mail(date, invitation, group, user)
}
