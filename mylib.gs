function i18n (str) {
  return i18v[myLocale][str] || str
}

// ===== bot about
function identifyCmd (obj) {
  let cmd = 'none'
  if (Array.isArray(obj.entities) && obj.entities.length > 0) {
    // Have entities!
    const ent = obj.entities
    cmd = obj.text.substring(ent[0].offset, ent[0].length)
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

// ===== Telegram about
function _sendExec (endpoint, payload) {
  UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + TG_KEY + '/' + endpoint,
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
  let fb = FirebaseApp.getDatabaseByUrl(FB_URL, FB_KEY);
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
  let fb = FirebaseApp.getDatabaseByUrl(FB_URL, FB_KEY);
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