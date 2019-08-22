const recorder = require('media-recorder-stream')

module.exports = { record, devices }

function record ({ quality, video, audio }, cb) {
  const videoBitsPerSecond = (quality >= 3) ? 800000 : (quality === 2) ? 500000 : 200000
  const audioBitsPerSecond = (quality >= 3) ? 128000 : (quality === 2) ? 64000 : 32000

  // create MediaRecorder
  const opts = {
    interval: 1000,
    videoBitsPerSecond,
    audioBitsPerSecond
  }

  createMedia(video, audio, function (err, media) {
    if (err) return cb(err, null)

    const mediaRecorder = recorder(media, opts)

    cb(null, mediaRecorder)
  })
}

function createMedia (videoDevice, audioDevice, cb) {
  let videoOpts = { video: true }
  let audioOpts = { audio: true }

  if (videoDevice) {
    // if user has selected 'screen sharing'
    if (videoDevice.kind === 'screen') {
      videoOpts = {
        video: {
          mandatory: {
            chromeMediaSource: 'screen',
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 25
          }
        }
      }
    } else {
      videoOpts = { video: { deviceId: { exact: videoDevice.deviceId } } }
    }
    audioOpts = { audio: { deviceId: { exact: audioDevice.deviceId } } }
  }

  // add audio stream to video stream
  // (allows screen sharing with audio to work)
  navigator.webkitGetUserMedia(audioOpts, function (audioStream) {
    navigator.webkitGetUserMedia(videoOpts, function (mediaStream) {
      mediaStream.addTrack(audioStream.getAudioTracks()[0])
      process.nextTick(cb, null, mediaStream)
    }, onerror)
  }, onerror)

  function onerror (err) {
    process.nextTick(cb, err, null)
  }
}

function devices (cb) {
  navigator.mediaDevices.enumerateDevices()
    .then((devices) => process.nextTick(cb, null, devices))
    .catch((err) => process.nextTick(cb, err, null))
}
