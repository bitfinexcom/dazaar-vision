const Button = require('./components/button')
const css = require('hui/css')
const html = require('hui/html')
const BroadcastWizard = require('./components/broadcast-wizard')
const SubscribeWizard = require('./components/subscribe-wizard')
const Broadcast = require('./components/broadcast')
const Subscription = require('./components/subscription')
const hypercore = require('hypercore')
const crypto = require('hypercore-crypto')
const dazaar = require('dazaar')('dazaar-vision-data')
const Payment = require('dazaar-payment')

const style = css`
  @keyframes heartbeat {
    from {
      transform: scale(1);
    }

    to {
      transform: scale(1.1);
    }
  }

  :host h1 {
    text-align: center;
    font-size: 50px;
    line-height: 60px;
    font-weight: normal;
    color: #353248;
    margin: 0;
    margin-bottom: 80px;
    position: sticky;
    z-index: 10;
  }

  :host button {
    margin: 10px;
  }

  :host .buttons {
    text-align: center;
    position: sticky;
    z-index: 10;
  }

  :host {
    position: absolute;
    top: calc(50% - 105px);
    left: calc(50% - 330px);
    height: 210px;
    width: 660px;
  }

  :host .circle {
    animation-duration: 3s;
    animation-name: heartbeat;
    animation-iteration-count: infinite;
    animation-direction: alternate;
    z-index: 5;
    height: 800px;
    width: 800px;
    background-color: #ffffff;
    border-radius: 800px;
    position: absolute;
    left: calc(50% - 400px);
    top: calc(50% - 400px);
  }
`

const link = document.createElement('link')

link.setAttribute('rel', 'stylesheet')
link.setAttribute('href', __dirname + '/global.css')

document.body.appendChild(link)
document.body.className = 'modern'

const main = html`
  <div class="${style}">
    <h1>Welcome to Dazaar Vision</h1>
    <div class="buttons">
      ${new Button('Start broadcasting', { onclick: broadcast }).element}
      ${new Button('Subscribe to stream', { onclick: subscribe }).element}
    </div>
    <div class="circle">
    </div>
  </div>
`

let view = main

document.body.appendChild(main)

// Export mute functions
window.mute = mute

function subscribe () {
  const sw = new SubscribeWizard({
    list (cb) {
      dazaar.buying(function (err, keys) {
        if (err) return cb(err)
        loadInfo(keys, true, cb)
      })
    },
    ondone () {
      const card = sw.value[0]
      const buyer = dazaar.buy(Buffer.from(card.id, 'hex'), { sparse: true })
      const s = new Subscription({
        buyer,
        payment: card.payment,
        onstop () {
          changeMainView(main)
        }
      })

      changeMainView(s.element)
    },
    oncancel () {
      changeMainView(main)
    }
  })

  changeMainView(sw.element)
}

function broadcast () {
  const bw = new BroadcastWizard({
    list (cb) {
      dazaar.selling(function (err, keys) {
        if (err) return cb(err)
        loadInfo(keys, false, cb)
      })
    },
    ondone () {
      let [ existing, payment, devices ] = bw.value
      const feed = createFeed(existing && existing.feed)
      let pay = null
      const seller = dazaar.sell(feed, {
        validate (remoteKey, done) {
          console.log('validate', remoteKey, payment)
          if (!payment) return done(null, { type: 'free' })
          pay.validate(remoteKey, function (err, info) {
            console.log('done', err, info)
            done(err, info)
          })
        }
      })
      seller.ready(function () {
        if (payment && !Array.isArray(payment)) payment = [payment]
        pay = new Payment(seller.key, payment)
      })
      const b = new Broadcast({
        payment,
        video: devices.video,
        audio: devices.audio,
        quality: devices.quality,
        description: devices.description,
        seller,
        onstop () {
          if (pay) pay.destroy()
          changeMainView(main)
        }
      })

      changeMainView(b.element)
    },
    oncancel () {
      changeMainView(main)
    }
  })

  changeMainView(bw.element)
}

function mute () {
  const v = document.querySelector('video')
  if (v) v.muted = true
}

function changeMainView (el) {
  // TODO: raf me
  view.replaceWith(el)
  view = el
}

function createFeed (publicKey, buyer) {
  const keys = !publicKey ? crypto.keyPair() : null
  if (keys) publicKey = keys.publicKey

  // TODO: make the storage function a public api that's always namespaced
  return hypercore(name => dazaar._storage((buyer ? 'buys/' : 'streams/') + publicKey.toString('hex') + '/' + name), publicKey, {
    secretKey: keys && keys.secretKey
  })
}

function loadInfo (keys, buyer, cb) {
  let i = 0
  const result = []
  loop()
  function loop () {
    if (i >= keys.length) return cb(null, result)
    const k = keys[i++]
    const feed = createFeed(k.feed, buyer)

    feed.get(0, { wait: false}, function (err, data) {
      if (err) return loop()
      try {
        data = JSON.parse(data)
        result.push({
          key: k.key,
          feed: k.feed,
          ...data
        })
      } catch (_) {}
      feed.close(loop)
    })
  }
}
