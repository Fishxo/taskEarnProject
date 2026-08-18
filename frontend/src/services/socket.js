import { io } from 'socket.io-client'

let socket

export function getSocket() {
  if (socket) return socket
  try {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
  } catch (err) {
    console.error('Socket.IO init failed', err)
    socket = { on: function () {}, off: function () {} }
  }
  return socket
}
