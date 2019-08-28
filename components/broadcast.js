const MorphComponent = require('hui/morph')
const html = require('hui/html')
const hypercore = require('hypercore')
const crypto = require('hypercore-crypto')
const { record } = require('../lib/webm-broadcast-stream')
const Payment = require('dazaar-payment')
const pump = require('pump')
const cluster = require('webm-cluster-stream')
const prettierBytes = require('prettier-bytes')
const css = require('hui/css')

const cls = css`
  :host {
    padding: 10px;
  }

  :host textarea {
    display: block;
    width: 100%;
    height: 200px;
  }
`

module.exports = class Broadcast extends MorphComponent {
  constructor (dazaar, feed, opts, onstop) {
    super()

    this.onstop = onstop || noop
    this.dazaar = dazaar
    this.device = opts.device
    this.payment = opts.payment
    this.description = opts.description || ''

    this.card = {
      id: null,
      description: this.description,
      payment: this.payment && [ this.payment ]
    }

    this.swarm = null
    this.payment = null
    this.uploadedBytes = 0
    this.recording = null
    this.destroyed = false

    const self = this

    this.feed = feed

    this.seller = dazaar.sell(this.feed, {
      validate (remoteKey, done) {
        // payment is always set here
        self.payment.validate(remoteKey, done)
      }
    })

    this.seller.once('validate', () => {
      this.seller.feed.on('upload', (index, data) => {
        this.uploadedBytes += data.length
        this.update()
      })
    })

    const update = this.update.bind(this)
    this.feed.on('append', update)

    this.feed.ready(() => {
      if (!this.feed) return

      if (this.feed.length === 0) {
        this.feed.append(JSON.stringify({
          description: this.description,
          quality: opts.device.quality,
          video: opts.device.video.deviceId,
          audio: opts.device.audio.deviceId,
          payment: this.card.payment
        }))
      }

      record(opts, (err, stream) => {
        if (err) return
        if (!this.feed) return stream.destroy()
        this.recording = stream
        pump(stream, cluster(), this.feed.createWriteStream())
      })
    })

    this.seller.ready(() => {
      if (!this.feed) return

      this.card.id = this.seller.key.toString('hex')
      this.payment = new Payment(this.seller.key, this.card.payment)
      this.swarm = require('dazaar/swarm')(this.seller)

      this.swarm.on('connection', update)
      this.swarm.on('disconnection', update)

      this.update()
    })
  }

  onload () {
    if (this.destroyed) throw new Error('Cannot remount a broadcast instance')
  }

  onunload () {
    this.destroyed = true
    if (this.feed) this.feed.close()
    if (this.payment) this.payment.destroy()
    if (this.swarm) this.swarm.destroy()
    if (this.recording) this.recording.destroy()
  }

  createElement () {
    const peers = this.swarm ? this.swarm.connections.size : 0
    const frames = Math.max(this.feed.length - 1, 0)
    return html`
      <div class="${cls}">
        <h1>You are broadcasting!</h1>
        You are connected to ${peers} buyers.<br>
        You have uploaded ${prettierBytes(this.uploadedBytes)}.<br>
        You have recorded ${frames} key frames.<br>
        <h2>Seller key</h2>
        <input disabled value="${this.seller.key ? this.seller.key.toString('hex') : ''}">
        <h2>Dazaar card</h2>
        <textarea disabled>${JSON.stringify(this.card, null, 2)}</textarea>
        <button onclick=${this.onstop.bind(this)}>Stop broadcasting</button>
      </div>
    `
  }
}

function noop () {}
