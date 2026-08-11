let telegramWebApp = null

export function initTelegramWebApp() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand?.()
      telegramWebApp = window.Telegram.WebApp
      return true
    }
    telegramWebApp = {
      ready: () => {},
      close: () => {},
      expand: () => {},
      MainButton: { setText: () => {}, show: () => {}, hide: () => {} },
    }
    return false
  } catch (error) {
    console.error('Telegram Web App init failed', error)
    return false
  }
}

export function getTelegramWebApp() {
  return telegramWebApp || (window.Telegram && window.Telegram.WebApp) || null
}

export function getInitData() {
  if (window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp.initData || null
  }
  return null
}

export function getInitDataRaw() {
  if (window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp.initDataUnsafe || {}
  }
  return {}
}
