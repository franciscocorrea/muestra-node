var services = require('../services')
var models = require('../models')
var db = models.seaquel
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects
var dedent = require('dedent')

var pync = require('pync')

module.exports = class UsersController {
  static randomVerificationCode () {
    var str = String(Math.random())
    return str.substring(str.length - 6)
  }

  static update (params) {
    var changes = { id: params.user.id }
    if (params.firstName) changes.firstName = params.firstName
    if (params.lastName) changes.lastName = params.lastName
    if (params.dni) changes.dni = params.dni
    if (params.mobile) changes.mobile = services.phone.normalize(params.mobile)
    if (params.address) changes.address = params.address
    if (params.birthdate) changes.birthdate = params.birthdate
    if (params.bankAccount) {
      changes.bankAccount = params.bankAccount.replace(/\W/g, '')
      if (!changes.bankAccount.match(/^ES\d{22}$/)) {
        return rejects.badRequest('Formato de IBAN incorrecto')
      }
    }
    return Promise.resolve()
      .then(() => {
        var image = params.image && params.image[0]
        if (image) {
          console.log('uploading image')
          // TODO: remove previous image
          return services.s3.uploadFile(image.path, `user-${params.user.id}-${Date.now()}.jpg`).then((url) => {
            console.log('uploaded image', url)
            changes.image = url
          })
        }
      })
      .then(() => models.users.updateAndSelect(changes))
      .then((user) => {
        user.credit = user.loadedCredit + user.earnedCredit
        return { user }
      })
  }

  static show (params) {
    let user = params.user
    user.credit = user.loadedCredit + user.earnedCredit
    return { user }
  }

  static deleteCard (params) {
    return models.users.update({
      id: params.user.id,
      redsysMerchantIdentifier: null,
      redsysExpiryDate: null
    })
    .then(() => ({}))
  }

  static verificationMobile (params) {
    var mobile = services.phone.normalize(params.mobile || params.user.mobile)
    if (!params.user.mobile && !params.mobile) {
      return rejects.badRequest('Introduce tu número de móvil en tu perfil')
    }
    if ((!params.mobile || params.user.mobile === mobile) && params.user.mobileVerified) {
      return rejects.badRequest('Número ya verificado')
    }
    var mobileVerificationCode = this.randomVerificationCode()
    var changes = {
      id: params.user.id,
      mobile,
      mobileVerificationCode,
      mobileVerified: false
    }
    return models.users.update(changes)
      .then(() => {
        return services.twilio.sendSms(mobile, `Código de validación: ${mobileVerificationCode}`)
      })
      .then(() => ({}))
  }

  static verifyMobile (params) {
    var user = params.user
    if (params.code !== user.mobileVerificationCode) {
      return rejects.badRequest('Código incorrecto')
    }
    var info = {
      id: user.id,
      mobileVerified: true,
      mobileVerificationCode: null
    }
    return models.users.update(info)
      .then(() => {
        return db.execute('UPDATE invitations SET "userId"=$1 WHERE mobile=$2 AND "userId" IS NULL', [user.id, user.mobile])
      })
      .then(() => ({}))
  }

  static verifyEmail (params) {
    return models.users.selectOne({ emailVerificationCode: params.code })
      .then((user) => {
        if (!user) return rejects.badRequest('El link que has utilizado no está bien formado o ya ha sido usado')
        user.emailVerified = true
        user.emailVerificationCode = null
        return models.users.update(user).then(() => ({}))
      })
  }

  static verificationEmail (params) {
    var email = params.email || params.user.email
    if (!params.user.email && !params.email) {
      return rejects.badRequest('Introduce tu dirección de email')
    }
    if ((!params.email || params.user.email === email) && params.user.emailVerified) {
      return rejects.badRequest('Dirección de email ya verificada')
    }
    var emailVerificationCode = this.randomVerificationCode()
    var changes = {
      id: params.user.id,
      email,
      emailVerificationCode,
      emailVerified: false
    }
    return models.users.update(changes)
      .then(() => {
        var fullName = `${params.user.firstName} ${params.user.lastName}`
        services.email.sendMail({
          to: email,
          subject: 'Bienvenido a LotterApp',
          html: dedent`
            <p>Hola ${fullName}, ¡bienvenido a LotterApp!</p>

            <p>Para verificar tu dirección de email haz <a href="${process.env.BASE_URL}/api/users/verify/${emailVerificationCode}">click aquí</a></p>
          `
        })
      })
      .then(() => ({}))
  }

  static canDelete (params) {
    if (params.user.credit > 0) return Promise.resolve({ canDelete: false })
    return models.bets.selectOne({ userId: params.user.id, 'date >': new Date() })
      .then((bet) => {
        if (bet) return { canDelete: false }
        return models.memberships.selectAll({ userId: params.user.id })
          .then((memberships) => {
            var canDelete = true
            return pync.series(memberships, (membership) => {
              if (membership.level === 'admin') {
                canDelete = false
                return
              }
              return models.groups.selectOne({ id: membership.groupId })
                .then((group) => {
                  if (group.credit > 0) canDelete = false
                })
            })
            .then(() => {
              return { canDelete }
            })
          })
      })
  }

  static deleteAccount (params) {
    return this.canDelete(params)
      .then((result) => {
        if (!result.canDelete) {
          return {
            message: dedent`
              Tu cuenta no puede ser dada de baja mientras tengas saldo, alguna apuesta pendiente de sortear o seas administrador o integrante de una peña con saldo o sorteos pendientes. Para cualquier consulta puedes ponerte en contacto con nosotros a través de este mail hola@lotterapp.com
            `
          }
        }
        var now = `deleted-${Date.now()}`
        return Promise.all([
          models.devices.deleteWhere({ userId: params.user.id }),
          models.sessions.deleteWhere({ userId: params.user.id }),
          models.memberships.deleteWhere({ userId: params.user.id }), // TODO: add notification?
          models.users.update({
            id: params.user.id,
            deleted: true,
            email: `${params.user.email}-${now}`,
            emailVerificationCode: null,
            mobile: `${params.user.mobile}-${now}`,
            facebook: `${params.user.facebook}-${now}`,
            google: `${params.user.google}-${now}`
          })
        ])
        .then(() => ({}))
      })
  }
}
