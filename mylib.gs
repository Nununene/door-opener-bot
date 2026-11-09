function i18n (str) {
  return i18v[myLocale][str] || str
}

// ===== bot about
function identifyCmd (obj) {
  let cmd = 'none'
  if (obj && typeof obj.text === 'string' && Array.isArray(obj.entities)) {
    const ent = obj.entities.find(function (entity) {
      return entity && entity.type === 'bot_command'
        && Number.isInteger(entity.offset)
        && Number.isInteger(entity.length)
        && entity.offset >= 0
        && entity.length > 0
    })
    if (ent && ent.offset + ent.length <= obj.text.length) {
      cmd = obj.text.substring(ent.offset, ent.offset + ent.length)
    }
  }
  return cmd
}

function setState (stateVal, additionalVal = null) {
  let payload = {
    state: stateVal
  }
  if (additionalVal) {
    payload = {
      ...payload,
      ...additionalVal
    }
  }
  updateFBRecord(payload)
}

function getRequiredScriptProperty (propertyName) {
  let value
  try {
    value = PropertiesService.getScriptProperties().getProperty(propertyName)
  } catch (err) {
    const message = 'Unable to read Script Property: ' + propertyName
    Logger.log(message)
    throw new Error(message)
  }
  if (typeof value !== 'string' || value.trim() === '') {
    const message = 'Missing required Script Property: ' + propertyName
    Logger.log(message)
    throw new Error(message)
  }
  return value.trim()
}

function getBotConfig () {
  let properties
  let config
  try {
    properties = PropertiesService.getScriptProperties()
    config = {
      firebaseUrl: properties.getProperty('FIREBASE_URL'),
      firebaseKey: properties.getProperty('FIREBASE_KEY'),
      telegramBotToken: properties.getProperty('TELEGRAM_BOT_TOKEN')
    }
  } catch (err) {
    Logger.log('Unable to read required Script Properties.')
    throw new Error('Unable to read required Script Properties.')
  }
  const propertyNames = {
    firebaseUrl: 'FIREBASE_URL',
    firebaseKey: 'FIREBASE_KEY',
    telegramBotToken: 'TELEGRAM_BOT_TOKEN'
  }
  const missing = Object.keys(config).filter(function (key) {
    return typeof config[key] !== 'string' || config[key].trim() === ''
  }).map(function (key) {
    return propertyNames[key]
  })
  if (missing.length > 0) {
    const message = 'Missing required Script Properties: ' + missing.join(', ')
    Logger.log(message)
    throw new Error(message)
  }
  return {
    firebaseUrl: config.firebaseUrl.trim(),
    firebaseKey: config.firebaseKey.trim(),
    telegramBotToken: config.telegramBotToken.trim()
  }
}

function claimTelegramUpdate (updateId) {
  const lock = LockService.getScriptLock()
  lock.waitLock(5000)
  try {
    const properties = PropertiesService.getScriptProperties()
    const propertyName = 'PROCESSED_UPDATE_IDS'
    const now = Date.now()
    const retentionMs = 24 * 60 * 60 * 1000
    const maxEntries = 100
    let records = []
    const storedValue = properties.getProperty(propertyName)

    if (storedValue) {
      try {
        records = JSON.parse(storedValue)
        if (!Array.isArray(records)) records = []
      } catch (err) {
        Logger.log('Invalid update de-duplication state; starting a fresh history.')
        records = []
      }
    }

    records = records.filter(function (record) {
      return record
        && typeof record.id === 'string'
        && Number.isFinite(record.timestamp)
        && now - record.timestamp < retentionMs
    }).slice(-maxEntries)

    const id = String(updateId)
    if (records.some(function (record) { return record.id === id })) {
      properties.setProperty(propertyName, JSON.stringify(records))
      return false
    }

    records.push({ id: id, timestamp: now })
    if (records.length > maxEntries) records.shift()
    properties.setProperty(propertyName, JSON.stringify(records))
    return true
  } finally {
    lock.releaseLock()
  }
}

// ===== Telegram about
function _sendExec (endpoint, payload) {
  UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + getRequiredScriptProperty('TELEGRAM_BOT_TOKEN') + '/' + endpoint,
    {
      "method": "post",
      "payload": payload
    }
  )
}

function stickerRand (stickerType) {
  const defaultUnknownSticker = 'CAACAgUAAxkBAAIsDV5ZwpW2hthSmLo1KX30OsQwqRDzAAIaAAOfLyUkW4xidD5fX-IYBA'
  if (stickers[stickerType]) {
    return stickers[stickerType][Math.floor(Math.random() * stickers[stickerType].length)]
  } else {
    return defaultUnknownSticker
  }
}

// ===== Firebase about
function getFBRecord () {
  let fb = FirebaseApp.getDatabaseByUrl(
    getRequiredScriptProperty('FIREBASE_URL'),
    getRequiredScriptProperty('FIREBASE_KEY')
  )
  let myuser = fb.getData('bot1/' + userObj.uid);
  if (myuser) {
    if (myuser.tgname != userObj.fname) {
      updateFBRecord({ tgname: userObj.fname })
    }
    return myuser
  } else {
    fb.setData(
      'bot1/' + userObj.uid,
      {
        tgid: userObj.uid,
        tgname: userObj.fname,
        uname: '',
        upw: '',
        url: '',
        state: ''
      }
    )
    return false
  }
}

function updateFBRecord (val) {
  let fb = FirebaseApp.getDatabaseByUrl(
    getRequiredScriptProperty('FIREBASE_URL'),
    getRequiredScriptProperty('FIREBASE_KEY')
  )
  fb.updateData('bot1/' + userObj.uid, val);
}

// ===== mobileAPI.php about
function connectApi (cmd, uData) {
  let result = {}
  const url = uData.url || DEFAULT_API_URL
  const payload = {
    uid: uData.uname,
    pwd: uData.upw,
    action: cmd
  }

  try {
    result = UrlFetchApp.fetch(
      url,
      {
        "method": "post",
        'contentType': 'application/x-www-form-urlencoded',
        "payload": payload
      }
    )
  } catch (ex) {
    result = ex.toString()
  }
  return result.toString()
}
