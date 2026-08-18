import { io } from 'socket.io-client'
import { isTelegramDesktop } from './telegram'

let socket

export function getSocket() {
  if (socket) return socket
  try {
    var transports = isTelegramDesktop() ? ['polling'] : ['polling', 'websocket']
    socket = io({
      path: '/socket.io',
      transports: transports,
      reconnection: true,
      timeout: 10000,
    })
  } catch (err) {
    console.error('Socket.IO init failed', err)
    socket = { on: function () {}, off: function () {} }
  }
  return socket
}
