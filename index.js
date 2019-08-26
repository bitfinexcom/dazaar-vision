const { record } = require('./lib/webm-broadcast-stream.js')
const pump = require('pump')
const cluster = require('webm-cluster-stream')
const dazaar = require('dazaar')
const hypercore = require('hypercore')
const path = require('path')

const Component = require('hui')
const MorphComponent = require('hui/morph')
const html = require('hui/html')

class Kernel {
  constructor (storage) {
    this.storage = storage
    this.seller = null
    this.buyer = null
    this.dazaar = dazaar(this.createStorage('market'))
    this.swarm = null
    this.broadcastFeed = null
    this.subscriptionFeed = null
  }

  createStorage (ns) {
    return name => {
      return this.storage(ns + '/' + name)
    }
  }

  startSubscription (key, cb) {
    if (this.seller) throw new Error('Cannot broadcast and subscribe at once')

    this.buyer = this.dazaar.buy(key)

    this.buyer.once('feed', (feed) => {
      this.subscriptionFeed = feed
      console.log(feed)
      cb(null)
    })

    this.swarm = require('dazaar/swarm')(this.buyer)
  }

  startBroadcast ({ device, payment }, cb) {
    if (this.seller) throw new Error('Cannot broadcast and subscribe at once')

    this.broadcastFeed = hypercore(this.createStorage('feeds/broadcast'))
    this.seller = this.dazaar.sell(this.broadcastFeed, {
      validate (key, cb) {
        console.log('Feed is free, skipping validation')
        cb(null)
      }
    })

    this.seller.ready(cb)
    this.swarm = require('dazaar/swarm')(this.seller)

    record(device, (err, stream) => {
      if (err) return cb(err)
      pump(stream, cluster(), this.broadcastFeed.createWriteStream())
    })
  }
}

class Main extends Component {
  constructor ({ onsubscribe, onbroadcast }) {
    super()
    this.onsubscribe = onsubscribe
    this.onbroadcast = onbroadcast
  }

  createElement () {
    const self = this

    return html`
      <div>
        <button onclick=${() => this.onbroadcast(null)}>Broadcast</button> or <input placeholder="subscribe" onchange=${onchange}>
      </div>
    `

    function onchange () {
      if (/^[0-9a-f]{64}$/i.test(this.value)) {
        self.onsubscribe(Buffer.from(this.value, 'hex'))
      }
    }
  }
}

class Subscribing extends Component {
  constructor ({ swarm, subscriptionFeed, buyer }) {
    super()

    this.subscriptionFeed = subscriptionFeed

    this._vid = null
    this._server = null
  }

  onload () {
    this._server = require('http').createServer(this._onrequest.bind(this))
    this._server.listen(0, '127.0.0.1')
    this.once(this._server, 'listening', () => {
      this._vid.src = 'http://127.0.0.1:' + this._server.address().port
      this._vid.play()
    })
  }

  _onrequest (req, res) {
    const feed = this.subscriptionFeed

    feed.get(0, function (err, data) {
      if (res.destroyed) return
      res.write(data)

      feed.update({ ifAvailable: true }, (err) => {
        if (res.destroyed) return

        const s = feed.createReadStream({
          start: Math.max(1, feed.length - 1),
          live: true
        })

        pump(s, res)
      })
    })
  }

  onunload () {
    this._server.close()
    this._server = null
  }

  createElement () {
    this._vid = document.createElement('video')
    return this._vid
  }
}

class Broadcasting extends MorphComponent {
  constructor ({ swarm, broadcastFeed, seller }) {
    super()

    this.seller = seller
    this.swarm = swarm
    this.uploaded = 0
    this.broadcastFeed = broadcastFeed
  }

  onload () {
    const update = this.update.bind(this)

    this.on(this.broadcastFeed, 'upload', (index, data) => {
      console.log('onupload', index, data.length)
      this.uploaded += data.length
      this.update()
    })

    this.on(this.broadcastFeed, 'append', update)
    this.on(this.swarm, 'connection', update)
    this.on(this.swarm, 'disconnection', update)
  }

  createElement () {
    return html`
      <div>
        <h1>You are live!</h1>
        <input value="${this.seller.key.toString('hex')}">
        <div>
          Uploaded ${this.uploaded} bytes<br>
          Connected to ${this.swarm.connections.size} peers<br>
          Recorded ${this.broadcastFeed.length} keyframes<br>
        </div>
      </div>
    `
  }
}

const GoLive = require('./components/go-live')

const kernel = new Kernel(require('random-access-memory'))

function onerror (err) {
  throw err
}

const m = new Main({
  onsubscribe,
  onbroadcast
})

function onsubscribe (key) {
  kernel.startSubscription(key, function (err) {
    const s = new Subscribing(kernel)

    m.element.replaceWith(s.element)
  })
}

function onbroadcast () {
  const s = new GoLive({
    onlive (val) {
      kernel.startBroadcast(val, function (err) {
        if (err) return onerror(err)

        const b = new Broadcasting(kernel)
        s.element.replaceWith(b.element)
      })
    }
  })

  m.element.replaceWith(s.element)
}

document.body.appendChild(m.element)
