const Button = require('./button')
const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Input = require('./input')
const pump = require('pump')
const prettierBytes = require('prettier-bytes')
const { ipcRenderer } = require('electron')
const prettyMilliseconds = require('pretty-ms')

let ID = 0
const REPLY = new Map()

ipcRenderer.on('scatter-reply', function (event, data) {
  const id = data.id
  const cb = REPLY.get(id)
  REPLY.delete(id)
  const error = data.error ? new Error(data.error) : null
  if (cb) cb(error)
})

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
    line-height: 70px;
    text-align: center;
    letter-spacing: 0.02em;
    user-select: none;
    margin-bottom: 30px;
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

  :host .overlay .bottom-right {
    position: absolute;
    right: 0;
    bottom: 0;
    margin: 10px;
  }

  :host .overlay .top-right {
    position: absolute;
    right: 0;
    top: 0;
    margin: 10px;
  }

  :host .overlay .top-left {
    position: absolute;
    left: 0;
    top: 0;
    margin: 10px;
  }

  :host .overlay .bottom-left {
    position: absolute;
    left: 0;
    bottom: 0;
    margin: 10px;
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
    this.onstop = this.options.onstop || noop
    this._desc = html`<span>Waiting for description</span>`
    this._info = html`<span>Waiting for remote info</span>`
    this._downloaded = html`<span>0 B</span>`
    this._peers = html`<span>0</span>`
    this._server = null
    this._gotoEnd = true
    this.currentFrame = 0
    this._serverStream = null
    this._amount = null
    this._timeout = null
    this.downloadBytes = 0
    this._payInfo = html`<span></span>`
    this._payInfoHide = null
    this.swarm = null
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

    this.buyer.on('invalid', (err) => {
      this._info.innerText = err.message
      this.element.classList.add('active')
      hoverState = true
      clearTimeout(this._timeout)
    })

    this.buyer.on('valid', (info) => {
      this._info.innerText = infoMessage(info)
      if (!hoverState) return
      this._timeout = setTimeout(() => this.element.classList.remove('active'))
    })

    function onfeed (feed) {
      feed.get(0, (_, data) => {
        if (data) {
          try {
            const info = JSON.parse(data)
            // TODO: raf me
            if (info.description) self._desc.innerText = info.description
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
    this._peers.innerText = this.swarm ? this.swarm.connections.size : 0
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

        const stream = feed.createReadStream({
          start,
          live: true
        })

        this.currentFrame = start
        this._serverStream = stream

        stream.on('data', () => {
          if (stream === this._serverStream) {
            this.currentFrame = start++
            this.update()
          }
        })

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
    if (this._server) this._server.close()
    const video = this.element.querySelector('video')
    video.src = ''
    this.onstop()
  }

  gotoStart () {
    this._gotoEnd = false
    if (this._serverStream) this._serverStream.destroy()
    this.start()
  }

  gotoEnd () {
    this._gotoEnd = true
    if (this._serverStream) this._serverStream.destroy()
    this.start()
  }

  buy (amount) {
    const id = ID++

    ipcRenderer.send('scatter', {
      id,
      seller: this.buyer.seller.toString('hex'),
      buyer: this.buyer.key.toString('hex'),
      amount,
      payment: this.options.payment
    })

    REPLY.set(id, (err) => {
      this._amount.value = ''
      if (err) this._payInfo.innerText = err.message
      else this._payInfo.innerText = 'Payment succeeded! Please wait.'

      clearTimeout(this._payInfoHide)
      this._payInfoHide = setTimeout(() => {
        this._payInfo.innerText = ''
      }, 6000)
    })
  }

  createElement () {
    const amount = this._amount = new Input({ placeholder: 'Enter amount, ie. 0.1234 EOS' })
    return html`
      <div class="${style}">
        <video></video>
        <div class="overlay">
          <div class="top-right">
            ${new Button('Stop watching', { onclick: this.stop.bind(this) }).element}
          </div>
          <div class="bottom-right">
            ${new Button('Go to start', { border: true, onclick: this.gotoStart.bind(this) }).element}
            ${new Button('Go to end', { border: true, onclick: this.gotoEnd.bind(this) }).element}
          </div>
          <div class="middle" style="text-align: center;">
            <h1>${this._info}</h1>
            <h3 style="color: white;">${this._payInfo}</h3>
          </div>
          <div class="info top-left">
            <h3>${this._desc}</h3>
            <ul>
              <li>Connected to ${this._peers} peer(s)</li>
              <li>Downloaded ${this._downloaded}</li>
            </ul>
          </div>
          <div class="bottom-left" style="${this.options.payment ? '' : 'display: none;'}">
            ${amount.element} ${new Button('Buy using Scatter App', { onclick: () => this.buy(amount.value) }).element}
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
      return 'Subscription expires in ' + prettyMilliseconds(info.remaining, {compact: true})
    } else {
      return 'Unknown subscription type: ' + info.type
    }
  } else {
    return 'Remote did not share any subscription info'
  }
}
