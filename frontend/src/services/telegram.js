let telegramWebApp = null

export function initTelegramWebApp() {
  try {
    const webApp = window.Telegram && window.Telegram.WebApp
    if (webApp) {
      if (typeof webApp.ready === 'function') webApp.ready()
      telegramWebApp = webApp
      return true
    }
    telegramWebApp = {
      ready: function () {},
      close: function () {},
      expand: function () {},
      MainButton: { setText: function () {}, show: function () {}, hide: function () {} },
    }
    return false
  } catch (error) {
    console.error('Telegram Web App init failed', error)
    return false
  }
}

export function expandTelegramWebApp() {
  try {
    const webApp = getTelegramWebApp()
    if (webApp && typeof webApp.expand === 'function') webApp.expand()
  } catch (error) {
    console.error('Telegram Web App expand failed', error)
  }
}

export function getTelegramWebApp() {
  return telegramWebApp || (window.Telegram && window.Telegram.WebApp) || null
}

export function getInitData() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp.initData || null
    }
  } catch (error) {
    console.error('getInitData failed', error)
  }
  return null
}

export function getInitDataRaw() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp.initDataUnsafe || {}
    }
  } catch (error) {
    console.error('getInitDataRaw failed', error)
  }
  return {}
}

export function getStartParam() {
  try {
    const unsafe = getInitDataRaw()
    const params = new URLSearchParams(window.location.search || '')
    return unsafe.start_param || params.get('tgWebAppStartParam') || params.get('ref') || ''
  } catch (error) {
    return ''
  }
}
