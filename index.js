const { record } = require('./lib/webm-broadcast-stream.js')
const pump = require('pump')
const cluster = require('webm-cluster-stream')

const GoLive = require('./components/go-live')

const s = new GoLive({
  onlive (val) {
    console.log('going live', val)

    record(val.device, function (err, stream) {
      const frames = pump(stream, cluster())

      frames.on('data', function (frame) {
        console.log('new keyframe: ' + frame.length + ' bytes ')
      })
    })
  }
})

document.body.appendChild(s.element)

/*
function run (quality, video, audio) {
  record(quality, video, audio, function (err, stream) {
    if (err) throw err

    console.log('got stream')

    const c = stream.pipe(cluster())

    qualities[quality] = c
  })

}

devices(function (err, list) {
  if (err) throw err
console.log(list)

  const video = { kind: 'screen' }
  const audio = list.find(({ kind }) => kind === 'audioinput')

// return
  run(1, video, audio)
  // run(3, video, audio)

  setTimeout(function () {
    require('http').createServer(function (req, res) {
      for (const c of qualities) {
        if (!c) continue
        c.on('data', data => res.write(data))
        c.on('data', () => console.log('writing data back ...'))
      }
    }).listen(10000, function () {
      document.body.innerHTML = '<video controls autoplay src="http://localhost:10000"></video>'
    })
  }, 5000)
})
*/
