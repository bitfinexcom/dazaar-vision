const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Button = require('./button')

const style = css`
  :host {
    display: grid;
    position: relative;
    grid-template-columns: 1fr 2fr;
    height: 100%;
  }

  :host .left {
    padding-left: 4rem;
  }
  :host main {
    background: rgba(245, 245, 246, 1);
  }
  :host .left .selected .text {
    font-weight: bold;
  }

  :host .left .bullet {
    margin-bottom: 3rem;
    color: #353248;
    font-family: "Open Sans";
    font-style: normal;
    font-weight: 300;
  }
  :host .bullet:last-child {
    margin-bottom: 0;
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
    background: #fff;
    display: inline-block;
    margin-right: 1rem;
    font-family: var(--font-support);
    letter-spacing: -.1em; /*anonymous font hack*/
    border: 1px solid #102542;
    width: 2.2rem;
    height: 2.2rem;
    line-height: 2.2rem;
    text-align: center;
    border-radius: 50%;
  }

  :host .left h3 {
    font-style: normal;
    font-weight: bold;
    line-height: 35px;
    letter-spacing: 0.02em;
    color: #353248;
    margin-bottom: 0px;
  }
  footer a {
    cursor: default;
    display: inline-block;
    cursor: default;
    text-decoration: none;
    font-family: Open Sans;
    font-style: normal;
    padding: 1rem 2rem;
    padding-left: 0;
    text-align: center;
    letter-spacing: 0.05em;
    font-weight: bold;
    color: #000;
    outline: none;
    user-select: none;
  }
  :host .configs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20ch, 1fr));
    align-items: flex-start;
    grid-gap: 1rem;
    margin-bottom: 1rem;
  }
  :host .back-arrow:before {
    content: ' ';
    transform: rotate(-45deg);
    display: inline-block;
    min-width: .5rem;
    min-height: .5rem;
    border-width: .2rem 0 0 .2rem;
    border-style: solid;
    margin-right: .5rem;
    margin-bottom: .15rem;
  }
`

module.exports = class Wizard extends Component {
  constructor (views, opts) {
    super()

    this.views = views
    this._headline = (opts && opts.title) || ''
    this._selected = 0
    this.selected = 0
    this._bullets = null
    this._view = null
    this._end = this.views.length
    this.oncancel = (opts && opts.oncancel) || noop
    this.ondone = (opts && opts.ondone) || noop

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
        <div class="p4 left">
          <div class="df align-center mb4">
          <svg
            style="height: 3rem; width: 3rem; margin-left: -.4rem; margin-right: 1rem;"
            viewBox="0 0 50 50">
            <use
              href="#emblem"
              style="--fill: url('#iris-gradient');"/>
          </svg>
          <h1 class="m0 p0 clip w-0 h-0">DAZAAR</h1>
          <svg
            style="height: 2rem;"
            title="Dazaar"
            viewBox="0 0 160 32">
            <use
              href="#logo-letters"
              fill="hsla(var(--hue), var(--accentS),var(--accentL),1)"
            />
          </svg>
        </div>
          <div class="bullets">
            ${bullets}
          </div>
        </div>
        <main class="relative df p4 columns">
          <header class="mb4">
            <h3 class="m0">${this._headline}</h3>
          </header>
          <div class="flex">
            ${this._view}
          </div>
          <footer class="df justify-between align-center bt1 b-spotlight b-solid pt2">
            <a class="back-arrow" href="javascript:void(0)" onclick=${this.back.bind(this)}>Back</a>
            ${this._nextBtn}
          </div>
        </main>
      </div>
    `
  }
}

function noop () { }
