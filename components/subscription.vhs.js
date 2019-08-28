const vhs = require('vhs-tape')
const Subscription = require('./subscription')
const ChooseSubscription = require('./choose-subscription')

vhs('basic', function (t) {
  const dazaar = require('dazaar')(require('random-access-memory'))

  const choose = new ChooseSubscription(dazaar, function onchoose (key) {
    const sub = new Subscription(dazaar, key, function () {
      sub.element.replaceWith(choose.element)
      console.log('stopped')
    })
    choose.element.replaceWith(sub.element)
  })

  t.element.appendChild(choose.element)

  return new Promise(() => {})
})
