const Button = require('./button')
const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const { clipboard } = require('electron')
const { record } = require('../lib/webm-broadcast-stream')
const pump = require('pump')
const cluster = require('webm-cluster-stream')
const prettierBytes = require('prettier-bytes')

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

  :host:hover .overlay,
  :host.active .overlay {
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

  :host .info {
    border-radius: 4px;
    background: rgba(92, 92, 108, 1);
    padding: 1.5rem;
    color: #ffffff;
    font-size: 14px;
    line-height: 22px;
    letter-spacing: 0.02em;
  }

  :host .info h3 {
    margin: 0;
    margin-bottom: 10px;
    font-weight: bold;
  }

  :host .overlay .bottom-right button {
    margin-left: 10px;
  }

  :host .overlay .middle {
    position: absolute;
    top: calc(80% - 35px);
    left: 0;
    right: 0;
  }

  :host h1 {
    margin: 0;
    color: #ffffff;
    text-align: center;
    width: 100%;
    font-size: 50px;
    line-height: 70px;
    text-align: center;
    letter-spacing: 0.02em;
    user-select: none;
    margin-bottom: 30px;
  }

  :host ul {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }
`

module.exports = class Broadcast extends Component {
  constructor (opts) {
    super()
    this.options = opts || {}
    this.seller = opts.seller
    this.onstop = this.options.onstop || (() => {})
    this.timeout = null
    this.recording = null
    this._server = null
    this.uploadedBytes = 0
    this._uploaded = html`
      <span>0 B</span>
    `
    this._peers = html`
      <span>0</span>
    `
    this._record()
  }

  _record () {
    const feed = this.seller.feed

    this.seller.on('buyer-feed', feed => {
      feed.on('upload', (index, data) => {
        this.uploadedBytes += data.length
        this.update()
      })
    })

    feed.ready(err => {
      if (err) return
      if (feed.length === 0) {
        feed.append(
          JSON.stringify({
            description: this.options.description,
            quality: this.options.quality,
            video: this.options.video.deviceId,
            audio: this.options.audio.deviceId,
            payment: this.options.payment
          })
        )
      }

      record(
        {
          quality: this.options.quality,
          video: this.options.video,
          audio: this.options.audio
        },
        (err, stream) => {
          if (err) return

          if (!this.seller) return stream.destroy()
          this.recording = stream
          pump(stream, cluster(), feed.createWriteStream())

          this._server = require('http').createServer(
            this._onrequest.bind(this)
          )
          this._server.listen(0, '127.0.0.1')
          this.once(this._server, 'listening', this.start.bind(this))
          this.swarm = require('dazaar/swarm')(this.seller)
          this.swarm.on('connection', () => {
            this.update()
          })
          this.swarm.on('disconnection', () => {
            this.update()
          })
        }
      )
    })
  }

  render () {
    this._uploaded.innerText = prettierBytes(this.uploadedBytes)
    this._peers.innerText = this.swarm ? this.swarm.connections.size : 0
  }

  _onrequest (req, res) {
    const self = this
    this.recording.on('data', ondata)
    res.on('close', done)
    res.on('error', done)
    res.on('end', done)
    req.on('close', done)
    req.on('error', done)
    req.on('end', done)

    function done () {
      self.recording.removeListener('data', ondata)
    }

    function ondata (data) {
      res.write(data)
    }
  }

  start () {
    const video = this.element.querySelector('video')
    video.src = 'http://127.0.0.1:' + this._server.address().port
    video.play()
  }

  onload () {
    this.element.classList.add('active')
    this.timeout = setTimeout(() => {
      this.element.classList.remove('active')
    }, 5000)
  }

  onunload () {
    clearTimeout(this.timeout)
  }

  stop () {
    if (this.recording) this.recording.destroy()

    const video = this.element.querySelector('video')
    video.src = ''

    if (this.swarm) this.swarm.destroy()
    this.seller.feed.close(() => {
      this._server.close()
      this._server.on('close', () => {
        this.onstop()
      })
    })
    this.seller = null
  }

  copy () {
    if (!this.seller) return
    this.seller.ready(err => {
      if (err) return

      const card = {
        id: this.seller.key.toString('hex'),
        description: this.options.description,
        payment: null
      }

      if (this.options.payment) {
        card.payment = [this.options.payment]
      }

      console.log(JSON.stringify(card, null, 2))
      clipboard.writeText(JSON.stringify(card, null, 2))
    })
  }

  createElement () {
    return html`
      <div class="${style} active">
        <video></video>
        <div class="overlay">
          <div class="top-right">
            ${new Button('Stop broadcasting', { onclick: this.stop.bind(this) })
              .element}
          </div>
          <div class="info top-left">
            <h3>${this.options.description || 'Video stream'}</h3>
            <ul>
              <li>Connected to ${this._peers} peer(s)</li>
              <li>Uploaded ${this._uploaded}</li>
              <li>
                ${this.options.payment
                  ? 'You are charging for this stream'
                  : 'Stream is free of charge'}
              </li>
            </ul>
            ${new Button('Copy Dazaar card', { onclick: this.copy.bind(this) })
              .element}
          </div>
          <div class="middle" style="text-align: center;">
            <h1>You are broadcasting</h1>
          </div>
        </div>
      </div>
    `
  }
}
