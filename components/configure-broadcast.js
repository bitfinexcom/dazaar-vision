const { devices } = require('../lib/webm-broadcast-stream.js')
const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const hypercore = require('hypercore')
const crypto = require('hypercore-crypto')

const cls = css`
  :host {
    padding: 10px;
  }

  :host label {
    margin-right: 5px;
  }
`

module.exports = class ConfigureBroadcast extends Component {
  constructor (dazaar, onlive) {
    super()

    this.onlive = onlive || noop
    this.dazaar = dazaar

    this._payment = new SelectPayment()
    this._device = new SelectDevice()
    this._updateSelling = false
    this._selling = []
    this._sellingEl = null
    this._descEl = null
    this._feed = null
  }

  get value () {
    return {
      payment: this._payment.value,
      device: this._device.value,
      description: this.element.querySelector('#broadcast-description').value
    }
  }

  _populate () {
    if (this._updateSelling) {
      this._updateSelling = false
      this._sellingEl.innerHTML = ''
      this._sellingEl.appendChild(html`<option value="">Create new stream</option>`)
      for (const key of this._selling) {
        this._sellingEl.appendChild(html`<option value="${key.toString('hex')}">>${key.toString('hex')}</option>`)
      }
    }
  }

  _onresume () {
    if (this._feed) this._feed.close()
    this._feed = null
    this._feedConfig = null

    const key = this._sellingEl.value

    if (!key) {
      this.update()
      return
    }

    this._feed = this._createFeed(Buffer.from(key, 'hex'))
    this._loadConfig()
  }

  _loadConfig () {
    this._feed.get(0, { wait: false }, (err, data) => {
      if (err) return
      this._feedConfig = JSON.parse(data)
      this.update()
    })
  }

  _createFeed (publicKey) {
    const keys = !publicKey ? crypto.keyPair() : null
    if (keys) publicKey = keys.publicKey

    // TODO: make the storage function a public api that's always namespaced
    return hypercore(name => this.dazaar._storage('streams/' + publicKey.toString('hex') + '/' + name), publicKey, {
      secretKey: keys && keys.secretKey
    })
  }

  onload () {
    this.dazaar.selling((err, list) => {
      if (err) return
      this._selling = list
      this._updateSelling = true
      this.update()
    })
  }

  render () {
    this._populate()

    if (this._feedConfig) {
      this._descEl.value = this._feedConfig.description
      this._descEl.setAttribute('disabled', 'disabled')
      this._device.selectSync(this._feedConfig)
      this._device.disabled = true
      this._payment.selectSync(this._feedConfig)
      this._payment.disabled = true
    } else {
      this._device.disabled = false
      this._payment.disabled = false
      this._descEl.removeAttribute('disabled')
    }
  }

  createElement () {
    this._sellingEl = html`<select onchange=${this._onresume.bind(this)}></select>`
    this._descEl = html`<input id="broadcast-description" placeholder="Describe your stream...">`

    const el = html`<div class="${cls}">
      <h2>Create new stream or resume previous one</h2>
      ${this._sellingEl}
      <h2>Payment options</h2>
      ${this._payment.element}
      <h2>Stream options</h2>
      ${this._device.element}
      <h2>Broadcast options</h2>
      <label for="broadcast-description">Description:</label>
      ${this._descEl}<br>
      <button>Start broadcast</button>
    </div>`

    el.querySelector('button').onclick = () => {
      this.onlive(this._feed || this._createFeed(null), this.value)
      this._feed = null
    }

    this._populate()

    return el
  }
}

class SelectPayment extends Component {
  constructor () {
    super()

    this._amount = null
    this._currency = null
    this._unit = null
    this._address = null
  }

  get value () {
    if (!this._currency || this._currency.value === 'free') return null

    return {
      type: 'subscription',
      currency: this._currency.value,
      unit: this._unit.value,
      interval: '1',
      amount: this._amount.value,
      payTo: this._address.value
    }
  }

  set disabled (val) {
    if (!this._amount) return
    if (val) {
      this._amount.setAttribute('disabled', 'disabled')
      this._currency.setAttribute('disabled', 'disabled')
      this._unit.setAttribute('disabled', 'disabled')
      this._address.setAttribute('disabled', 'disabled')
    } else {
      this._amount.removeAttribute('disabled')
      this._currency.removeAttribute('disabled')
      this._unit.removeAttribute('disabled')
      this._address.removeAttribute('disabled')
    }
  }

  selectSync (opts) {
    if (!this._amount) return

    const p = opts.payment && opts.payment[0]
    const currency = p ? p.currency : 'free'

    for (let i = 0; i < this._currency.options.length; i++) {
      const o = this._currency.options[i]

      if (o.value === currency) {
        this._currency.selectedIndex = i
        break
      }
    }

    this._address.value = p ? p.payTo : ''
    this._amount.value = p ? p.amount : ''

    const unit = p && p.unit

    for (let i = 0; i < this._unit.options.length; i++) {
      const o = this._unit.options[i]

      if (o.value === unit) {
        this._unit.selectedIndex = i
        break
      }
    }
  }

  createElement () {
    const el = html`<div>
      <div>
        <label for="payment-amount">Amount:</label>
        <input id="payment-amount" placeholder="1.2345">
      </div>
      <div>
        <label for="payment-currency">Currency:</label>
        <select id="payment-currency">
          <option value="EOS">EOS (testnet)</option>
          <option value="free">Free</option>
        </select>
      </div>
      <div>
        <label for="payment-unit">Per time unit:</label>
        <select id="payment-unit">
          <option value="seconds">Second</option>
          <option value="minutes">Minute</option>
          <option value="hours">Hour</option>
          <option value="days">Day</option>
        </select>
      </div>
      <div>
        <label for="payment-address">Pay to:</label>
        <input id="payment-address" placeholder="Enter your address">
      </div>
    </div>`

    this._amount = el.querySelector('#payment-amount')
    this._currency = el.querySelector('#payment-currency')
    this._unit = el.querySelector('#payment-unit')
    this._address = el.querySelector('#payment-address')

    this._currency.onchange = () => {
      if (this._currency.value === 'free') {
        this._unit.setAttribute('disabled', 'disabled')
        this._amount.setAttribute('disabled', 'disabled')
        this._address.setAttribute('disabled', 'disabled')
      } else {
        this._unit.removeAttribute('disabled')
        this._amount.removeAttribute('disabled')
        this._address.removeAttribute('disabled')
      }
    }

    return el
  }
}

class SelectDevice extends Component {
  constructor () {
    super()

    this.devices = []

    this._vid = null
    this._aud = null
    this._q = null
    this._needsPopulate = false

    devices((err, list) => {
      if (err) return
      this.devices = list
      this.devices.push({ kind: 'screen', label: 'Screen sharing' })
      this._needsPopulate = true
      this.update()
    })
  }

  render () {
    this._populate()
  }

  _populate () {
    if (!this._vid) return
    if (!this._needsPopulate) return
    this._needsPopulate = false
    const v = []
    const a = []
    for (let i = 0; i < this.devices.length; i++) {
      const dev = this.devices[i]
      if (dev.deviceId === 'default') continue

      const r = dev.kind === 'audioinput' ? a :
        dev.kind === 'videoinput' ? v :
        dev.kind === 'screen' ? v : []

      r.push(html`<option value="${i}">${dev.label}</option>`)
    }
    this._vid.innerHTML = ''
    for (const el of v) this._vid.appendChild(el)
    this._aud.innerHTML = ''
    for (const el of a) this._aud.appendChild(el)
  }

  set disabled (val) {
    if (!this._vid) return
    if (val) {
      this._vid.setAttribute('disabled', 'disabled')
      this._aud.setAttribute('disabled', 'disabled')
      this._q.setAttribute('disabled', 'disabled')
    } else {
      this._vid.removeAttribute('disabled')
      this._aud.removeAttribute('disabled')
      this._q.removeAttribute('disabled')
    }
  }

  selectSync (opts) {
    this.render()

    for (let i = 0; i < this._vid.options.length; i++) {
      const o = this._vid.options[i]
      const dev = this.devices[Number(o.value)]

      if (dev.deviceId === opts.video) {
        this._vid.selectedIndex = i
        break
      }
    }
    for (let i = 0; i < this._aud.options.length; i++) {
      const o = this._aud.options[i]
      const dev = this.devices[Number(o.value)]

      if (dev.deviceId === opts.video) {
        this._aud.selectedIndex = i
        break
      }
    }
    for (let i = 0; i < this._q.options.length; i++) {
      const o = this._q.options[i]

      if (Number(o.value) === opts.quality) {
        this._q.selectedIndex = i
        break
      }
    }
  }

  get value () {
    return {
      quality: Number(this._q.value),
      video: this.devices[Number(this._vid.value)] || null,
      audio: this.devices[Number(this._aud.value)] || null
    }
  }

  createElement () {
    const el = html`<div>
      <div>
        <label for="select-quality">Select quality:</label>
        <select id="select-quality">
          <option value="1">Low</option>
          <option value="2" selected>Medium</option>
          <option value="3">High</option>
        </select>
      </div>
      <div>
        <label for="select-video-device">Select video device:</label>
        <select id="select-video-device"></select>
      </div>
      <div>
        <label for="select-audio-device">Select audio device:</label>
        <select id="select-audio-device"></select>
      </div>
    </div>`

    this._q = el.querySelector('#select-quality')
    this._vid = el.querySelector('#select-video-device')
    this._aud = el.querySelector('#select-audio-device')

    this._populate()

    return el
  }
}

function noop () {}
