var models = require('../models')
var db = models.seaquel
var services = require('../services')

module.exports = class ChatController {
  static messages (params) {
    // TODO: pagination, check membership
    return db.execute(`
        UPDATE memberships m SET "unreadCount" = 0
        WHERE m."groupId" = $1 AND m."userId" = $2
      `, [params.group.id, params.user.id])
      .then((a) => {
        return models.messages.selectAll({
          groupId: params.group.id
        }, {
          orderBy: '"createdAt" ASC',
          limit: 100
        })
      })
      .then((messages) => ({ messages }))
  }

  static write (params) {
    // TODO: check membership
    return models.messages.insert({
      groupId: params.group.id,
      userId: params.user.id,
      text: params.text,
      createdAt: new Date()
    })
    .then((message) => {
      params.group.lastMessage = params.text
      params.group.lastMessageAuthor = `${params.user.firstName} ${params.user.lastName}`
      return models.groups.update(params.group)
        .then(() => {
          return db.execute(`
              UPDATE memberships m SET "unreadCount" = "unreadCount" + 1
              WHERE m."groupId" = $1 AND m."userId" <> $2
            `, [params.group.id, params.user.id])
          .then(() => {
            return db.queryAll(`
                SELECT
                  ${models.devices.columns('d')}
                FROM memberships m
                JOIN users u ON u.id = m."userId" AND m."userId" <> $2
                JOIN devices d ON u.id = d."userId"
                WHERE m."groupId" = $1
              `, [params.group.id, params.user.id])
          })
          .then((memberships) => {
            memberships.forEach((membership) => {
              var device = db.pick(membership, 'd')
              services.push.sendNotification(device, {
                alert: params.user.firstName + ': ' + params.text,
                payload: {
                  group: params.group.id
                }
              })
            })
          })
        })
        .then(() => ({ message }))
    })
  }

  static conversations (params) {
    // TODO: pagination
    return db.queryAll(`
        SELECT
          ${models.groups.columns('g')},
          ${models.memberships.columns('m')}
        FROM users u
        JOIN memberships m ON u.id = m."userId"
        JOIN groups g ON g.id = m."groupId"
        WHERE u.id = $1
        ORDER BY g."updatedAt" DESC
      `, [params.user.id])
      .then((memberships) => {
        var groups = memberships.map((m) => db.pick(m, 'g'))
        var mems = memberships.map((m) => db.pick(m, 'm'))
        groups.forEach((group) => {
          var membership = mems.find((mem) => mem.groupId === group.id)
          group.isMember = true
          group.membershipLevel = membership.level
          group.unreadCount = membership.unreadCount
        })
        return { groups }
      })
  }

  static members (params) {
    return db.queryAll(`
        SELECT
          ${models.users.columns('u')}
        FROM memberships m
        JOIN users u ON u.id = m."userId"
        WHERE m."groupId" = $1
        ORDER BY u."firstName" ASC
      `, [params.group.id])
      .then((memberships) => {
        var users = memberships.map((m) => db.pick(m, 'u'))
        return { users }
      })
  }
}
