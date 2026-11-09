let userObj = {}

function doPost (e) {
  if(e && e.postData && e.postData.type == "application/json") {
    var obj = JSON.parse(e.postData.contents);
    userObj = {
      uid: obj.message.from.id,
      cid: obj.message.chat.id,
      fname: obj.message.from.first_name,
      uname: obj.message.from.username
    }
    let cmd = identifyCmd(obj.message)
    let uData = getFBRecord();
    if (uData) {
      switch (uData.state) {
        case 'settingName':
          if (cmd === '/cancel') {
            setState('')
            sendMessage(i18n('cancelLastOperation'))
          } else {
            setState('', { uname: obj.message.text })
            sendMessage(i18n('nameSetDone'))
          }
          break;
        case 'settingPwd':
          if (cmd === '/cancel') {
            setState('')
            sendMessage(i18n('cancelLastOperation'))
          } else {
            setState('', { upw: obj.message.text })
            sendMessage(i18n('pwdSetDone'))
          }
          break;
        case 'settingUrl':
          if (cmd === '/cancel') {
            setState('')
            sendMessage(i18n('cancelLastOperation'))
          } else {
            const newUrl = (obj.message.text == 'none')
              ? ''
              : obj.message.text
            setState('', { url: newUrl })
            sendMessage(i18n('urlSetDone'))
          }
          break;
        default:
          // check if command
          if (cmd !== 'none') {
            // Command mode
            executeCmd(cmd, uData, obj);
          } else {
            // sendMessage(i18n('welcomeBack') + '\n' + obj.message.from.first_name)
            autoResponse(obj)
          }
          break;
      }
    } else {
      sendMessage(i18n('newuser'))
      sendSticker(stickerRand('welcome'))
      sendMessage(i18n('welcomeInfo'))
    }
    return true
  } else {
    Logger.log('Data format error, not JSON');
    return false
  }
}

function sendMessage (msg) {
  _sendExec(
    'sendMessage',
    {
      chat_id: userObj.cid + '',
      text: msg,
      parse_mode: 'Markdown'
    }
  )
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