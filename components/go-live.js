const { devices } = require('../lib/webm-broadcast-stream.js')
const Component = require('hui')
const html = require('hui/html')

module.exports = class GoLive extends Component {
  constructor (opts) {
    super()

    this.onlive = (opts && opts.onlive) || noop

    this._payment = new SelectPayment()
    this._device = new SelectDevice()
  }

  get value () {
    return {
        payment: this._payment.value,
        device: this._device.value
    }
  }

  createElement () {
    const el = html`<div>
      <h2>Select payment</h2>
      ${this._payment.element}
      <h2>Select stream options</h2>
      ${this._device.element}
      <button>Go live!</button>
    </div>`

    el.querySelector('button').onclick = () => {
      this.onlive(this.value)
    }

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

  createElement () {
    const el = html`<div>
      <div>
        <label for="payment-amount">Amount</label>
        <input id="payment-amount" placeholder="1.2345">
      </div>
      <div>
        <label for="payment-currency">Currency</label>
        <select id="payment-currency">
          <option value="eos">EOS</option>
          <option value="free">Free</option>
        </select>
      </div>
      <div>
        <label for="payment-unit">Per time unit</label>
        <select id="payment-unit">
          <option value="seconds">Second</option>
          <option value="minutes">Minute</option>
          <option value="hours">Hour</option>
          <option value="days">Day</option>
        </select>
      </div>
      <div>
        <label for="payment-address">Pay to</label>
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

    devices((err, list) => {
      if (err) return
      this.devices = list
      this.devices.push({ kind: 'screen', label: 'Screen sharing' })
      this.update()
    })
  }

  render () {
    this._populate()
  }

  _populate () {
    if (!this._vid) return
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
        <label for="select-quality">Select quality</label>
        <select id="select-quality">
          <option value="1">Low</option>
          <option value="2" selected>Medium</option>
          <option value="3">High</option>
        </select>
      </div>
      <div>
        <label for="select-video-device">Select video device</label>
        <select id="select-video-device"></select>
      </div>
      <div>
        <label for="select-audio-device">Select audio device</label>
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
