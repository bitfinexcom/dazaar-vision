const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const style = css`
  :host {
    color: #fff;
    letter-spacing: 0.02em;
    outline: none;
    font-size: 100%;
    background-color: #e83d4a;
    border: none;
    border-radius: 4px;
    -webkit-appearance: none;
    background-image: url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2212%22%20height%3D%227%22%20viewBox%3D%220%200%2012%207%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0.999999%201L6%206L11%201%22%20stroke%3D%22%23102542%22%2F%3E%3C%2Fsvg%3E');
    background-repeat: no-repeat;
    background-position: calc(100% - 10px) 50%;
    padding-right: 35px;
  }

  :host.border[disabled] {
    border: 0.5px solid rgba(53, 50, 72, 0.5);
    border-color: rgb(235, 235, 228);
    color: rgb(84, 84, 84);
  }

  :host.border {
    color: #353248;
    background-color: white;
    border: 0.5px solid rgba(53, 50, 72, 0.1);
  }

  :host.error {
    border: 0.5px solid #e83d4a;
  }
`

module.exports = class Select extends Component {
  constructor (entries, opts) {
    super()
    this.entries = entries
    this.options = opts || {}
  }

  get selectedIndex () {
    return this.options.placeholder
      ? this.element.selectedIndex - 1
      : this.element.selectedIndex
  }

  set error (val) {
    if (val) this.element.classList.add('error')
    else this.element.classList.remove('error')
  }

  get value () {
    const i = this.selectedIndex
    return i === -1 ? null : this.entries[i][1]
  }

  set value (val) {
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i]
      if (e[1] === val) {
        if (this.options.placeholder) i++
        this.element.selectedIndex = i
        return
      }
    }
  }

  createElement () {
    const opts = []
    if (this.options.placeholder) {
      opts.push(
        html`
          <option value="" disabled selected
            >${this.options.placeholder}</option
          >
        `
      )
    }
    for (let i = 0; i < this.entries.length; i++) {
      opts.push(
        html`
          <option value="${i}">${this.entries[i][0]}</option>
        `
      )
    }
    const onchange = this.options.onchange || noop
    const el = html`
      <select
        onchange=${onchange}
        class="p2 ${style +
          ' ' +
          (this.options.class || '') +
          ' ' +
          (this.options.border ? 'border' : '')}"
        >${opts}</select
      >
    `
    if (this.options.disabled) el.setAttribute('disabled', 'disabled')
    return el
  }
}

function noop () {}
