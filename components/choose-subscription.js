const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const cls = css`
  :host input {
    width: 220px;
  }

  :host {
    padding: 10px;
  }

  :host .enter-key {
    margin: 20px 0;
  }
`

module.exports = class ChooseSubscription extends Component {
  constructor (dazaar, onselect) {
    super()
    this.dazaar = dazaar
    this.selected = null
    this.onselect = onselect
    this._list = []
    this._prevEl = null
    this._buyerEl = null
    this._updateBuying = false
  }

  onload () {
    this.dazaar.ready(() => this.update())
    this.dazaar.buying((err, list) => {
      if (err) return
      this._list = list.map(({ key }) => key)
      this._updateBuying = true
      this.update()
    })
  }

  render () {
    const self = this

    if (this._updateBuying) {
      this._updateBuying = false
      this._prevEl.innerHTML = ''
      this._prevEl.appendChild(html`<option value="">Select previous stream</option>`)
      for (const key of this._list) {
        this._prevEl.appendChild(html`<option value="${key.toString('hex')}">${key.toString('hex')}</option>`)
      }
    }
  }

  onunload () {
    this.selected = null
    this.element.querySelector('input').value = ''
  }

  createElement () {
    const self = this
    const buyer = html`<input value="${this.dazaar.buyer ? this.dazaar.buyer.toString('hex') : ''}">`
    this._buyerEl = buyer
    this._prevEl = html`<select onchange=${onselect}><option value="">Select previous stream</option></select>`
    return html`
      <div class="${cls}">
        <h2>Subscribe to a Dazaar stream</h2>
        <h2>Your Dazaar key</h2>
        Use this key to pay for your subscription: ${buyer}
        <div class="enter-key">
          Enter subscription key: <input placeholder="deadbeefdea..." onkeyup=${onchange} onchange=${onchange}><br>
        </div>
        ${this._prevEl}
      </div>
    `

    function onselect () {
      const v = this.value
      if (v) self.select(Buffer.from(v, 'hex'))
    }

    function onchange (e) {
      const v = this.value
      if (/^[0-9a-f]{64}$/.test(v)) self.select(Buffer.from(v, 'hex'))
    }
  }

  select (key) {
    if (this.selected && key.equals(this.selected)) return
    this.selected = key
    this.onselect(this.selected)
  }
}
