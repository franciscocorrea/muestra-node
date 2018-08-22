const Controllers = require('../controllers/auth')

module.exports = (lindy) => {
  const auth = lindy.router('/api/auth')

  auth.post('/signup', 'Register a user')
    .params((validate) => {
      validate.string('email', 'The email of the user').trim().lowerCase().notEmpty()
      validate.string('firstName', 'The first name').trim().notEmpty()
      validate.string('lastName', 'The last name').trim().notEmpty()
      validate.string('password', 'The password').notEmpty()
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => Controllers.Register.signup(params))

  auth.post('/signin', 'Login a user')
    .params((validate) => {
      validate.string('email', 'The email of the user').trim().lowerCase().notEmpty()
      validate.string('password', 'The password').notEmpty()
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => Controllers.Login.signin(params))

  auth.post('/signout', 'Logs out the user and invalidates the session')
    .middleware('auth')
    .params((validate) => {
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
    })
    .run((params) => Controllers.Login.signout(params))

  auth.post('/forgot', 'send code to reset password')
    .params((validate) => {
      validate.string('email', 'The user\'s email')
    })
    .run((params) => Controllers.ForgotPassword.forgot(params))

  auth.post('/reset', 'reset the password')
    .params((validate) => {
      validate.string('email', 'The user\'s email')
      validate.string('code', 'The verification code')
      validate.string('password', 'The new password')
    })
    .run((params) => Controllers.ResetPassword.reset(params))
  auth.post('/facebook', 'Register a user')
    .params((validate) => {
      validate.string('authToken', 'The auth token returned by Facebook\'s OAuth')
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => Controllers.Oauth.facebook(params))

  auth.post('/google', 'Register a user')
    .params((validate) => {
      validate.string('serverAuthCode', 'The server code returned by Google\'s OAuth').optional()
      validate.string('authToken', 'The auth token returned by Google\'s OAuth').optional()
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => Controllers.Oauth.google(params))
}
