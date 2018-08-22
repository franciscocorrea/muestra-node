const lindyhop = require('lindyhop')
const moment = require('moment')
moment.locale('es')
const Groups = require('../../controllers/admin').Groups

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
  params.moment = moment
  params.DATE_FORMAT = 'DD/MM/YYYY'
  params.DATE_DD_MM_YY = 'DD/MM/YY'
  params.DATE_TIME_FORMAT = 'DD/MM/YY HH:mm:ss'
  params.currency = (amount) => ((amount || 0) / 100).toFixed(2) + ' €'
})

module.exports = (lindy) => {
  const groups = lindy.router('/admin/groups')
  groups.get('', 'List the groups (peñas)')
    .middleware('admin-auth')
    .middleware('admin')
    .middleware('pagination')
    .outputs('html', 'admin/admin-groups.pug')
    .run((params) => Groups.index(params))
}
