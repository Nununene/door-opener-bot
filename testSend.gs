function testSendingMobileAPI() {
  const url = DEFAULT_API_URL
  const payload = {
    uid: 'user1',
    pwd: 'pwd1',
    action: 'ping'
  }
  try {
    result = UrlFetchApp.fetch(
      url,
      {
        "method": "post",
        'contentType': 'application/x-www-form-urlencoded',
        "payload": payload,
        muteHttpExceptions: true
      }
    )
    console.log(result.getContentText())
    Logger.log('HTTP Code: ' + result.getResponseCode());
    Logger.log('Response: ' + result.getContentText());
  } catch (ex) {
    console.log('EX')
    result = ex.toString()
  }
}

function testMobileAPI () {
  connectApi('ping', { url: 'some' })
}

function testSendingTgMessage() {
  var chatId = '12345678'
  var mystr = '歡迎使用開門機器人(*初號機*)，請先完成以下步驟...\n\
 *步驟1*(/open)\
';

  const payload = {
    chat_id: chatId,
    text: mystr,
    parse_mode: 'Markdown'
  }
  _sendExec('sendMessage', payload)
}

// var [endpoint, payload] = testRespondTg(obj);
// _sendExec(endpoint, payload);
function testRespondTg(obj){
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
    myMethod = 'sendMessage'
    payload = {
      "chat_id": chatId,
      "text": "Try other stuff"
    }
  }
  return [myMethod, payload];
}