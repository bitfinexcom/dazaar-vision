const Component = require('hui')
const html = require('hui/html')
const css = require('hui/css')

const ChooseSubscription = require('./components/choose-subscription')
const Subscription = require('./components/subscription')
const ConfigureBroadcast = require('./components/configure-broadcast')
const Broadcast = require('./components/broadcast')

const mainCls = css`
  :host {
    padding: 10px;
  }

  :host button {
    margin-right: 10px;
    font-size: 20px;
    padding: 20px !important;
  }
`

class Main extends Component {
  constructor ({ onbroadcast, onsubscribe }) {
    super()
    this.onsubscribe = onsubscribe
    this.onbroadcast = onbroadcast
  }

  createElement () {
    return html`<div class="${mainCls}">
      <h1>Welcome to Dazaar vision</h1>
      <button onclick=${this.onbroadcast.bind(this)}>Start broadcasting</button>
      <button onclick=${this.onsubscribe.bind(this)}>Subscribe to a stream</button>
    </div>`
  }
}

const main = new Main({
  onbroadcast () {
    const choose = new ConfigureBroadcast(dazaar, function (feed, options) {
      const b = new Broadcast(dazaar, feed, options, function () {
        b.element.replaceWith(main.element)
      })

      choose.element.replaceWith(b.element)
    })

    main.element.replaceWith(choose.element)
  },
  onsubscribe () {
    const choose = new ChooseSubscription(dazaar, function onchoose (key) {
      const sub = new Subscription(dazaar, key, function () {
        sub.element.replaceWith(main.element)
      })
      choose.element.replaceWith(sub.element)
    })

    main.element.replaceWith(choose.element)
  }
})

const dazaar = require('dazaar')('dazaar-vision-data')

const cls = css`
  html, body {
    padding: 0;
    margin: 0;
  }

  :host, :host input {
    font-family: monospace;
  }

  :host input {
    border: none;
    padding: 5px;
    outline: none;
  }

  :host {
    font-weight: bold;
  }

  :host button {
    margin-top: 10px;
    font-family: monospace;
    padding: 5px;
    background-color: gray;
    color: white;
    font-weight: bold;
    outline: none;
  }
`

document.body.className = cls
document.body.appendChild(main.element)
