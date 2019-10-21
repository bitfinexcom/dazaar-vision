const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Select = require('./select')
const Button = require('./button')
const Input = require('./input')

const style = css`
  :host {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  :host .right {
    background: white;
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    left: 300px;
    padding-left: 60px;
  }

  :host .left {
    position: absolute;
    background: rgba(245, 245, 246, 1);
    top: 0;
    bottom: 0;
    left: 0;
    width: 300px;
  }

  :host .left .selected .text {
    font-weight: bold;
  }

  :host .left .bullet {
    margin-bottom: 40px;
    color: #353248;
    margin-left: 70px;
    font-family: "Open Sans" !important;
    font-style: normal;
    font-weight: 300;
    font-size: 14px;
    line-height: 26px;
  }

  :host .left .selected .dot {
    background: #E83D4A;
    border-color: #E83D4A;
    color: #FFFFFF;
  }

  :host .left .selected {
    font-weight: bold;
  }

  :host .left .dot {
    line-height: 24px;
    background: #fff;
    display: inline-block;
    margin-right: 10px;
    border: 0.5px solid #000;
    width: 24px;
    height: 24px;
    text-align: center;
    border-radius: 12px;
  }

  :host .left h1 {
    margin-left: 70px;
    margin-top: 60px;
    margin-bottom: 50px;
    font-weight: bold;
    font-style: normal;
    font-weight: normal;
    font-size: 30px;
    line-height: 70px;
    letter-spacing: 0.02em;
    color: #353248;
  }

  :host .left h3 {
    font-style: normal;
    font-weight: bold;
    font-size: 16px;
    line-height: 35px;
    letter-spacing: 0.02em;
    color: #353248;
    margin-bottom: 0px;
  }

  :host .title {
    margin-top: 90px;
    height: 70px;
  }

  :host .footer {
    position: absolute;
    left: 60px;
    right: 40px;
    border-top: 0.5px solid rgba(53, 50, 72, 0.5);
    bottom: 0;
    height: 80px;
  }

  .next-btn {
    position: absolute;
    right: 0px;
    margin-top: 10px;
  }

  .footer a {
    cursor: default;
    display: inline-block;
    margin-top: 10px;
    text-decoration: none;
    font-family: Open Sans;
    line-height: 18px;
    font-size: 14px;
    font-style: normal;
    padding: 10px 20px;
    padding-left: 0;
    text-align: center;
    letter-spacing: 0.02em;
    font-style: normal;
    color: #000;
    outline: none;
    user-select: none;
  }

  :host .configs input, :host .configs select {
    margin-right: 30px;
    margin-bottom: 30px;
    width: 160px;
  }

  :host .configs .wide {
    width: 350px;
  }
`

module.exports = class Wizard extends Component {
  constructor (views, opts) {
    super()

    this.views = views
    this._headline = opts && opts.title || ''
    this._selected = 0
    this.selected = 0
    this._bullets = null
    this._view = null
    this._end = this.views.length
    this.oncancel = opts && opts.oncancel || noop
    this.ondone = opts && opts.ondone || noop

    if (this.views[this._end - 1][1] === null) {
      this._end--
    }
  }

  get value () {
    const data = new Array(this._end)
    for (let i = 0; i < data.length; i++) {
      data[i] = this.views[i][1].value
    }
    return data
  }

  select (i) {
    if (i < 0) {
      this.oncancel()
    } else if (i >= this._end) {
      this.ondone()
    } else {
      this.selected = i
      this.update()
    }
  }

  render () {
    if (this._selected === this.selected) return

    for (let i = 0; i <= this.selected; i++) {
      this._bullets[i].classList.add('selected')
    }

    for (let i = this.selected + 1; i < this._bullets.length; i++) {
      this._bullets[i].classList.remove('selected')
    }

    this._selected = this.selected
    this._view.replaceWith(this.views[this.selected][1].element)
    this._view = this.views[this.selected][1].element

    if (this._selected + 1 === this._end) {
      this._nextBtn.innerText = this._headline
    } else {
      this._nextBtn.innerText = 'Next'
    }
  }

  back () {
    this.select(this.selected - 1)
  }

  next () {
    if (this.views[this.selected][1].validate()) {
      this.select(this.selected + 1)
    }
  }

  createElement () {
    const bullets = this._bullets = this.views.map(([name], i) => {
      return html`
        <div class="bullet">
          <div class="dot">${i + 1}</div>
          <span class="text">${name}</span>
        </div>
      `
    })

    bullets[this.selected].classList.add('selected')
    this._view = this.views[this.selected][1].element
    this._nextBtn = new Button(this.selected + 1 === this._end ? this._headline : 'Next', { class: 'next-btn', onclick: this.next.bind(this) }).element

    return html`
      <div class=${style}>
        <div class=left>
          <h1>DAZAAR</h1>
          <div class="bullets">
            ${bullets}
          </div>
        </div>
        <div class=right>
          <h3 class="title">${this._headline}</h3>
          <div style="position: absolute; top: 180px; left: 60px; right: 40px; bottom: 170px;">
            ${this._view}
          </div>
          <div class="footer">
            ${this._nextBtn}
            <a href="javascript:void(0)" onclick=${this.back.bind(this)}>${'< Back'}</a>
          </div>
        </div>
      </div>
    `
  }
}

function noop () {}
