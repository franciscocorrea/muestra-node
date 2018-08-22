var s3 = require('s3')
var fs = require('fs')

var s3Client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: 'eu-west-1'
  }
})

exports.uploadFile = (localPath, remotePath, removeLocal = true) => {
  return new Promise((resolve, reject) => {
    var env = process.env.NODE_ENV || 'development'
    remotePath = env + '/' + remotePath
    var s3Params = {
      localFile: localPath,
      s3Params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: remotePath,
        ACL: 'public-read'
      }
    }

    var uploader = s3Client.uploadFile(s3Params)
    uploader.on('error', reject)
    uploader.on('progress', () => {
      console.log('progress', uploader.progressMd5Amount,
                uploader.progressAmount, uploader.progressTotal)
    })
    uploader.on('end', (res) => {
      var url = process.env.AWS_S3_URL + remotePath
      if (removeLocal) {
        fs.unlink(localPath, (err) => {
          if (err) console.log(err, 'Error while removing uploaded file')
        })
      }
      resolve(url)
    })
  })
}

exports.removeFile = (remoteURL) => {
  return new Promise((resolve, reject) => {
    var remotePath = remoteURL.substring(process.env.AWS_S3_URL.length)

    var s3Params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: [
          {
            Key: remotePath
          }
        ]
      }
    }

    s3Client.deleteObjects(s3Params)
      .on('error', reject)
      .on('end', resolve)
  })
}
