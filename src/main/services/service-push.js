const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })
const apn = require('apn')
const path = require('path')
const models = require('../models')
const db = models.seaquel

const type = process.env.NODE_ENV === 'production' ? 'distribution' : 'development'

const options = {
  cert: path.join(__dirname, `../../../certs/aps_${type}_cert.pem`),
  key: path.join(__dirname, `../../../certs/aps_${type}_key.pem`)
}

const apnConnection = new apn.Connection(options)
apnConnection.on('error', (err) => {
  console.error('Error while stablishing connection to the Apple Push Notifications service ' + err.stack)
})
apnConnection.on('connected', (openSockets) => {
  console.log(openSockets + ' connection(s) to the Apple Push Notifications service: ' + process.env.NODE_ENV)
})
apnConnection.on('transmissionError', (errorCode, notification, device) => {
  if (errorCode === 8) {
    var id = device.token.toString('hex')
    console.error('Invalid device token:', id)
    models.devices.deleteWhere({ id, type: 'ios' })
      .then(() => console.log('Deleted device token:', id))
      .catch((err) => console.error('Error while destroying device:', token, err.stack))
  } else {
    console.error('Transmission error: ' + errorCode)
  }
})
apnConnection.on('transmitted', (notification, device) => {
  console.info('Transmission - device token: ' + device.token.toString('hex') + ' notification: ' + JSON.stringify(notification))
})

exports.sendNotification = (device, options) => {
  if (!device.userId) return exports.sendSimpleNotification(device, options)
  return db.queryOne(`
      SELECT (
        (SELECT COALESCE(COUNT(*), 0) FROM invitations WHERE "userId"=$1) +
        (SELECT COALESCE(SUM("unreadCount"), 0) FROM memberships WHERE "userId"=$1) +
        (SELECT COALESCE(SUM("acceptedInvites"), 0) FROM users WHERE id=$1)
      )::integer AS badge
    `, [device.userId])
    .then((row) => {
      options.badge = row.badge
      return exports.sendSimpleNotification(device, options)
    })
    .catch((err) => {
      console.log('err', err.stack)
    })
}

exports.sendSimpleNotification = (device, options) => {
  if (device.type === 'ios') {
    var myDevice = new apn.Device(device.id)
    var note = new apn.Notification()
    note.expiry = Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now.
    if ('badge' in options) note.badge = options.badge
    if (options.sound) note.sound = options.sound
    if (options.alert) note.alert = options.alert
    if (options.payload) note.payload = options.payload

    apnConnection.pushNotification(note, myDevice)
  } else if (device.type === 'gcm') {
    var body = {
      to: device.id,
      notification: {
        title: 'LotterApp'
      }
    }
    if (options.payload) body.data = options.payload
    if (options.sound) body.notification.sound = options.sound
    if (options.alert) body.notification.text = options.alert
    request({
      method: 'POST',
      url: 'https://fcm.googleapis.com/fcm/send',
      headers: {
        'Authorization': 'key=' + process.env.GCM_SERVER_KEY
      },
      body,
      json: true
    })
    .then((response) => {
      const [res, body] = response
      if (res.statusCode !== 200) {
        console.log('GCM returned', res.statusCode, body)
      } else {
        if (body.failure) {
          console.log('deleting', device.id)
          models.devices.deleteWhere({ id: device.id, type: 'gcm' })
            .catch((err) => {
              console.error('Error while deleting device', device.id, 'gcm')
            })
        }
      }
    })
    .catch((err) => {
      console.log('err', err.stack)
    })
  } else if (device.type === 'test') {
    console.log('Test notification', device.id, options.alert)
  }
}

if (module.id === require.main.id) {
  const sendAPN = () => {
    exports.sendNotification({
      type: 'ios',
      id: '376bc00328acef914706e5b8f5a2a7f80d32ae1e4f5434d356dbd0740a11dde1',
      userId: 318
    }, {
      alert: 'hello from the other side 2',
      badge: 0,
      payload: {
        group: 1
      }
    })
  }

  const sendGCM = () => {
    exports.sendSimpleNotification({
      type: 'gcm',
      id: 'fqkJjZWI8lc:APA91bHDaM5kvzZpQRQAVY0Q8MOu1o40Klu0Rw0iAhY5wkwvSx4kFfxF8MyLsKNhlKIJ_qmrNo9wBB97cfZ_5GEdEircYCwmbA2VFgAOsV9b4cSJV06qXaH37rq3ifbacUAgJIoNRPjW'
    }, {
      alert: 'hello from the other side 2',
      badge: 0,
      payload: {
        group: 1337
      }
    })
  }

  true ? sendAPN() : sendGCM()
}
