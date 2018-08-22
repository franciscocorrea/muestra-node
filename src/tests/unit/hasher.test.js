const test = require('ava')
const authServices = require('../../main/services/auth')
const hasher = authServices.hasher

test('tets hasher service', async t => {
  const email = 'john@doe.com'
  const hash = await hasher.hashPassword(email, 'secret')
  const checkHash = async (password) => { return hasher.checkPassword(email, password, hash) }
  t.true(await checkHash('secret'), 'assert the correct password is the same that the hash')
  t.false(await checkHash('otherpass'), 'assert the incorrect password is not the same that the hash')
})
