const controllers = require('../controllers')

module.exports = (lindy) => {
  const setSettings = lindy.router('/api/push-notifications')

  setSettings.get('/add-configuration-users', 'Set notifications exist users')
        .run(() => controllers.pushnotifications.addConfigurations())

  setSettings.post('/subscribe/botes', 'Set subscribe push notification botes')
        .middleware('auth')
        .params((validate) => {
          validate.number('bonoloto', 'Subscribe pushnotification bonoloto bote').min(0).max(1).optional()
          validate.number('euromillones', 'Subscribe pushnotification euromillones bote').min(0).max(1).optional()
          validate.number('primitiva', 'Subscribe pushnotification euromillones bote').min(0).max(1).optional()
          validate.number('gordo', 'Subscribe pushnotification euromillones bote').min(0).max(1).optional()
          validate.number('quinela', 'Subscribe pushnotification euromillones bote').min(0).max(1).optional()
          validate.number('loteria', 'Subscribe pushnotification euromillones bote').min(0).max(1).optional()
          validate.number('all', 'Subscribe pushnotification all botes').min(0).max(1).optional()
        })
        .run((params) => controllers.pushnotifications.subscribeBotes(params))

  setSettings.post('/subscribe/prizes', 'Set subscribe push notification prizes')
        .middleware('auth')
        .params((validate) => {
          validate.number('subscribe', 'Subscribe push notification prize').min(0).max(1)
          validate.string('time', 'Time to receive prizes push notifications').optional()
        })
        .run((params) => controllers.pushnotifications.subscribePrize(params))

  setSettings.post('/subscribe/news', 'Set subscribe push notification news')
        .middleware('auth')
        .params((validate) => {
          validate.number('subscribe', 'Subscribe push notification prize').min(0).max(1)
          validate.string('time', 'Time to receive prizes push notifications').optional()
        })
        .run((params) => controllers.pushnotifications.subscribeNews(params))
}
