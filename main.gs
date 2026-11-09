let userObj = {}

function doPost (e) {
  const parsed = parseTelegramUpdate(e)
  if (!parsed.ok) {
    Logger.log('Invalid Telegram update: ' + parsed.reason)
    if (parsed.chatId) {
      try {
        sendMessageToChat(parsed.chatId, i18n('invalidMessageFormat'))
      } catch (err) {
        Logger.log('Unable to send format error to Telegram: ' + err.message)
      }
    }
    return webhookResponse()
  }

  const obj = parsed.update
  try {
    getBotConfig()
  } catch (err) {
    try {
      sendMessageToChat(obj.message.chat.id, i18n('invalidBotConfig'))
    } catch (sendErr) {
      Logger.log('Unable to send configuration error to Telegram: ' + sendErr.message)
    }
    return webhookResponse()
  }

  let isNewUpdate
  try {
    isNewUpdate = claimTelegramUpdate(obj.update_id)
  } catch (err) {
    Logger.log('Unable to record Telegram update id: ' + err.message)
    return webhookResponse()
  }
  if (!isNewUpdate) {
    Logger.log('Duplicate Telegram update ignored: ' + obj.update_id)
    return webhookResponse()
  }

  userObj = {
    uid: obj.message.from.id,
    cid: obj.message.chat.id,
    fname: obj.message.from.first_name || '',
    uname: obj.message.from.username || ''
  }
  const cmd = identifyCmd(obj.message)
  const uData = getFBRecord()
  if (uData) {
    switch (uData.state) {
      case 'settingName':
        if (cmd === '/cancel') {
          setState('')
          sendMessage(i18n('cancelLastOperation'))
        } else if (typeof obj.message.text !== 'string') {
          sendMessage(i18n('invalidMessageFormat'))
        } else {
          setState('', { uname: obj.message.text })
          sendMessage(i18n('nameSetDone'))
        }
        break
      case 'settingPwd':
        if (cmd === '/cancel') {
          setState('')
          sendMessage(i18n('cancelLastOperation'))
        } else if (typeof obj.message.text !== 'string') {
          sendMessage(i18n('invalidMessageFormat'))
        } else {
          setState('', { upw: obj.message.text })
          sendMessage(i18n('pwdSetDone'))
        }
        break
      case 'settingUrl':
        if (cmd === '/cancel') {
          setState('')
          sendMessage(i18n('cancelLastOperation'))
        } else if (typeof obj.message.text !== 'string') {
          sendMessage(i18n('invalidMessageFormat'))
        } else {
          const newUrl = (obj.message.text == 'none') ? '' : obj.message.text
          setState('', { url: newUrl })
          sendMessage(i18n('urlSetDone'))
        }
        break
      default:
        if (cmd !== 'none') {
          executeCmd(cmd, uData, obj)
        } else {
          autoResponse(obj)
        }
        break
    }
  } else {
    sendMessage(i18n('newuser'))
    sendSticker(stickerRand('welcome'))
    sendMessage(i18n('welcomeInfo'))
  }
  return webhookResponse()
}

function parseTelegramUpdate (e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') {
    return { ok: false, reason: 'Missing request body' }
  }
  if (e.postData.type && !/^application\/json(?:\s*;|$)/i.test(e.postData.type)) {
    return { ok: false, reason: 'Unexpected content type' }
  }

  let update
  try {
    update = JSON.parse(e.postData.contents)
  } catch (err) {
    return { ok: false, reason: 'Malformed JSON' }
  }
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    return { ok: false, reason: 'Update must be a JSON object' }
  }

  const message = update.message
  const chatId = getChatIdForError(update)
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return { ok: false, reason: 'Update does not contain a message', chatId: chatId }
  }
  if (!message.chat || !isTelegramId(message.chat.id)) {
    return { ok: false, reason: 'Message has no valid chat id', chatId: chatId }
  }
  if (!message.from || !isTelegramId(message.from.id)) {
    return { ok: false, reason: 'Message has no valid sender id', chatId: message.chat.id }
  }
  if (message.text !== undefined && typeof message.text !== 'string') {
    return { ok: false, reason: 'Message text must be a string', chatId: message.chat.id }
  }
  if (message.entities !== undefined && !Array.isArray(message.entities)) {
    return { ok: false, reason: 'Message entities must be an array', chatId: message.chat.id }
  }
  if (!Number.isInteger(update.update_id) || update.update_id < 0) {
    return { ok: false, reason: 'Update has no valid update_id', chatId: message.chat.id }
  }

  return { ok: true, update: update }
}

function isTelegramId (value) {
  return (typeof value === 'number' && Number.isFinite(value))
    || (typeof value === 'string' && /^-?\d+$/.test(value.trim()))
}

function getChatIdForError (update) {
  const message = update.message
    || update.edited_message
    || update.channel_post
    || update.edited_channel_post
    || (update.callback_query && update.callback_query.message)
  return message && message.chat && isTelegramId(message.chat.id)
    ? message.chat.id
    : null
}

function webhookResponse () {
  return HtmlService.createHtmlOutput('OK')
}

function sendMessage (msg) {
  sendMessageToChat(userObj.cid, msg)
}

function sendMessageToChat (chatId, msg) {
  _sendExec('sendMessage', {
    chat_id: String(chatId),
    text: msg,
    parse_mode: 'Markdown'
  })
}

function sendSticker (sid) {
  _sendExec(
    'sendSticker',
    {
      chat_id: userObj.cid + '',
      sticker: sid
    }
  )
}

function sendPhoto (pid) {
  _sendExec(
    'sendPhoto',
    {
      chat_id: userObj.cid + '',
      photo: pid
    }
  )
}

function executeCmd (cmd, uData, obj) {
  switch(cmd) {
    case '/start':
    case '/help':
      sendMessage(i18n('welcomeInfo'))
      break;
    case '/setname':
      setState('settingName')
      sendMessage(i18n('nameSetting'))
      break;
    case '/setpassword':
      setState('settingPwd')
      sendMessage(i18n('pwdSetting'))
      break;
    case '/seturl':
      setState('settingUrl')
      sendMessage(i18n('urlSetting'))
      break;
    case '/stat':
      executeStat(uData)
      break;
    case '/open':
      executeOpen(uData)
      break;
    case '/ping':
      executePing(uData)
      break;
    default:
      sendSticker(stickerRand('huh'))
      sendMessage(i18n('unknownCmd') + cmd)
      break;
  }
}

function executePing (uData) {
  sendMessage(i18n('doingPing'))

  let result = connectApi('ping', uData)
  if (result) {
    result = result.toString()
    if (result === '1') {
      sendMessage(i18n('pingOK'))
    } else if (REMOTE_RESULT[result]) {
      sendSticker(stickerRand('ohno'))
      sendMessage(i18n('pingFail') + result + '(' + i18n('errorCode' + result) + ')')
    } else {
      sendSticker(stickerRand('ohno'))
      sendMessage(i18n('pingFail') + result)
    }
  }
}

function executeOpen (uData) {
  sendMessage(i18n('doingOpen'))

  let result = connectApi('open', uData)
  if (result) {
    result = result.toString()
    if (result === '1') {
      sendMessage(i18n('openOK'))
    } else if (REMOTE_RESULT[result]) {
      sendSticker(stickerRand('ohno'))
      sendMessage(i18n('openFail') + result + '(' + i18n('errorCode' + result) + ')')
    } else {
      sendSticker(stickerRand('ohno'))
      sendMessage(i18n('openFail') + result)
    }
  }
}

function executeStat (uData) {
  const unameStat = uData.uname !== ''
  const upwStat = uData.upw !== ''
  const urlStat = uData.url === ''
  let response = ''
  response += (unameStat) ? i18n('nameSet') : i18n('nameUnset')
  response += '\n'
  response += (upwStat) ? i18n('pwSet') : i18n('pwUnset')
  response += '\n'
  response += (urlStat) ? i18n('urlDefault') : i18n('urlSpec')
  sendMessage(i18n('userStatIs') + '\n\n' + response)
}

function autoResponse (obj){
  let myMethod = 'sendMessage'
  let chatId = obj.message.chat.id + ''
  let payload = {}
  if (obj.message.text){
    myMethod = 'sendMessage'
    payload = {
      "chat_id": chatId,
      "text": obj.message.text,
    }
  } else if (obj.message.sticker){
    myMethod = 'sendSticker'
    payload = {
      "chat_id": chatId,
      "sticker": obj.message.sticker.file_id
    }
  } else if (obj.message.photo){
    myMethod = 'sendPhoto'
    var array = obj.message.photo;
    var text = array[1];
    payload = {
      "chat_id": chatId,
      "photo": text.file_id
    }
  } else {
    myMethod = 'sendPhoto'
    payload = {
      "chat_id": chatId,
      "photo": 'AgACAgUAAxkBAAICJV5cg__jj2Vm2qgzavnuAAEww-F36wACjqkxG2-46FbZhMv76vzlVE_yamp0AAMBAAMCAANtAAOg6gACGAQ'
    }
  }
  _sendExec(myMethod, payload)
}
