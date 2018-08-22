const models = require('../models')

module.exports = (lindy) => {
  const notifications = lindy.router('/api/notifications')

  notifications.get('/list', 'Lists the notifications of a user')
    .middleware('auth')
    .middleware('pagination')
    .params((validate) => {
    })
    .run((params) => {})

  notifications.get('/group', 'Lists the notifications of a group')
    .middleware('auth')
    .middleware('pagination')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => {})
}
