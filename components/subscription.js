const Button = require('./button')
const css = require('hui/css')
const html = require('hui/html')
const rawHtml = require('hui/html/raw')
const Component = require('hui')
const Input = require('./input')
const peerSwarm = require('../lib/peer-swarm')
const pump = require('pump')
const Payment = require('@dazaar/payment-lightning')
const prettierBytes = require('prettier-bytes')
const prettyMilliseconds = require('pretty-ms')
const qr = require('crypto-payment-url/qrcode')
const { clipboard } = require('electron')
const { Readable } = require('streamx')

class Throttle extends Readable {
  constructor (feed, start) {
    super()
    this.feed = feed
    this.start = start
    this.range = feed.download({ start, end: start + 16, linear: true })
  }

  _read (cb) {
    const start = this.start
    this.feed.undownload(this.range)
    this.range = this.feed.download({ start, end: start + 16, linear: true })
    this.feed.get(this.start++, (err, data) => {
      if (err) return cb(err)
      this.push(data)
      cb(null)
    })
  }

  _destroy (cb) {
    this.feed.undownload(this.range)
    cb(null)
  }
}

const PLAY = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="currentColor" />
    <path transform-origin="center" transform=" translate(1.4) scale(.6)" fill="white" d="M3 22v-20l18 10-18 10z"/>
  </svg>
`

const PAUSE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="currentColor" />
    <path transform-origin="center" transform="scale(.6)" fill="white" d="M11 22h-4v-20h4v20zm6-20h-4v20h4v-20z"/>
  </svg>
`

const style = css`
  :host {
    position: relative;
  }

  :host video {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-repeat: no-repeat;
    background: black;
  }

  :host h1 {
    margin: 0;
    color: #ffffff;
    text-align: center;
    width: 100%;
    font-size: 35px;
    text-align: center;
    letter-spacing: 0.02em;
    user-select: none;
  }

  :host .overlay {
    opacity: 0;
    transition: opacity 0.25s ease;
    background: rgba(0, 0, 0, 0.2);
    height: 100%;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }

  :host.active .overlay,
  :host:hover .overlay {
    opacity: 1;
  }

  :host .overlay .bottom {
    position: absolute;
    right: 0;
    bottom: 20px;
    left: 0;
    padding: 20px;
  }

  :host .overlay .controls {
    background-color: rgba(92, 92, 108, 1);
  }

  :host .overlay .pause-play {
    position: absolute;
    width: 100px;
    height: 100px;
    left: calc(50% - 50px);
    top: calc(50% - 50px);
  }

  :host .overlay .pause-play svg {
    width: 100%;
    height: 100%;
    fill: rgba(92, 92, 108, 1);
    color: rgba(92, 92, 108, 1);
  }

  :host .overlay .top-right {
    position: absolute;
    right: 0;
    top: 0;
    margin: 20px;
  }

  :host .overlay .top-left {
    position: absolute;
    left: 0;
    top: 0;
    margin: 20px;
    min-width: 250px;
  }

  :host .info {
    border-radius: 4px;
    background: rgba(92, 92, 108, 1);
    padding: 10px;
    color: #ffffff;
    font-size: 14px;
    line-height: 22px;
    letter-spacing: 0.02em;
    text-align: center;
  }

  :host .info h3 {
    margin: 0;
    margin-bottom: 10px;
    font-weight: bold;
  }

  :host .overlay .bottom-right button {
    margin-left: 10px;
  }

  :host ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  :host input {
    padding: 10px;
    border-color: white;
    width: 190px;
  }

  :host .overlay .middle {
    position: absolute;
    top: calc(50% - 35px);
    left: 0;
    right: 0;
  }
`

module.exports = class Subscription extends Component {
  constructor (opts) {
    super()
    this.options = opts
    this.buyer = this.options.buyer

    this.payment = new Payment(this.buyer, null)

    this.onstop = this.options.onstop || noop
    this._desc = html`
      <span>Waiting for description</span>
    `
    this._info = html`
      <span>Waiting for remote info</span>
    `
    this._downloaded = html`
      <span>0 B</span>
    `
    this._peers = html`
      <span>0</span>
    `
    this._server = null
    this._gotoEnd = true
    this._invoiceEl = null
    this.currentFrame = 0
    this._serverStream = null
    this._amount = null
    this._timeout = null
    this.downloadBytes = 0
    this.swarm = null
    this.peerSwarm = null
    this.playing = true
    this._playButtonRerender = false
    this._subscribe()
  }

  _subscribe () {
    const self = this

    if (this.buyer.feed) onfeed(this.buyer.feed)
    else this.buyer.on('feed', () => onfeed(this.buyer.feed))

    this.buyer.ready(() => {
      this.swarm = require('dazaar/swarm')(this.buyer)
      this.swarm.on('connection', () => {
        this.update()
      })
      this.swarm.on('disconnection', () => {
        this.update()
      })
    })

    let hoverState = false

    this.buyer.on('invalid', err => {
      this._info.innerText = err.message
      this.element.classList.add('active')
      hoverState = true
      clearTimeout(this._timeout)
    })

    this.buyer.on('valid', info => {
      if (info && info.uniqueFeed === false && !this.peerSwarm) {
        this.peerSwarm = peerSwarm(this.buyer.feed)
        this.peerSwarm.on('connection', () => {
          this.update()
        })
        this.peerSwarm.on('disconnection', () => {
          this.update()
        })
      }
      this._info.innerText = infoMessage(info)
      if (!hoverState) return
      this._timeout = setTimeout(() => this.element.classList.remove('active'), 1000)
    })

    function onfeed (feed) {
      feed.get(0, (_, data) => {
        if (data) {
          try {
            const info = JSON.parse(data)
            // TODO: raf me
            if (info.description) self._desc.innerText = info.description
            if (info.tail === false || info.gotoEnd === false) self._gotoEnd = false
          } catch (_) {}
        }
      })

      feed.on('download', function (index, data) {
        self.downloadBytes += data.length
        self.update()
      })

      if (self._server) return
      self._server = require('http').createServer(self._onrequest.bind(self))
      self._server.listen(0, '127.0.0.1')
      self.once(self._server, 'listening', self.start.bind(self))
    }
  }

  render () {
    this._downloaded.innerText = prettierBytes(this.downloadBytes)
    this._peers.innerText = (this.swarm ? this.swarm.connections.size : 0) + (this.peerSwarm ? this.peerSwarm.connections.size : 0)

    if (this._playButtonRerender) {
      this._playButtonRerender = false
      if (this.playing) {
        this.element.querySelector('.pause-play').innerHTML = PAUSE
      } else {
        this.element.querySelector('.pause-play').innerHTML = PLAY
      }
    }
  }

  onload () {
    this.on(document.body, 'keydown', (e) => {
      if (e.keyCode === 32) this.togglePlay()
    })

    this.on(this.element.querySelector('.pause-play'), 'click', () => {
      this.togglePlay()
    })
  }

  togglePlay () {
    this._playButtonRerender = true
    if (this.playing) {
      this.playing = false
      this.element.querySelector('video').pause()
    } else {
      this.playing = true
      this.element.querySelector('video').play()
    }
    this.update()
  }

  _onrequest (req, res) {
    const feed = this.buyer.feed
    feed.get(1, (err, data) => {
      if (err || !this.loaded) return res.destroy()
      res.write(data)

      feed.update({ ifAvailable: true }, () => {
        if (!this.loaded) return res.destroy()

        let start = Math.max(2, feed.length - 1)
        if (!this._gotoEnd) start = 2

        const stream = new Throttle(feed, start)

        this.currentFrame = start
        this._serverStream = stream

        pump(stream, res)
      })
    })
  }

  start () {
    const video = this.element.querySelector('video')
    video.src = 'http://127.0.0.1:' + this._server.address().port
    video.play()
  }

  stop () {
    if (this.buyer.feed) this.buyer.feed.close()
    if (this.swarm) this.swarm.destroy()
    if (this.peerSwarm) this.peerSwarm.destroy()
    if (this._server) this._server.close()
    const video = this.element.querySelector('video')
    video.src = ''
    this.onstop()
  }

  gotoStart () {
    this._gotoEnd = false
    if (this._serverStream) this._serverStream.destroy()
    if (this._server) this.start()
  }

  gotoEnd () {
    this._gotoEnd = true
    if (this._serverStream) this._serverStream.destroy()
    if (this._server) this.start()
  }

  buy (amount) {
    const self = this

    this.payment.requestInvoice(amount, function (err, inv) {
      if (err) throw err

      self._invoiceEl.style.display = 'block'
      const a = self._invoiceEl.querySelector('.qrcode')
      const { url, qrcode } = qr.bitcoin({ lightning: inv.request })
      a.href = url
      a.innerHTML = qrcode

      const span = self._invoiceEl.querySelector('.amount')
      span.innerText = amount + ' Satoshis'
    })
  }

  createElement () {
    const amount = (this._amount = new Input({
      placeholder: 'Enter Satoshis',
      style: 'margin: 10px auto;'
    }))

    const invoiceEl = this._invoiceEl = html`
      <div style="display: none;">
        <h3 style="margin: 15px 0;">Scan or click to open LN invoice</h3>
        <a class="qrcode" style="display: block" href="#"></a>
        <div style="margin-top: 10px;">
          <span class="amount" style="margin-right: 10px">0 Satoshis</span>
          <a class="copy" href="#" onclick=${onclick}>Copy invoice</a>
        </div>
      </div>
    `

    function onclick (e) {
      const invoice = invoiceEl.querySelector('.qrcode').href.split('lightning=')[1]
      console.log(invoice)
      clipboard.writeText(invoice)
      e.preventDefault()
    }

    return html`
      <div class="${style}">
        <video></video>
        <div class="overlay">
          <div class="top-right">
            ${new Button('Stop watching', { onclick: this.stop.bind(this) })
              .element}
          </div>
          <div class="controls bottom df justify-between align-center">
            ${new Button('Go to start', {
              dark: true,
              border: true,
              onclick: this.gotoStart.bind(this)
            }).element}
            <div class="flex" style="text-align: center;">
              <h1>${this._info}</h1>
            </div>
            ${new Button('Go to end', {
              dark: true,
              border: true,
              onclick: this.gotoEnd.bind(this)
            }).element}
          </div>
          <div class="pause-play">
            ${rawHtml(PAUSE)}
          </div>
          <div class="info top-left">
            <h3>${this._desc}</h3>
            <ul>
              <li>Connected to ${this._peers} peer(s)</li>
              <li>Downloaded ${this._downloaded}</li>
            </ul>
            <div style="${this.options.payment ? '' : 'display: none;'}">
              ${amount.element}
              ${new Button('Buy', {
                onclick: () => this.buy(Number(amount.value))
              }).element}
            </div>
            ${invoiceEl}
          </div>
        </div>
      </div>
    `
  }
}

function noop () {}

function infoMessage (info) {
  if (info) {
    if (info.type === 'free') {
      return 'Stream is free of charge'
    } else if (info.type === 'time') {
      return (
        'Subscription expires in ' +
        prettyMilliseconds(info.remaining, { compact: true })
      )
    } else {
      return 'Unknown subscription type: ' + info.type
    }
  } else {
    return 'Remote did not share any subscription info'
  }
}
