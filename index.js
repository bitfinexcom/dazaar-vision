const Button = require('./components/button')
const css = require('hui/css')
const html = require('hui/html')
const BroadcastWizard = require('./components/broadcast-wizard')
const SubscribeWizard = require('./components/subscribe-wizard')
const Broadcast = require('./components/broadcast')
const Subscription = require('./components/subscription')
const hypercore = require('hypercore')
const crypto = require('hypercore-crypto')
const electron = require('electron')
const path = require('path')
const userDataPath = (electron.app || electron.remote.app).getPath('userData')
const dataPath = path.join(userDataPath, './dazaar-vision-data')
const dazaar = require('dazaar')(dataPath)
const Payment = require('dazaar-payment')
const fs = require('fs')

class Settings {
  constructor (dataPath) {
    this.dataPath = path.resolve(dataPath)
    this.settingsPath = path.join(this.dataPath, 'settings.json')
    try {
      this.data = require(this.settingsPath)
    } catch (_) {
      this.data = {}
    }
  }

  save (cb) {
    if (!cb) cb = (() => {})
    const p = this.settingsPath
    fs.writeFile(p + '.tmp', JSON.stringify(this.data, null, 2), function (err) {
      if (err) return cb(err)
      fs.rename(p + '.tmp', p, cb)
    })
  }
}


console.log('Storing data in', dataPath)

const settings = new Settings(dataPath)
const style = css`
  :host {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
  :host button {
    margin-right: 1.4rem;
    margin-bottom: 1.4rem;
  }
`
const main = html`
  <div class="${style} h-100">
    <svg
      id="circus"
      style="transform: translateX(-50%);"
      class="top-0 left-0 fade-in a-ease-in-out a-fill-both a-duration-short z0 w-vm-60 h-100 highlight t-duration-mid tt"
      viewBox="0 0 400 400"
    >
      <g class="t-ease t-duration-short" style="transition-property: color;">
        <g class="t-ease t-duration-mid tt t-origin-center t-delay-short">
          <use
            href="#shape"
            class="o-0 ripple a-linear a-delay-long a-duration-yawn infinite t-origin-center a-fill-both"
            style="--pulse-from: .33; --pulse-to: 1; --opaque: .3; --fill: url('#ripple-gradient')"
          />
        </g>
        <g
          class="t-ease tt t-origin-center t-delay-micro t-duration-mid fade-out"
        >
          <use
            href="#shape"
            class="o-0 to ripple a-linear a-duration-yawn infinite t-origin-center a-fill-both"
            style="--pulse-from: .33; --pulse-to: 1; --opaque: .3;  --fill: url('#ripple-gradient')"
          />
        </g>
        <g class="t-ease tt t-origin-center t-duration-mid">
          <use
            id="logo-iris"
            href="#shape"
            class="to pulsate a-ease-in-out a-alternate t-duration-short a-duration-long infinite t-origin-center"
            style="--pulse-from: .33; --pulse-to: .35; --fill: url('#iris-gradient');"
            stroke-width="4"
            stroke="hsla(var(--hue,var(--accentH)),var(--accentS),var(--lightness,var(--spotlight)),.1)"
          />
        </g>
      </g>
    </svg>
    <div class="df columns align-start justify-center relative">
      <h1 class="normal" style="font-size: 3.75rem; line-height: 4.375rem; font-weight: 500; margin: 0 0 1.25rem;">
        Welcome to <br /><span class="highlight">Dazaar</span> Vision
      </h1>
      <p style="font-size: 1.25rem; line-height: 1.375rem; margin: 0 0 5rem">Choose how you want to use Dazaar.</p>
      <div class="buttons pv3">
        ${new Button('Start broadcast', { onclick: broadcast }).element}
        ${new Button('Subscribe to stream', { onclick: subscribe, border: true }).element}
      </div>
      <svg
        class="absolute"
        style="height: 1rem; bottom: 60px; right: 70px;"
        title="Dazaar"
        viewBox="0 0 160 32"
        onclick="document.querySelector(this.dataset.href).scrollIntoView({ behavior: 'smooth' })"
      >
        <use
          href="#logo-letters"
          fill="hsla(var(--hue), var(--accentS),var(--accentL),1)"
        />
      </svg>
    </div>
  </div>
`
let cycleColor = true
function bumpColor () {
  if (cycleColor) {
    const hue = Number(document.body.style.getPropertyValue('--hue')) || 0
    document.body.style.setProperty('--hue', (hue + 1) % 360)
    setTimeout(() => window.requestAnimationFrame(bumpColor), 100)
  } else {
    document.body.style.removeProperty('--hue')
  }
}
window.requestAnimationFrame(bumpColor)
let view = main
document.body.appendChild(main)

// Export mute functions
window.mute = mute

function subscribe () {
  cycleColor = false
  const sw = new SubscribeWizard({
    settings,
//    list (cb) {
//      dazaar.buying(function (err, keys) {
//        if (err) return cb(err)
//        loadInfo(keys, true, cb)
//      })
//    },
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
  cycleColor = false
  const bw = new BroadcastWizard({
    list (cb) {
      dazaar.selling(function (err, keys) {
        if (err) return cb(err)
        loadInfo(keys, false, cb)
      })
    },
    ondone () {
      let [existing, payment, devices] = bw.value
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
  return hypercore(
    name =>
      dazaar._storage(
        (buyer ? 'buys/' : 'streams/') + publicKey.toString('hex') + '/' + name
      ),
    publicKey,
    {
      secretKey: keys && keys.secretKey
    }
  )
}

function loadInfo (keys, buyer, cb) {
  let i = 0
  const result = []
  loop()

  function loop () {
    if (i >= keys.length) return cb(null, result)
    const k = keys[i++]
    const feed = createFeed(k.feed, buyer)

    feed.get(0, { wait: false }, function (err, data) {
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
