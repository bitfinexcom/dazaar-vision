const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const style = css`
  :host {
    letter-spacing: 0.02em;
    color: rgba(16, 37, 66, 0.5);
    text-indent: 2px;
    display: flex;
    flex-direction: column;
  }
`

const inputStyle = css`
  :host {
    color: #353248;
    font-size: 100%;
    letter-spacing: 0.02em;
    outline: none;
    border-radius: 4px;
    border: 0.5px solid rgba(53, 50, 72, 0.1);
    margin-top: 2px;
  }

  :host[disabled] {
    border: 0.5px solid rgba(53, 50, 72, 0.5);
    border-color: rgb(235, 235, 228);
    color: rgb(84, 84, 84);
    background-color: #f6f6f6;
  }

  :host.error {
    border: 0.5px solid #e83d4a;
  }
`

module.exports = class Input extends Component {
  constructor (opts) {
    super()
    this.options = opts || {}

    this._input = html`<input
      class="p2 ${inputStyle}"
      ${this.options}
    />`
  }

  get disabled () {
    return this._input.disabled
  }

  set disabled (v) {
    this._input.disabled = v
  }

  get readonly () {
    return this._input.readonly
  }

  set readonly (v) {
    this._input.readonly = v
  }

  set error (val) {
    if (val) this.element.classList.add('error')
    else this.element.classList.remove('error')
  }

  set value (val) {
    this._input.value = val
  }

  get value () {
    return this._input.value
  }

  createElement () {
    return html`
      <label class="${style + ' ' + (this.options.class || '')}">
        ${this.options.label}
        ${this._input}
      </label>
    `
  }
}
