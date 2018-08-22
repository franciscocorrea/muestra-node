exports.normalize = (str) => {
  if (!str) return str
  const match = str.match(/[\d\+]+/g)
  if (!match) {
    console.log('Invalid phone number', str)
    return null
  }
  str = match.join('')
  if (str.startsWith('00')) str = '+' + str.substring(2)
  else if (!str.startsWith('+')) str = '+34' + str
  return str
}

if (module.id === require.main.id) {
  console.log('', exports.normalize('0034 (625) 24 64 81'))
  console.log('', exports.normalize('+34 (625) 24 64 81'))
  console.log('', exports.normalize('(625) 24 64 81'))
  console.log('', exports.normalize('625246481'))
  console.log('', exports.normalize('+34625246481'))
}
