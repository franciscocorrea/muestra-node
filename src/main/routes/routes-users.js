const controllers = require('../controllers')
const AuthControllers = require('../controllers/auth')

module.exports = (lindy) => {
  const users = lindy.router('/api/users')

  users.post('/update', 'Edit the profile of a user')
    .middleware('auth')
    .middleware('upload')
    .params((validate) => {
      validate.string('firstName', 'The first name').trim().notEmpty().optional()
      validate.string('lastName', 'The last name').trim().notEmpty().optional()
      validate.string('dni', 'The DNI').trim().notEmpty().optional()
      validate.string('mobile', 'The mobile phone number').trim().notEmpty().optional()
      validate.string('address', 'The address').trim().notEmpty().optional()
      validate.string('birthdate', 'The birthdate in YYYY-MM-DD format').trim().notEmpty().optional()
      validate.string('bankAccount', 'The IBAN').trim().notEmpty().optional()
    })
    .run((params) => controllers.users.update(params))

  users.get('/show', 'Returns the profile of a user')
    .middleware('auth')
    .run((params) => controllers.users.show(params))

  users.post('/deleteCard', 'Deletes the credit card information')
    .middleware('auth')
    .run((params) => controllers.users.deleteCard(params))

  users.post('/updateDevice', 'Updates the device id')
    .middleware('auth')
    .params((validate) => {
      validate.string('deviceId', 'The device id. The APNs or Google GCM token')
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
    })
    .run((params) => controllers.users.updateDevice(params))

  users.post('/verification', 'Requests a verification code through SMS')
    .middleware('auth')
    .params((validate) => {
      validate.string('mobile', 'The user\'s mobile number').optional()
    })
    .run((params) => controllers.users.verificationMobile(params))

  users.post('/resend', 'Requests resending the verification email message')
    .middleware('auth')
    .params((validate) => {
      validate.string('email', 'The user\'s email address').optional()
    })
    .run((params) => controllers.users.verificationEmail(params))

  users.post('/verify', 'Verifies the mobile phone number of a user')
    .middleware('auth')
    .params((validate) => {
      validate.string('code', 'The verification code').upperCase()
    })
    .run((params) => controllers.users.verifyMobile(params))

  users.get('/verify/:code', 'Verifies the email address of a user')
    .outputs('html', 'email-verified')
    .params((validate) => {
      validate.string('code', 'The verification code').in('path')
    })
    .run((params) => controllers.users.verifyEmail(params))

  users.post('/delete', 'Deletes the account')
    .middleware('auth')
    .run((params) => controllers.users.deleteAccount(params))

  // ========================================
  // deprecate routes
  // ========================================
  users.post('/forgot', '[deprecate] Deletes the account')
    .params((validate) => {
      validate.string('email', 'The user\'s email')
    })
    .run((params) => AuthControllers.ForgotPassword.forgot(params))

  users.post('/reset', '[deprecate] Deletes the account')
    .params((validate) => {
      validate.string('email', 'The user\'s email')
      validate.string('code', 'The verification code')
      validate.string('password', 'The new password')
    })
    .run((params) => AuthControllers.ResetPassword.reset(params))

  users.post('/logout', '[deprecate] Logs out the user and invalidates the session')
    .middleware('auth')
    .params((validate) => {
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
    })
    .run((params) => AuthControllers.Login.logout(params))

  users.post('/signin', '[deprecate] Login a user')
    .params((validate) => {
      validate.string('email', 'The email of the user').trim().lowerCase().notEmpty()
      validate.string('password', 'The password').notEmpty()
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => AuthControllers.Login.signin(params))

  users.post('/register', '[deprecate] Register a user')
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
    .run((params) => AuthControllers.Register.signup(params))

  users.post('/facebook', '[deprecate] Register a user')
    .params((validate) => {
      validate.string('authToken', 'The auth token returned by Facebook\'s OAuth')
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => AuthControllers.Oauth.facebook(params))

  users.post('/google', '[deprecate] Register a user')
    .params((validate) => {
      validate.string('serverAuthCode', 'The server code returned by Google\'s OAuth').optional()
      validate.string('authToken', 'The auth token returned by Google\'s OAuth').optional()
      validate.string('deviceId', 'The device id. The APNs or Google GCM token').optional()
      validate.string('deviceType', 'The device type. Either "apns" or "gcm"').optional()
      validate.string('versionNumber', 'The version number for app').optional()
      validate.string('familyDevice', 'The family device for app').optional()
      validate.string('versionLite', 'The version lite for android').optional()
    })
    .run((params) => AuthControllers.Oauth.google(params))
}
