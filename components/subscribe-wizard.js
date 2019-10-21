const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Select = require('./select')
const Button = require('./button')
const Input = require('./input')
const Wizard = require('./wizard')
const { devices } = require('../lib/webm-broadcast-stream.js')

class SelectStreamWizard extends Component {
  constructor (list) {
    super()
    this.existing = []
    this.select = new Select([['Paste new Dazaar card', null]], { class: 'wide', onchange: this.onchange.bind(this) })
    if (list) {
      list((err, list) => {
        if (err) return
        this.existing = list
        this.update()
      })
    }
  }

  render () {
    const list = [['Paste new Dazaar card', null]]
    for (const e of this.existing) {
      let n = e.description
      n += (n ? ' (' : '') + e.key.toString('hex').slice(0, 8) + '...' + e.key.toString('hex').slice(-4) + (n ? ')' : '')
      list.push(['Resume ' + n, e])
    }
    const s = new Select(list, { class: 'wide', onchange: this.onchange.bind(this) })
    this.select.element.replaceWith(s.element)
    this.select = s
  }

  onchange () {
    const v = this.select.value
    const card = {
      id: v.key.toString('hex'),
      description: v.description || "",
      payment: v.payment && [v.payment],
    }
    this.element.querySelector('textarea').value = JSON.stringify(card, null, 2)
  }

  validate () {
    return !!this.value
  }

  get value () {
    try {
      const card = JSON.parse(this.element.querySelector('textarea').value)
      if (!card.id) return null
      return card
    } catch (_) {
      return null
    }
  }

  createElement () {
    return html`
      <div>
        <div class="configs">
          ${this.select.element}
          <textarea autofocus style="outline: none; border: 0.5px solid rgba(53, 50, 72, 0.5); display: block; border-radius: 4px; height: 200px;" class=wide></textarea>
        </div>
      </div>
    `
  }
}

module.exports = class SubscribeWizard extends Wizard {
  constructor (opts = {}) {
    const s = new SelectStreamWizard(opts.list)
    super([
      ['Paste Dazaar card', s],
      ['View stream', null]
    ], {
      title: 'Start subscribing',
      ...opts
    })
  }
}
