const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const style = css`
  :host {
    font-family: Open Sans;
    line-height: 18px;
    font-size: 14px;
    font-style: normal;
    padding: 10px 20px;
    text-align: center;
    letter-spacing: 0.02em;
    font-style: normal;
    background-color: #E83D4A;
    border-radius: 4px;
    border: none;
    color: #FFFFFF;
    outline: none;
    transition: background-color 0.25s ease;
    user-select: none;
  }

  :host:hover {
    background-color: rgba(138, 70, 77, 1);
  }

  :host:disabled {
    background-color: rgba(125, 124, 137, 1);
    color: rgba(53, 50, 72, 1);
  }

  :host.border {
    border: 2px solid #D34C50;
    background-color: #353248;
    line-height: 16px;
    color: #D34C50;
  }

  :host.border:disabled {
    background-color: rgba(53, 50, 72, 0.05);
    color: rgba(125, 124, 137, 1);
  }

  :host.border:hover {
    background-color: rgba(96, 61, 73, 1);
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
    return html`<button class="${style} ${this.border ? 'border' : ''} ${this.class || ''}" onclick=${this.onclick}>${this.text}</button>`
  }
}

function noop () {}
