const apk = process.env.LATEST_APK
const latestAPK = `${process.env.BASE_URL}/downloads/${apk}`

module.exports = class AutoupdateController {
  static android (params) {
    const numbersCurrent = params.version.match(/\d+/g) || []
    const numbersLatest = apk.match(/\d+/g) || []
    let latest = true
    numbersLatest.some((num, i) => {
      const curr = +numbersCurrent[i] || 0
      if (curr < +num) {
        latest = false
        return true
      } else if (curr > +num) {
        latest = true
        return true
      }
    })
    // const currentAPK = `${process.env.BASE_URL}/downloads/app-${params.version}-prod-release.apk`
    return { link: latest ? null : latestAPK }
  }
}
