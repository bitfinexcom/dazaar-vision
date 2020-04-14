const css = require('hui/css')
const html = require('hui/html')
const Component = require('hui')
const Select = require('./select')
const Button = require('./button')
const Input = require('./input')
const Wizard = require('./wizard')
const Search = require('@mafintosh/search-component')
const HyperIndex = require('hyperindex')
const replicator = require('@hyperswarm/replicator')
const nanoiterator = require('nanoiterator')
const { devices } = require('../lib/webm-broadcast-stream.js')
const path = require('path')

const DEFAULT_INDEX = Buffer.from('89507965a0b27063d4b6a1c5d0db7be3a71c4237a814dc8c3fcf43de4b81e04c', 'hex')

const style = css`
  :host input {
    grid-column: span 2;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="grey" d="M23.809 21.646l-6.205-6.205c1.167-1.605 1.857-3.579 1.857-5.711 0-5.365-4.365-9.73-9.731-9.73-5.365 0-9.73 4.365-9.73 9.73 0 5.366 4.365 9.73 9.73 9.73 2.034 0 3.923-.627 5.487-1.698l6.238 6.238 2.354-2.354zm-20.955-11.916c0-3.792 3.085-6.877 6.877-6.877s6.877 3.085 6.877 6.877-3.085 6.877-6.877 6.877c-3.793 0-6.877-3.085-6.877-6.877z"/></svg>') no-repeat;
    background-position: 1em center;
    background-size: 1em 90%;
    color: #353248;
    padding: .69em .69em .69em 2.69em;
    font-size: 100%;
    letter-spacing: 0.02em;
    outline: none;
    border-radius: 4px;
    border: 0.5px solid rgba(53, 50, 72, 0.1);
    background-color: white;
  }

  :host .result-item.selected .result-selected {
    opacity: 1;
  }

  :host .result-selected {
    opacity: 0;
    background-color: #EC375B;
    width: 18px;
    height: 18px;
    border-radius: 9px;
    margin: auto;
    margin-right: 10px;
  }

  :host .result-item {
    border-top: 1px rgba(53, 50, 72, 0.1) solid;
    display: flex;
    padding: .50em 0;
  }

  :host .result-item:hover {
    background-color: rgba(196, 196, 196, 0.3);
  }

  :host .stream-name {
    font-weight: bold;
    margin-right: 10px;
    max-width: 50%;
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
  }

  :host .stream-key {
    display: inline-block;
    max-width: 12ch;
    margin-right: 10px;
  }

  :host .stream-price {
    flex: auto;
    text-align: right;
    margin-right: 10px;
    white-space: nowrap;
  }

  :host .results {
    margin-top: 20px;
    max-height: calc(100vh - 470px);
    overflow-y: scroll;
  }
`

function streamToIterator (stream) {
  return nanoiterator({
    next (cb) {
      const data = stream.read()
      if (data) return cb(null, data)
      stream.once('readable', () => cb(null, stream.read()))
    }
  })
}

class SearchWizard extends Search {
  constructor (dataPath) {
    super({
      query (q) {
        if (!q) return
        if (/^[a-f0-9]{64}$/.test(q)) q = '{"id":"' + q + '"}'
        if (q[0] === '{') {
          let data
          try {
            data = JSON.parse(q)
          } catch (_) {}

          if (data && data.id) {
            let once = true
            return nanoiterator({
              next (cb) {
                if (once) {
                  once = false
                  return cb(null, data)
                }
                return cb(null, null)
              }
            })
          }
        }
        const words = q.split(/\s+/)
        return streamToIterator(self.idx.or(...words))
      },
      result (data) {
        let payment = 'Free'

        if (data.payment) {
          const first = data.payment[0] || data.payment
          payment = first.amount + ' ' + first.currency + ' per ' + first.interval + ' ' + first.unit
        }

        // only needed cause we generated the test data wrongly
        if (data.key && !data.id || typeof data.id === 'number') data.id = data.key

        return html`
          <div class="result-item" onclick=${onclick}>
            <span class="result-selected">
            </span>
            <span class="stream-name">
              ${data.description}
            </span>
            <span class="stream-key">
              ${data.id.slice(0, 6) + '...' + data.id.slice(-2)}
            </span>
            <span class="stream-price">
              ${payment}
            </span>
           </div>
        `

        function onclick () {
          if (self.selectedElement) self.selectedElement.classList.remove('selected')
          this.classList.add('selected')
          self.selectedElement = this
          self.value = data
        }
      }
    }, {
      class: style
    })

    const self = this

    this.value = null
    this.selectedElement = null
    this.swarm = null
    this.idx = new HyperIndex(path.join(dataPath, DEFAULT_INDEX.toString('hex')), DEFAULT_INDEX, {
      valueEncoding: 'json',
      alwaysUpdate: true,
      sparse: true
    })
  }

  onload () {
    this.swarm = replicator(this.idx.trie, {
      live: true,
      lookup: true,
      announce: false
    })
  }

  onunload () {
    this.swarm.destroy()
    this.swarm = null
    this.idx.trie.feed.close()
  }

  validate () {
    return !!this.value
  }
}

// class SelectStreamWizard extends Component {
//   constructor (list) {
//     super()
//     this.existing = []
//     this.select = new Select([['Paste new Dazaar card', null]], {
//       class: 'wide',
//       border: true,
//       onchange: this.onchange.bind(this)
//     })
//     if (list) {
//       list((err, list) => {
//         if (err) return
//         this.existing = list
//         this.update()
//       })
//     }
//   }

//   render () {
//     const list = [['Paste new Dazaar card', null]]
//     for (const e of this.existing) {
//       let n = e.description
//       n +=
//         (n ? ' (' : '') +
//         e.key.toString('hex').slice(0, 8) +
//         '...' +
//         e.key.toString('hex').slice(-4) +
//         (n ? ')' : '')
//       list.push(['Resume ' + n, e])
//     }
//     const s = new Select(list, {
//       class: 'wide',
//       border: true,
//       onchange: this.onchange.bind(this)
//     })
//     this.select.element.replaceWith(s.element)
//     this.select = s
//   }

//   onchange () {
//     const v = this.select.value
//     if (!v) return
//     const card = {
//       id: v.key.toString('hex'),
//       description: v.description || '',
//       payment: v.payment && [v.payment]
//     }
//     this.element.querySelector('textarea').value = JSON.stringify(card, null, 2)
//   }

//   validate () {
//     return !!this.value
//   }

//   get value () {
//     try {
//       const card = JSON.parse(this.element.querySelector('textarea').value)
//       if (!card.id) return null
//       return card
//     } catch (_) {
//       return null
//     }
//   }

//   createElement () {
//     return html`
//       <div>
//         <div class="configs">
//           ${this.select.element}
//           <div>
//             <textarea
//               autofocus
//               style="outline: none; border: 0.5px solid rgba(53, 50, 72, 0.1); display: block; border-radius: 4px; height: 200px;"
//               class="wide"
//             ></textarea>
//           </div>
//         </div>
//       </div>
//     `
//   }
// }

module.exports = class SubscribeWizard extends Wizard {
  constructor (opts = {}) {
    // const search = new SelectStreamWizard(opts.list)
    const search = new SearchWizard(opts.dataPath || '/tmp')

    super(
      [
        ['Search stream', search],
        ['View stream', null]
      ],
      {
        title: 'Start subscribing',
        ...opts
      }
    )
  }
}
