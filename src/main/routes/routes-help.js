module.exports = (lindy) => {
  var help = lindy.router('/api/help')

  help.get('/how-to-play/loteria', 'Shows the "how to play" instructions for loteria')
    .outputs('html', 'help-how-to-play-loteria-es')
    .run((params) => {
      return {}
    })

  help.get('/how-to-play/quiniela', 'Shows the "how to play" instructions for quiniela')
    .outputs('html', 'help-how-to-play-quiniela-es')
    .run((params) => {
      return {}
    })

  help.get('/how-to-play/primitiva', 'Shows the "how to play" instructions for primitiva')
    .outputs('html', 'help-how-to-play-primitiva-es')
    .run((params) => {
      return {}
    })

  help.get('/how-to-play/euromillones', 'Shows the "how to play" instructions for euromillones')
    .outputs('html', 'help-how-to-play-euromillones-es')
    .run((params) => {
      return {}
    })

  help.get('/how-to-play/gordo', 'Shows the "how to play" instructions for gordo')
    .outputs('html', 'help-how-to-play-gordo-es')
    .run((params) => {
      return {}
    })

  help.get('/how-to-play/bonoloto', 'Shows the "how to play" instructions for bonoloto')
    .outputs('html', 'help-how-to-play-bonoloto-es')
    .run((params) => {
      return {}
    })

  help.get('/terms-and-conditions', 'Shows the terms and conditions')
    .outputs('html', 'terms-and-conditions-es')
    .run((params) => {
      return {}
    })

  help.get('/privacy-policy', 'Shows the privacy policy')
    .outputs('html', 'privacy-policy-es')
    .run((params) => {
      return {}
    })

  help.get('/links', 'Just for testing')
    .outputs('html', 'help-links')
    .run((params) => {
      return {}
    })
}
