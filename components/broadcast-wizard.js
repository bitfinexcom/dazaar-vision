const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Select = require('./select')
const Button = require('./button')
const Input = require('./input')
const Wizard = require('./wizard')
const { devices } = require('../lib/webm-broadcast-stream.js')

class SelectStreamWizard extends Component {
    constructor(list) {
        super()
        this.existing = []
        this.select = new Select([
            ['Create new stream', null]
        ], { class: 'wide' })
        if (list) {
            list((err, list) => {
                if (err) return
                this.existing = list
                this.update()
            })
        }
    }

    render() {
        const list = [
            ['Create new stream', null]
        ]
        for (const e of this.existing) {
            let n = e.description
            n += (n ? ' (' : '') + e.key.toString('hex').slice(0, 8) + '...' + e.key.toString('hex').slice(-4) + (n ? ')' : '')
            list.push(['Resume ' + n, e])
        }
        const s = new Select(list, { class: 'wide' })
        this.select.element.replaceWith(s.element)
        this.select = s
    }

    validate() {
        return true
    }

    get value() {
        return this.select.value
    }

    createElement() {
        return html `
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
    constructor(s) {
        super()
        this._select = s
        this._amount = new Input({ placeholder: 'Amount' })
        this._currency = new Select([
            ['EOS', 'EOS'],
            ['EOS Testnet', 'EOS Testnet'],
            ['Free', 'free']
        ], { placeholder: 'Currency', border: true })
        this._perUnit = new Input({ placeholder: 'Per time interval' })
        this._timeUnit = new Select([
            ['Seconds', 'seconds'],
            ['Minutes', 'minutes'],
            ['Hours', 'hours']
        ], { border: true })
        this._payTo = new Input({ placeholder: 'Pay to address', class: 'wide' })
    }

    validate() {
        const c = this._currency.value
        let valid = true

        notEmpty(this._currency)
        if (!c) return false

        if (c !== 'free') {
            notEmpty(this._amount)
            notEmpty(this._perUnit)
            notEmpty(this._payTo)
        }

        return valid

        function notEmpty(el) {
            if (!el.value) {
                el.error = true
                valid = false
            } else {
                el.error = false
            }
        }
    }

    get value() {
        const c = this._currency.value

        if (c === 'free') {
            return null
        }

        return {
            currency: c,
            amount: this._amount.value || '0',
            interval: Number(this._perUnit.value) || 0,
            unit: this._timeUnit.value,
            payTo: this._payTo.value
        }
    }

    onload() {
        this.check()
    }

    check() {
        if (this._select.value) {
            const v = this._select.value
            const p = v.payment
            this._amount.element.setAttribute('disabled', 'disabled')
            this._amount.value = p ? p.amount : ''
            this._currency.element.setAttribute('disabled', 'disabled')
            this._currency.value = p ? p.currency : 'free'
            this._perUnit.element.setAttribute('disabled', 'disabled')
            this._perUnit.value = p ? p.interval : ''
            this._timeUnit.element.setAttribute('disabled', 'disabled')
            this._timeUnit.value = p ? p.unit : ''
            this._payTo.element.setAttribute('disabled', 'disabled')
            this._payTo.value = p ? p.payTo : ''
        } else {
            this._amount.element.removeAttribute('disabled', 'disabled')
            this._currency.element.removeAttribute('disabled', 'disabled')
            this._perUnit.element.removeAttribute('disabled', 'disabled')
            this._timeUnit.element.removeAttribute('disabled', 'disabled')
            this._payTo.element.removeAttribute('disabled', 'disabled')
        }
    }

    createElement() {
        this.check()
        return html `
      <div>
        <h4>Payment Options</h4>
        <div class="configs">
            ${this._amount.element}
            ${this._currency.element}
            ${this._perUnit.element}
            ${this._timeUnit.element}
          ${this._payTo.element}
        </div>
      </div>
    `
    }
}

class QualityWizard extends Component {
    constructor(select) {
        super()
        this._select = select
        this._quality = new Select([
            ['High', 2],
            ['Medium', 1],
            ['Low', 0]
        ], { placeholder: 'Quality', border: true })
        this._video = new Select([], { placeholder: 'Video device', border: true })
        this._audio = new Select([], { placeholder: 'Audio device', border: true })
        this._description = new Input({ placeholder: 'Video description' })
        this.devices = []
        devices((err, list) => {
            if (err) return console.error('device error:', err)
            this.devices = list
            this.devices.push({ kind: 'screen', label: 'Screen sharing' })
            this.update()
        })
    }

    render() {
        if (this._select.value) return

        const v = []
        const a = []

        for (const dev of this.devices) {
            if (dev.deviceId === 'default') continue

            const r = dev.kind === 'audioinput' ? a :
                dev.kind === 'videoinput' ? v :
                dev.kind === 'screen' ? v : []

            r.push([dev.label, dev])
        }

        const video = this._video
        const audio = this._audio

        this._video = new Select(v, { placeholder: 'Video device', border: true })
        this._audio = new Select(a, { placeholder: 'Audio device', border: true })

        video.element.replaceWith(this._video.element)
        audio.element.replaceWith(this._audio.element)

        this.check()
    }

    onload() {
        this.check()
    }

    validate() {
        let valid = true
        notEmpty(this._quality)
        notEmpty(this._video)
        notEmpty(this._audio)
        return valid

        function notEmpty(el) {
            if (!el.value && el.value !== 0) {
                el.error = true
                valid = false
            } else {
                el.error = false
            }
        }
    }

    get value() {
        return {
            quality: this._quality.value,
            video: this._video.value,
            audio: this._audio.value,
            description: this._description.value
        }
    }

    check() {
        if (this._select.value) {
            const v = this._select.value
            this._quality.element.setAttribute('disabled', 'disabled')
            this._quality.value = v.quality
            this._video.element.setAttribute('disabled', 'disabled')
            const vi = this.devices.find(d => d.deviceId === v.video)
            if (vi) this._video.value = vi
            this._audio.element.setAttribute('disabled', 'disabled')
            const ai = this.devices.find(d => d.deviceId === v.audio)
            if (ai) this._audio.value = ai
            this._description.element.setAttribute('disabled', 'disabled')
            this._description.value = v.description || ''
        } else {
            this._quality.element.removeAttribute('disabled')
            this._video.element.removeAttribute('disabled')
            this._audio.element.removeAttribute('disabled')
            this._description.element.removeAttribute('disabled')
        }
    }

    createElement() {
        this.check()
        return html `
      <div>
        <h4>Stream Options</h4>
        <div class="configs">
          <div class="row">
            ${this._quality.element}
          </div>
          <div class="row">
            ${this._video.element}
          </div>
          <div class="row">
            ${this._audio.element}
          </div>
          <div class="row">
            ${this._description.element}
          </div>
        </div>
      </div>
    `
    }
}

module.exports = class BroadcastWizard extends Wizard {
    constructor(opts = {}) {
        if (opts.list) {
            console.log(opts.list)
            const s = new SelectStreamWizard(opts.list)
            super([
                ['Select Stream', s],
                ['Payment options', new PaymentWizard(s)],
                ['Stream options', new QualityWizard(s)],
                ['Broadcast', null]
            ], {
                title: 'Start broadcast',
                ...opts
            })
        }
    }
}