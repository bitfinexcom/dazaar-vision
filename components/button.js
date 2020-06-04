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
    background-color: #E91640;
  }

  :host:disabled {
    background-color: rgba(236, 55, 91, 0.5);
  }

  :host.border {
    border: 1px solid #EC375B;
    color: #EC375B;
    background: transparent;
  }

  :host.border:hover {
    border: 1px solid #E91640;
    color: #E91640;
    background: transparent;
  }

  :host.border-dark {
    border: 1px solid #fff;
    color: #fff;
    background: transparent;
  }

  :host.border-dark:disabled {
    border: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 0.5);
  }
`

module.exports = class Button extends Component {
  constructor (text, opts) {
    if (typeof opts === 'function') {
      opts = { onclick: opts }
    }

    if (!opts) opts = {}

    super()

    this.text = text || ''
    this.onclick = opts.onclick || noop
    this.border = !!opts.border
    this.dark = !!opts.dark
    this.class = opts.class
  }

  createElement () {
    return html`
      <button
        class="${style} ${this.border ? (this.dark ? 'border-dark' : 'border') : ''} ${this.class || ''}"
        onclick=${this.onclick}
      >
        ${this.text}
      </button>
    `
  }
}

function noop () {}
