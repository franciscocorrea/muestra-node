'use strict'
const pify = require('pify')
const Services = require('../../services')
const AuthServices = require('../../services/auth')
const models = require('../../models')
const request = pify(require('request'), { multiArgs: true })
const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects
const os = require('os')
const fs = require('fs')
const path = require('path')
const querystring = require('querystring')

class OauthController {
  /**
   * handled the oauth with facebook
   * @param {*} params
   */
  static async facebook (params) {
    const url = 'https://graph.facebook.com/v2.6/me'
    const options = {
      url,
      qs: {
        access_token: params.authToken,
        fields: 'first_name,last_name,email,picture'
      },
      json: true
    }
    const response = await request.get(options)
    const [header, body] = response
    if (header.statusCode !== 200 || !body.id) {
      return this.badRequest('facebook')
    }
    let user = await models.users.selectOne({ facebook: body.id })
    if (user) {
      if (user.deleted) {
        return rejects.forbidden('Cuenta deshabilitada')
      }
      return this.authenticated(user, params, false)
    }
    try {
      let user = await this.createUser(body, 'facebook')
      const silhouette = body.picture && body.picture.data && body.picture.data.is_silhouette
      if (!silhouette) {
        let qs = querystring.stringify({
          type: 'large',
          access_token: params.authToken
        })
        let imageUri = `https://graph.facebook.com/v2.6/me/picture?${qs}`
        user.image = await this.getAvatar(user, imageUri)
        await models.users.update(user)
      }
      return this.authenticated(user, params, true)
    } catch (error) {
      if (error.message.indexOf('duplicate key') >= 0) {
        return AuthServices.Account.duplicate(user.email)
      }
      return rejects.internalError(error)
    }
  }

  /**
   * handled the user oauth with google provider
   * @param {*} params
   */
  static async google (params) {
    if (!params.serverAuthCode && !params.authToken) {
      return Promise.reject(new Error('Missing idToken and authToken'))
    }
    if (!params.authToken) {
      let response = await this.getGoogleAuthToken(params)
      let [header, body] = response
      if (header.statusCode !== 200) {
        return this.badRequest('google')
      }
      params.authToken = body.access_token
    }
    let response = await this.getGoogleUser(params.authToken)
    let [header, body] = response
    if (header.statusCode !== 200 || !body.id) {
      return this.badRequest('google')
    }
    let user = await models.users.selectOne({ google: body.id })
    if (user) {
      if (user.deleted) {
        return rejects.forbidden('Cuenta deshabilitada')
      }
      return this.authenticated(user, params, false)
    }
    const userData = {
      id: body.id,
      email: body.emails.find((item) => item.type === 'account').value,
      first_name: body.name.givenName,
      last_name: body.name.familyName
    }
    try {
      user = await this.createUser(userData, 'google')
      const silhouette = body.image && body.image.isDefault
      if (!silhouette) {
        let urlParts = require('url').parse(body.image.url, true)
        urlParts.query.sz = '250'
        delete urlParts.href
        delete urlParts.path
        delete urlParts.search
        const imageUri = require('url').format(urlParts)
        user.image = await this.getAvatar(user, imageUri)
        await models.users.update(user)
      }

      return this.authenticated(user, params, true)
    } catch (error) {
      if (error.message.indexOf('duplicate key') >= 0) {
        return AuthServices.Account.duplicate(user.email)
      }
      return rejects.internalError(error)
    }
  }

  /**
   * create the user on the app
   * @param {*} params
   * @param {*} provider
   */
  static async createUser (params, provider) {
    if (!params.email) {
      rejects.badRequest(`Error: No hemos podido obtener tu email desde tu cuenta de ${provider}`)
    }
    const user = await models.users.insert({
      firstName: params.first_name,
      lastName: params.last_name,
      facebook: provider === 'facebook' ? params.id : null,
      google: provider === 'google' ? params.id : null,
      mobileVerificationCode: AuthServices.Tokenizer.randomToken(),
      emailVerificationCode: await AuthServices.Tokenizer.randomCryptoToken(),
      createdAt: new Date(),
      email: params.email
    })

    await models.notificationBotes.insert({game: 'all', subscribe: true, userId: user.id})
    await models.notificationPrize.insert({subscribe: true, userId: user.id})
    await models.notificationNews.insert({subscribe: true, userId: user.id})

    return user
  }

  /**
   * gets the facebook avatar uri
   * @param {*} user
   * @param {*} url
   */
  static async getAvatar (user, url) {
    if (!url) return Promise.resolve(null)
    const fullpath = path.join(os.tmpdir(), String(Date.now()))
    await new Promise((resolve, reject) => {
      const stream = require('request')(url).pipe(fs.createWriteStream(fullpath))
      stream.on('error', reject)
      stream.on('finish', resolve)
    })
    const imageUri = await Services.s3.uploadFile(fullpath, `user-${user.id}-${Date.now()}.jpg`)

    return imageUri
  }

  /**
   * gets the google oauth token
   * @param {*} data
   */
  static async getGoogleAuthToken (data) {
    const params = {
      url: 'https://www.googleapis.com/oauth2/v4/token',
      method: 'POST',
      form: {
        code: data.serverAuthCode,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URL,
        grant_type: 'authorization_code'
      },
      json: true
    }
    const response = await request(params)

    return response
  }

  /**
   * gets the google user information from an oauth token
   * @param {*} oauthToken
   */
  static async getGoogleUser (oauthToken) {
    const url = 'https://www.googleapis.com/plus/v1/people/me'
    const options = {
      url,
      qs: {
        access_token: oauthToken
      },
      json: true
    }
    const response = await request.get(options)

    return response
  }

  /**
   * called after user is authenticated
   * @param {*} user
   * @param {*} params
   * @param {*} isNew
   */
  static async authenticated (user, params, isNew) {
    const sessionData = await AuthServices.Account.regenerateSession(user, params, isNew)

    return sessionData
  }

  /**
   * return a forbiden response for bad communication with the oauth providers
   * @param {*} provider
   */
  static badRequest (provider) {
    return rejects.forbidden(`Ha habido un problema al comunicarse con ${provider}, por favor intenta de nuevo mas tarde`)
  }
}

module.exports = OauthController
