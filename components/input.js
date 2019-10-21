const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const style = css`
  :host {
    color: #353248;
    line-height: 16px;
    font-size: 12px;
    padding: 12px;
    letter-spacing: 0.02em;
    outline: none;
    border-radius: 4px;
    border: 0.5px solid rgba(53, 50, 72, 0.5);
  }

  :host.error {
    border: 0.5px solid #E83D4A;
  }
`

module.exports = class Input extends Component {
  constructor (opts) {
    super()
    this.options = opts || {}
  }

  set error (val) {
    if (val) this.element.classList.add('error')
    else this.element.classList.remove('error')
  }

  set value (val) {
    this.element.value = val
  }

  get value () {
    return this.element.value
  }

  createElement () {
    if (!this.options.disabled && this.options.disabled !== undefined) delete this.options.disabled
    return html`<input class="${style + ' ' + (this.options.class || '')}" ${this.options}>`
  }
}