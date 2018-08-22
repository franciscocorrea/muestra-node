var models = require('../models')

module.exports = class NotificationsController {
  static group (params) {
    return models.notifications.selectAll({ groupId: params.group.id }, { orderBy: 'id DESC' })
      .catch((err) => Promise.reject(err))
      .then((notifications) => ({ notifications }))
  }

  static list (params) {
    return models.notifications.selectAll({
      userId: params.user.id
    }, { limit: 200 })
    .then((notifications) => ({ notifications }))
  }
}
