const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const style = css`
  :host {
    font-family: Open Sans;
    font-weight: 600;
    font-style: normal;
    font-size: 1rem;
    padding: 1rem 2.5rem;
    text-align: center;
    letter-spacing: 0.05em;
    background-color: #EC375B;
    border-radius: 2.5rem;
    border: none;
    color: #ffffff;
    outline: none;
    transition: background-color 0.25s ease;
    user-select: none;
  }

  :host:hover {
    background-color: rgba(138, 70, 77, 1);
  }

  :host:disabled {
    background-color: rgba(237, 160, 173, 1);
    color: rgba(252, 241, 243, 1);
  }

  :host.border {
    border: 1px solid #EC375B;
    color: #EC375B;
    background: transparent;
  }

  :host.border:disabled {
    opacity: 0.5;
  }

  :host.border:hover {
    background-color: rgba(138, 70, 77, 0.1);
  }
`

module.exports = class Button extends Component {
  constructor (text, opts) {
    if (typeof opts === 'function') {
      onclick = opts
      opts = {}
    }

    if (!opts) opts = {}

    super()

    this.text = text || ''
    this.onclick = opts.onclick || noop
    this.border = !!opts.border
    this.class = opts.class
  }

  createElement () {
    return html`
      <button
        class="${style} ${this.border ? 'border' : ''} ${this.class || ''}"
        onclick=${this.onclick}
      >
        ${this.text}
      </button>
    `
  }
}

function noop () {}
