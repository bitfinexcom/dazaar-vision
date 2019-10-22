const { ipcMain } = require('electron')

// Scatter is being iffy in the electron process to lets run it in main instead
const Scatter = require('dazaar-scatter-pay')

const cache = new Map()

ipcMain.on('scatter', (event, data) => {
  const pay = cache.get(data.seller) || new Scatter(data.payment, Buffer.from(data.seller, 'hex'))
  cache.set(data.seller, pay)
  if (!pay.supported.length) return event.sender.send('scatter-reply', { id: data.id, error: 'Unsupported payment' })

  pay.supported[0].buy(Buffer.from(data.buyer, 'hex'), data.amount, function (err) {
    if (err) return event.sender.send('scatter-reply', { id: data.id, error: err.message })
    event.sender.send('scatter-reply', { id: data.id })
  })
})

process.on('unhandledRejection', function (err) {
  console.error('Unhandled rejection', err)
  cache.clear()
})
