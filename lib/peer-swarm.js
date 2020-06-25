module.exports = function (feed) {
  return require('@hyperswarm/replicator')(feed, {
    live: true,
    lookup: true,
    announce: true,
    onstream (protocol, info) {
      protocol.on('handshake', function () {
        info.deduplicate(protocol.publicKey, protocol.remotePublicKey)
      })
    }
  })
}
