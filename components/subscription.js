const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')
const prettierBytes = require('prettier-bytes')
const pump = require('pump')

const cls = css`
  :host video {
    width: 100%;
    height: 100%;
  }

  :host {
    position: relative;
  }

  :host {
    background-color: black;
  }

  :host .info-box {
    left: 10px;
    top: 10px;
  }

  :host .controls {
    right: 10px;
    bottom: 10px;
  }

  :host .info-box, :host .controls button {
    background-color: gray;
    outline: none;
    padding: 10px;
    color: white;
    font-family: monospace;
    font-weight: bold;
  }

  :host .controls button {
    margin-left: 10px;
  }

  :host .overlay {
    z-index: 10;
    position: absolute;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  :host:hover .overlay {
    opacity: 0.90;
  }
`

module.exports = class Subscription extends Component {
  constructor (dazaar, key, ondone) {
    super()

    this.ondone = ondone || noop
    this.buyer = dazaar.buy(key, { sparse: true })
    this.feed = null
    this.swarm = null
    this.downloaded = 0
    this.currentFrame = 0
    this.description = ''

    this.buyer.once('feed', feed => {
      this.feed = feed
      this._onfeed()
      this.update()
    })

    this._gotoEnd = true
    this._server = null
    this._serverStream = null
    this._peersEl = null
    this._keyframesEl = null
    this._downloadedEl = null
    this._currentFrameEl = null
    this._infoEl = null
    this._descEl = null
  }

  _onfeed () {
    if (!this.feed || !this.loaded) return
    const update = this.update.bind(this)

    this.feed.get(0, (_, data) => {
      if (data) {
        try {
          const info = JSON.parse(data)
          if (info.description) this.description = info.description
          this.update()
        } catch (_) {}
      }
    })

    this.on(this.buyer, 'valid', update)
    this.on(this.feed, 'append', update)
    this.on(this.feed, 'download', (index, data) => {
      this.downloaded += data.length
      this.update()
    })

    if (this._server) return
    this._server = require('http').createServer(this._onrequest.bind(this))
    this._server.listen(0, '127.0.0.1')
    this.once(this._server, 'listening', this.start.bind(this))
  }

  _onrequest (req, res) {
    this.feed.get(1, (err, data) => {
      if (err || !this.loaded) return res.destroy()
      res.write(data)

      this.feed.update({ ifAvailable: true }, () => {
        if (!this.loaded) return res.destroy()

        let start = Math.max(2, this.feed.length - 1)
        if (!this._gotoEnd) start = 2

        const stream = this.feed.createReadStream({
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

  onload () {
    const update = this.update.bind(this)
    this.swarm = require('dazaar/swarm')(this.buyer)
    this.on(this.swarm, 'connection', update)
    this.on(this.swarm, 'disconnection', update)
    this._onfeed()
  }

  onunload () {
    this.swarm.destroy()
    this.swarm = null
    if (this._server) this._server.close()
    if (this._serverStream) this._serverStream.destroy()
    this._server = this._serverStream = null
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

  start () {
    if (!this.element) return

    const video = this.element.querySelector('video')
    video.src = 'http://127.0.0.1:' + this._server.address().port
    video.play()
  }

  stop () {
    if (!this.element) return
    const video = this.element.querySelector('video')
    video.pause()
    video.src = ''
  }

  destroy () {
    this.stop()
    this.ondone(null)
  }

  render () {
    if (!this._peersEl) return

    this._peersEl.innerText = this.swarm.connections.size
    if (this.feed) this._keyframesEl.innerText = this.feed.length
    this._downloadedEl.innerText = prettierBytes(this.downloaded)
    this._currentFrameEl.innerText = this.currentFrame

    let expires = 'Waiting for remote info ...'

    if (this.feed) {
      if (this.buyer.info) {
        const info = this.buyer.info
        if (info.type === 'free') {
          expires = 'Stream is free of charge'
        } else if (info.type === 'time') {
          expires = 'Subscription expires in ' + info.remaining + ' ms'
        } else {
          expires = 'Unknown subscription type: ' + info.type
        }
      } else {
        expires = 'Remote did not share any subscription info'
      }
    }

    this._infoEl.innerText = expires
    if (this.description) this._descEl.innerText = '"' + this.description + '"'
  }

  createElement () {
    this._peersEl = html`<span>0</span>`
    this._keyframesEl = html`<span>0</span>`
    this._downloadedEl = html`<span>0 b</span>`
    this._currentFrameEl = html`<span>0</span>`
    this._infoEl = html`<span>Waiting for remote info ...</span>`
    this._descEl = html`<span>unknown stream</span>`

    return html`
      <div class="${cls}">
        <div class="overlay info-box">
          Watching ${this._descEl}<br>
          Connected to ${this._peersEl} peer(s)<br>
          Downloaded ${this._downloadedEl}<br>
          ${this._infoEl}<br>
          Stream contains ${this._keyframesEl} key frames<br>
          You are watching frame ~${this._currentFrameEl}<br>
        </div>
        <div class="overlay controls">
          <button onclick=${this.gotoStart.bind(this)}>
            Goto start
          </button>
          <button onclick=${this.gotoEnd.bind(this)}>
            Goto end
          </button>
          <button onclick=${this.destroy.bind(this)}>
            Stop watching
          </button>
        </div>
        <video></video>
      </div>
    `
  }
}

function noop () {}
