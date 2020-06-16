const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const path = require('path')
const fs = require('fs')
const Select = require('./select')
const Input = require('./input')
const Wizard = require('./wizard')
const { devices } = require('../lib/webm-broadcast-stream.js')

// allow setting this in the console
window.LND_NETWORK = 'mainnet'

const cls = css`
  :host > .lnd-config {
    display: none;
  }
  :host.lnd-config > .configs.lnd-config {
    display: grid;
  }
  :host.lnd-config > .lnd-config {
    display: block;
  }
`

class SelectStreamWizard extends Component {
  constructor (list) {
    super()
    this.existing = []
    this.select = new Select([['Create new stream', null]], { class: 'wide', border: true })
    if (list) {
      list((err, list) => {
        if (err) return
        this.existing = list
        this.update()
      })
    }
  }

  render () {
    const list = [['Create new stream', null]]
    for (const e of this.existing) {
      let n = e.description
      n +=
        (n ? ' (' : '') +
        e.key.toString('hex').slice(0, 8) +
        '...' +
        e.key.toString('hex').slice(-4) +
        (n ? ')' : '')
      list.push(['Resume ' + n, e])
    }
    const s = new Select(list, { class: 'wide', border: true })
    this.select.element.replaceWith(s.element)
    this.select = s
  }

  validate () {
    return true
  }

  get value () {
    return this.select.value
  }

  createElement () {
    return html`
      <div>
        <h4>Select stream</h4>
        <div class="configs">
          ${this.select.element}
        </div>
      </div>
    `
  }
}

class PaymentWizard extends Component {
  constructor (s, defaultConfig) {
    super()
    const self = this
    this._select = s
    this._amount = new Input({ label: 'Amount' })
    let prev = ''
    this._currency = new Select(
      [
        ['Lightning Satoshis', 'lnd'],
        ['Free', 'free']
      ],
      {
        label: 'Currency',
        placeholder: 'Choose one...',
        border: true,
        onchange () {
          self.element.classList.remove(prev + '-config')
          self.element.classList.add(self._currency.value + '-config')
          prev = self._currency.value
        }
      }
    )
    this._perUnit = new Input({ label: 'Per time interval' })
    this._timeUnit = new Select(
      [
        ['Seconds', 'seconds'],
        ['Minutes', 'minutes'],
        ['Hours', 'hours']
      ],
      { label: 'Unit', border: true }
    )

    this._lightningDir = new Input({
      label: 'Lightning directory',
      type: 'file',
      webkitdirectory: true,
      onchange (e) {
        const dir = path.dirname(this.files[0].path)
        const conf = loadConfig(dir)

        if (conf.host) self._lightningAddress.value = conf.host
        if (conf.cert) self._lightningCert.value = conf.cert
        if (conf.macaroon) self._lightningMacaroon.value = conf.macaroon
      }
    })

    this._lightningAddress = new Input({ label: 'RPC Host' })
    this._lightningMacaroon = new Input({ label: 'Macaroon' })
    this._lightningCert = new Input({ label: 'TLS Cert' })

    const conf = defaultConfig && defaultConfig.LightningSats
    if (conf) {
      if (conf.host) self._lightningAddress.value = conf.host
      if (conf.cert) self._lightningCert.value = conf.cert
      if (conf.macaroon) self._lightningMacaroon.value = conf.macaroon
    }
  }

  validate () {
    const c = this._currency.value
    let valid = true

    notEmpty(this._currency)
    if (!c) return false

    if (c !== 'free') {
      notEmpty(this._amount)
      notEmpty(this._perUnit)
    }

    if (c === 'lnd') {
      notEmpty(this._lightningMacaroon)
      notEmpty(this._lightningAddress)
      notEmpty(this._lightningCert)
    }

    return valid

    function notEmpty (el) {
      if (!el.value) {
        el.error = true
        valid = false
      } else {
        el.error = false
      }
    }
  }

  get value () {
    const c = this._currency.value

    if (c === 'free') {
      return null
    }

    if (c !== 'lnd') throw new Error('Only LND is supported currently')

    return {
      payment: {
        currency: 'LightningSats',
        amount: this._amount.value || '0',
        interval: Number(this._perUnit.value) || 0,
        unit: this._timeUnit.value
      },
      config: {
        implementation: 'lnd',
        cert: this._lightningCert.value,
        network: window.LND_NETWORK,
        host: this._lightningAddress.value,
        macaroon: this._lightningMacaroon.value
      }
    }
  }

  onload () {
    this.check()
  }

  check () {
    if (this._select.value) {
      const v = this._select.value
      const p = v.payment
      const config = v.config
      const currency = (p && (p.currency === 'LightningSats' ? 'lnd' : p.currency)) || 'free'

      this._amount.disabled = true
      this._amount.value = p ? p.amount : ''
      this._currency.disabled = true
      this._currency.value = currency
      this._perUnit.disabled = true
      this._perUnit.value = p ? p.interval : ''
      this._timeUnit.disabled = true
      this._timeUnit.value = p ? p.unit : ''

      if (currency === 'lnd') {
        this.element.classList.add('lnd-config')
        if (config) {
          this._lightningCert.value = config.cert
          this._lightningAddress.value = config.host
          this._lightningMacaroon.value = config.macaroon
        }
      }
    } else {
      this._amount.disabled = false
      this._currency.disabled = false
      this._perUnit.disabled = false
      this._timeUnit.disabled = false
      this._lightningDir.disabled = false
      this._lightningCert.disabled = false
      this._lightningAddress.disabled = false
      this._lightningMacaroon.disabled = false
    }
  }

  createElement () {
    process.nextTick(() => this.check())

    return html`
      <div class=${cls}>
        <h4>Payment Options</h4>
        <div class="configs">
          ${this._amount.element} ${this._currency.element}
          ${this._perUnit.element} ${this._timeUnit.element}
        </div>
        <h4 class="lnd-config">LND Lightning Configuration</h4>
        <div class="configs lnd-config">
          ${this._lightningDir.element}
          ${this._lightningAddress.element}
          ${this._lightningCert.element}
          ${this._lightningMacaroon.element}
        </div>
      </div>
    `
  }
}

class QualityWizard extends Component {
  constructor (select) {
    super()
    this._select = select
    this._quality = new Select(
      [
        ['High', 2],
        ['Medium', 1],
        ['Low', 0]
      ],
      { label: 'Quality', border: true }
    )
    this._video = new Select([], { label: 'Video device', border: true })
    this._audio = new Select([], { label: 'Audio device', border: true })
    this._description = new Input({ label: 'Video description' })
    this.devices = []
    devices((err, list) => {
      if (err) return console.error('device error:', err)
      this.devices = list
      this.devices.push({ kind: 'screen', label: 'Screen sharing' })
      this.update()
    })
  }

  render () {
    if (this._select.value) return

    const v = []
    const a = []

    for (const dev of this.devices) {
      if (dev.deviceId === 'default') continue

      const r =
        dev.kind === 'audioinput'
          ? a
          : dev.kind === 'videoinput'
            ? v
            : dev.kind === 'screen'
              ? v
              : []

      r.push([dev.label, dev])
    }

    const video = this._video
    const audio = this._audio

    this._video = new Select(v, { label: 'Video device', border: true })
    this._audio = new Select(a, { label: 'Audio device', border: true })

    video.element.replaceWith(this._video.element)
    audio.element.replaceWith(this._audio.element)

    this.check()
  }

  onload () {
    this.check()
  }

  validate () {
    let valid = true
    notEmpty(this._quality)
    notEmpty(this._video)
    notEmpty(this._audio)
    return valid

    function notEmpty (el) {
      if (!el.value && el.value !== 0) {
        el.error = true
        valid = false
      } else {
        el.error = false
      }
    }
  }

  get value () {
    return {
      quality: this._quality.value,
      video: this._video.value,
      audio: this._audio.value,
      description: this._description.value
    }
  }

  check () {
    if (this._select.value) {
      const v = this._select.value
      this._quality.value = v.quality
      const vi = this.devices.find(d => d.deviceId === v.video)
      if (vi) this._video.value = vi
      const ai = this.devices.find(d => d.deviceId === v.audio)
      if (ai) this._audio.value = ai
      this._description.disabled = true
      this._description.value = v.description || ''
    } else {
      this._quality.disabled = false
      this._video.disabled = false
      this._audio.disabled = false
      this._description.disabled = false
    }
  }

  createElement () {
    this.check()
    return html`
      <div>
        <h4>Stream Options</h4>
        <div class="configs">
          ${this._quality.element} ${this._video.element} ${this._audio.element}
          ${this._description.element}
        </div>
      </div>
    `
  }
}

module.exports = class BroadcastWizard extends Wizard {
  constructor (opts = {}) {
    const s = new SelectStreamWizard(opts.list)

    opts.list((_, elms) => {
      if (elms == null || elms.length === 0) this.next()
    })

    super(
      [
        ['Select Stream', s],
        ['Payment options', new PaymentWizard(s, opts.defaultConfig)],
        ['Stream options', new QualityWizard(s)],
        ['Broadcast', null]
      ],
      {
        title: 'Start broadcast',
        ...opts
      }
    )
  }
}

function tryRead (name, enc) {
  try {
    return fs.readFileSync(name, enc)
  } catch (_) {
    return ''
  }
}

function loadConfig (dir) {
  let config = tryRead(path.join(dir, 'lnd.conf'), 'utf-8')
  if (config) config = config.split('rpclisten=')[1]
  if (config) config = config.split('\n')[0]
  if (config) config = config.trim()

  return {
    host: config || '',
    cert: tryRead(path.join(dir, 'tls.cert'), 'base64'),
    macaroon: tryRead(path.join(dir, 'data/chain/bitcoin', window.LND_NETWORK, 'admin.macaroon'), 'base64')
  }
}
