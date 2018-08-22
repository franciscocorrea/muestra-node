var models = require('../models')
var services = require('../services')
var db = models.seaquel
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects
var pync = require('pync')
var dedent = require('dedent')
var incr = require('seaquel').incr

const latestAPK = `${process.env.BASE_URL}/downloads/${process.env.LATEST_APK}`

module.exports = class GroupsController {
  static _loadMembers (groups) {
    return pync.series(groups, (group) => (
      db.queryAll(`
          SELECT
            ${models.memberships.columns('m')},
            ${models.users.columns('u')}
          FROM memberships m
          JOIN users u ON u.id = m."userId"
          WHERE m."groupId" = $1
          ORDER BY m."createdAt" ASC
        `, [group.id])
        .then((members) => {
          group.members = members.map((m) => ({
            user: db.pick(m, 'u'),
            membership: db.pick(m, 'm')
          }))
        })
        .then(() => {
          return db.queryAll(`
              SELECT
                ${models.users.columns('u')},
                ${models.invitations.columns('i')}
              FROM invitations i
              LEFT JOIN users u ON u.id = i."userId"
              WHERE i."groupId" = $1
              ORDER BY i.id DESC
            `, [group.id])
          .then((rows) => {
            group.invitations = rows.map((row) => {
              var invitation = db.pick(row, 'i')
              if (invitation.userId) {
                invitation.user = db.pick(row, 'u')
              }
              return invitation
            })
          })
        })
    ))
    .then(() => groups)
  }

  static list (params) {
    // TODO: pagination
    return models.groups.selectAll({ public: true })
      .then((groups) => {
        groups.forEach((group) => (group.isMember = false))
        if (!params.user) return { groups }
        return models.memberships.selectAll({ userId: params.user.id })
          .then((memberships) => {
            groups.forEach((group) => {
              var membership = memberships.find((mem) => mem.groupId === group.id)
              group.isMember = !!membership
              group.unreadCount = membership ? membership.unreadCount : 0
            })
          })
          .then(() => this._loadMembers(groups))
          .then((groups) => ({ groups }))
      })
  }

  static joined (params) {
    // TODO: pagination
    return db.queryAll(`
        SELECT
          i."invitedById" AS "g_invitedById",
          i."expiresAt" AS "g_expiresAt",
          false AS "g_isMember",
          ${models.groups.columns('g')}
        FROM invitations i
        JOIN groups g ON g.id = i."groupId"
        WHERE i."userId" = $1
        ORDER BY i.id DESC
      `, [params.user.id])
    .then((rows) => {
      var invitations = rows.map((r) => db.pick(r, 'g'))
      return db.queryAll(`
          SELECT
            ${models.memberships.columns('m')},
            ${models.groups.columns('g')},
            (
              SELECT NOT EXISTS(SELECT id FROM bets WHERE date > NOW() AND "groupId" = g.id LIMIT 1)
              AND NOT EXISTS(SELECT id FROM subscriptions WHERE "groupId" = g.id LIMIT 1)
            ) AS "g_canPlay"
          FROM memberships m
          JOIN groups g ON g.id = m."groupId"
          WHERE m."userId" = $1
          ORDER BY g."createdAt" DESC
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
          return this._loadMembers(invitations.concat(groups))
        })
    })
    .then((groups) => {
      return models.users.update({ id: params.user.id, acceptedInvites: 0 })
        .then(() => groups)
    })
    .then((groups) => ({ groups, acceptedInvites: params.user.acceptedInvites }))
  }

  static async create (params) {
    const latestGroups = await models.groups.selectAll({}, { limit: 10, orderBy: 'id DESC' })
    const exists = latestGroups.find(group => group.name === params.name)
    if (exists) {
      return rejects.badRequest(`Ya existe una peña reciente con este nombre`)
    }
    if (params.user.credit < params.share) {
      return rejects.badRequest(`No tienes suficiente crédito. Necesitas ${params.share / 100}€ y tienes ${params.user.credit / 100}€`)
    }
    params.invitations = []
    if (params.invitationNames && params.invitationEmails && params.invitationMobiles) {
      if (params.invitationNames.length === params.invitationEmails.length && params.invitationEmails.length === params.invitationMobiles.length) {
        params.invitationNames.forEach((name, i) => {
          params.invitations.push({
            name: name,
            email: params.invitationEmails[i],
            mobile: services.phone.normalize(params.invitationMobiles[i])
          })
        })
      } else {
        return rejects.badRequest('invitationNames, invitationEmails and invitationMobiles must have the same length')
      }
    }
    var now = new Date()
    var group = {
      name: params.name,
      public: params.private !== 'true',
      game: params.game,
      membersCount: 1,
      share: params.share,
      shareInitial: params.share,
      createdAt: now,
      updatedAt: now,
      latestCampaign: now
    }
    var _game = params.game
    if (_game === 'gordo') _game = 'gordo_primitiva'
    return services.gadmin('ConsultaBotes', `<Query><juego>${_game}</juego></Query>`).then((botes) => {
      botes.bote.forEach((bote) => {
        group.latestBetBote = +bote.importe[0] || null
        group.latestBetDate = services.dates.parseDate(bote.fecha[0]) || null
      })
    })
    .then(() => models.groups.insert(group))
    .then((group) => {
      var description = `Aportación Peña ${group.name}`
      return (params.user ? services.credit.creditUser(params.user, 'group', params.share, group, description) : Promise.resolve())
      .then(() => {
        var now = new Date()
        return models.memberships.insert({
          groupId: group.id,
          userId: params.user.id,
          level: 'admin',
          createdAt: now,
          latestPayment: now
        })
      })
      .then(() => {
        var image = params.image && params.image[0]
        if (image) {
          console.log('uploading image')
          return services.s3.uploadFile(image.path, `group-${group.id}-${Date.now()}.jpg`).then((url) => {
            console.log('uploaded image', url)
            group.image = url
          })
          .then(() => models.groups.update(group))
        }
      })
      .then(() => this._invite(group, params.invitations, params.user))
      .then(() => group)
    })
  }

  static _invite (group, invitations, invitedBy) {
    return pync.series(invitations, (invitation) => {
      invitation.groupId = group.id
      invitation.mobile = services.phone.normalize(invitation.mobile)
      return Promise.all([
        invitation.email ? models.users.selectOne({ email: invitation.email }) : Promise.resolve(null),
        invitation.mobile ? models.users.selectOne({ mobile: invitation.mobile }) : Promise.resolve(null)
      ])
      .then((results) => {
        var user = results[0] || results[1]
        return (user
          ? models.memberships.selectOne({ userId: user.id, groupId: group.id })
          : Promise.resolve(null)
        )
          .then((membership) => {
            if (membership) return
            var userId = (user && user.id) || null
            return models.invitations.insert({
              name: invitation.name,
              mobile: invitation.mobile || null,
              email: invitation.email || null,
              groupId: group.id,
              userId,
              invitedById: invitedBy.id
            })
            .then((invitation) => {
              var fullName = `${invitedBy.firstName} ${invitedBy.lastName}`
              if (!userId && invitation.mobile) {
                const text = userId
                  ? dedent`Accede a LotterApp y únete a la peña.`
                  : dedent`Haz click aquí para iOS ${process.env.APPLE_STORE_LINK} o aquí para Android ${latestAPK}, descarga LotterApp y regístrate y verifica tu número de móvil desde la Configuración del Perfil en LotterApp para unirte a la peña.`
                services.twilio.sendSms(invitation.mobile, dedent`
                  ${fullName} te ha invitado a la peña ${group.name}. ${text}
                  Este SMS ha sido enviado por LotterApp a petición de ${fullName}.`)
              }
              if (userId) {
                return models.devices.selectAll({ userId })
                  .then((devices) => {
                    devices.forEach((device) => {
                      services.push.sendNotification(device, {
                        alert: `${fullName} te ha invitado a la peña ${group.name}`,
                        payload: {
                          group: group.id
                        }
                      })
                    })
                  })
              }
            })
          })
      })
    })
  }

  static show (params) {
    var group = params.group
    group.isMember = false
    return db.queryAll(`
        SELECT
          ${models.users.columns('u')},
          ${models.invitations.columns('i')}
        FROM invitations i
        LEFT JOIN users u ON u.id = i."userId"
        WHERE i."groupId" = $1
        ORDER BY i.id DESC
      `, [group.id])
    .then((rows) => {
      group.invitations = rows.map((row) => {
        var invitation = db.pick(row, 'i')
        if (invitation.userId) {
          invitation.user = db.pick(row, 'u')
        }
        return invitation
      })
    })
    .then(() => {
      return db.queryAll(`
          SELECT
            ${models.users.columns('u')},
            ${models.memberships.columns('m')}
          FROM memberships m
          LEFT JOIN users u ON u.id = m."userId"
          WHERE m."groupId" = $1
          ORDER BY m."createdAt" DESC
        `, [group.id])
        .then((memberships) => {
          var mems = memberships.map((m) => {
            var user = db.pick(m, 'u')
            var membership = db.pick(m, 'm')
            if (params.user && user.id === params.user.id) {
              group.isMember = true
              group.membershipLevel = membership.level
              group.unreadCount = membership.unreadCount
            }
            return {
              user,
              membership
            }
          })
          group.members = mems
        })
    })
    .then(() => {
      return db.queryOne(`
        SELECT (
          SELECT NOT EXISTS(SELECT id FROM bets WHERE date > NOW() AND "groupId" = $1 LIMIT 1)
          AND NOT EXISTS(SELECT id FROM subscriptions WHERE "groupId" = $1 LIMIT 1)
        ) AS "canPlay"
      `, [group.id])
      .then((row) => {
        group.canPlay = row.canPlay
      })
    })
    .then(() => ({ group }))
  }

  static update (params) {
    var changesName = params.group.name !== params.name
    var changesImage = false
    return Promise.resolve()
      .then(() => {
        params.group.updatedAt = new Date()
        params.group.name = params.name
        var image = params.image && params.image[0]
        if (image) {
          console.log('uploading image')
          return services.s3.uploadFile(image.path, `group-${params.group.id}-${Date.now()}.jpg`).then((url) => {
            console.log('uploaded image', url)
            params.group.image = url
            changesImage = true
          })
        }
      })
      .then(() => models.groups.update(params.group))
      .then(() => params.group)
  }

  static join (params) {
    return models.memberships.selectOne({
      userId: params.user.id,
      groupId: params.group.id
    })
    .then((membership) => {
      if (membership) {
        return models.invitations.deleteWhere({
          userId: params.user.id,
          groupId: params.group.id
        })
      }
      return models.invitations.selectAll({
        userId: params.user.id,
        groupId: params.group.id
      })
      .then((invitations) => {
        var date = invitations.reduce((max, invitation) => !max || max < invitation.expiresAt ? invitation.expiresAt : max, null)
        if (!date || date < new Date()) {
          return rejects.forbidden('No estás invitado a esta peña o la invitación ha expirado')
        }
        var description = `Aportación Peña ${params.group.name}`
        return services.credit.creditUser(params.user, 'group', params.group.shareInitial, params.group, description)
          .then(() => {
            var now = new Date()
            return models.memberships.insert({
              groupId: params.group.id,
              userId: params.user.id,
              level: 'user',
              createdAt: now,
              latestPayment: now
            })
          })
          .then(() => {
            return models.bets.selectAll({
              groupId: params.group.id,
              'userId is': null,
              'createdAt >': params.group.latestCampaign,
              'date >': new Date()
            })
            .then((bets) => {
              return pync.series(bets, (bet) => {
                if (bet.userId !== null) return
                return models.bets.insert({
                  groupId: bet.groupId,
                  userId: params.user.id,
                  transactionId: bet.transactionId,
                  bet: bet.bet,
                  game: bet.game,
                  num: bet.num,
                  date: bet.date,
                  createdAt: new Date(),
                  externalId: bet.externalId,
                  price: bet.price,
                  bote: bet.bote,
                  subscriptionId: bet.subscriptionId,
                  subscription: bet.subscription,
                  gadminUser: bet.gadminUser
                })
              })
            })
          })
          .then(() => {
            var invitedById = invitations[0] && invitations[0].invitedById
            if (invitedById) {
              models.users.update({
                id: invitedById,
                acceptedInvites: incr(1)
              })
              .then(() => models.devices.selectAll({ userId: invitedById }))
              .then((devices) => {
                devices.forEach((device) => {
                  services.push.sendNotification(device, {
                    alert: `${params.user.firstName} ${params.user.lastName} se ha unido a la peña ${params.group.name}`,
                    payload: {
                      group: params.group.id
                    }
                  })
                })
              })
              .catch((err) => {
                console.log('err', err.stack)
              })
            }
            return pync.series(invitations, (invitation) => models.invitations.delete(invitation))
          })
      })
    })
    .then(() => services.groups.updateFields(params.group))
    .then(() => ({}))
  }

  static skip (params) {
    return models.invitations.deleteWhere({
      userId: params.user.id,
      groupId: params.group.id
    })
    .then(() => ({}))
  }

  static leave (params) {
    return services.groups.leave(params.user, params.group)
  }
}
