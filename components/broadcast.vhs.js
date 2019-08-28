const vhs = require('vhs-tape')
const ConfigureBroadcast = require('./configure-broadcast')
const Broadcast = require('./broadcast')

vhs('basic', function (t) {
  const tmp = require('path').join(require('os').tmpdir(), ''+Date.now())
  const dazaar = require('dazaar')(tmp)

  const choose = new ConfigureBroadcast(dazaar, function (feed, val) {
    const b = new Broadcast(dazaar, feed, val, function () {
      b.element.replaceWith(choose.element)
    })
    choose.element.replaceWith(b.element)
  })

  t.element.appendChild(choose.element)

  return new Promise(() => {})
})
