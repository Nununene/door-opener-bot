const DEFAULT_API_URL = 'https://myurl.example.com/mobileAPI.php'  // mobileAPI.php URL
const MY_TG_ID = '@my_telegram_id' // Your Telegram ID for the link
let myLocale = 'zh_TW'

const REMOTE_RESULT = {
  '1': 'OK',
  '2': 'Account/Password fail',
  '3': 'Action denied',
  '4': 'Argument fail'
}

const i18v = {
  'zh_TW': {
    'nameSetting': '請輸入帳號，輸入 /cancel 取消設定',
    'nameSetDone': '帳號設定完成',
    'pwdSetting': '請輸入密碼，輸入 /cancel 取消設定',
    'pwdSetDone': '密碼設定完成\n\n為了您的資料安全，建議設定完畢後清除聊天記錄',
    'urlSetting': '請輸入主機位置，需包含完整位置，如 http://www.example.com/endpoint.php ，\n輸入 *none* 恢復預設位置，輸入 /cancel 取消設定',
    'urlSetDone': '主機位置設定完成',
    'welcomeInfo': '歡迎使用開門機器人(初號機)，請先完成以下步驟...\n\n\
  # 設定帳號 (/setname)\n\
  # 設定密碼 (/setpassword)\n\
  # 測試連線 (/ping)\n\n\
以上都設定完成後，即可使用開門指令(/open)\n\n\
本機器人需要搭配遠端開門主機的權限設定，需要進一步資訊請聯絡 ' + MY_TG_ID,
    'welcomeBack': '歡迎回來!',
    'newuser': '新的使用者... 設定初始化中',
    'doingPing': '連線測試中',
    'pingOK': '連線測試成功',
    'pingFail': '連線測試失敗，錯誤碼：',
    'doingOpen': '開門指令送出',
    'openOK': '送出成功',
    'openFail': '開門指令失敗，錯誤碼：',
    'unknownCmd': '不明指令：',
    'nameSet': '帳號已設定',
    'nameUnset': '帳號未設定',
    'pwSet': '密碼已設定',
    'pwUnset': '密碼未設定',
    'urlDefault': '預設主機位置',
    'urlSpec': '自定主機位置',
    'userStatIs': '使用者狀況如下',
    'cancelLastOperation': '動作取消',
    'invalidMessageFormat': '訊息格式錯誤',
    'invalidBotConfig': '機器人參數錯誤',
    'errorCode2': '帳號密碼錯誤',
    'errorCode3': '權限不足',
    'errorCode4': '參數錯誤'
  },
  'en': {
    'nameSetting': 'Setting username(id), please input username. Input /cancel to cancel setting.',
    'nameSetDone': 'Username set.',
    'pwdSetting': 'Setting password... please input password. Input /cancel to cancel setting.',
    'pwdSetDone': 'Password set.\n\nFor your data security, clear chat history is suggested.',
    'urlSetting': 'Setting URL... please input new URL, e.g. https://www.example.com/endpoint.php. \n\nInput *none* for default URL. Input /cancel to cancel setting.',
    'urlSetDone': 'Server URL set.',
    'welcomeInfo': 'Welcome, I am door opener bot, please follow these procedures\n\n\
  # Set your account name with /setname\n\
  # Set password with /setpassword\n\
  # Test connection by /ping\n\n\
when all done, open door by /open command.\n\n\
This robot need work with remote API to opening doors, for further information, please contect ' + MY_TG_ID,
    'welcomeBack': 'Welcome back,',
    'newuser': 'New user detected.',
    'doingPing': 'Doing ping',
    'pingOK': 'Ping response successfully',
    'pingFail': 'Ping response failed, error code: ',
    'doingOpen': 'Open command sending',
    'openOK': 'Send successfully',
    'openFail': 'Open command filed, error code: ',
    'unknownCmd': 'Unknown command: ',
    'nameSet': 'Account set',
    'nameUnset': 'Account not set',
    'pwSet': 'Password set',
    'pwUnset': 'Password not set',
    'urlDefault': 'Using default server address',
    'urlSpec': 'User defined server address',
    'userStatIs': 'User status is',
    'cancelLastOperation': 'Last command canceled',
    'invalidMessageFormat': 'Invalid message format.',
    'invalidBotConfig': 'Bot configuration error.',
    'errorCode2': 'Account or Password error.',
    'errorCode3': 'Action denied.',
    'errorCode4': 'Argument error.'
  },
  'ja': {
  }
}

const stickers = {
  huh: [
    'CAACAgUAAxkBAAIBaV5ZvE4j1wwN-EZmFuPJgZleagtGAALKAwACjkcEDqe5r9ODoz34GAQ',
    'CAACAgUAAxkBAAIBal5ZvI5L2aL96wRKBsrgqrsTalF0AALCAwACjkcEDr3_kB7m4ipQGAQ',
    'CAACAgUAAxkBAAIr415ZvSbaK0xjh0u45p7aTAw6_gKVAALDAwACjkcEDp1F5ZHNZnKbGAQ',
    'CAACAgUAAxkBAAIr5V5ZvTJO-An8bYaxx3YTwQABPBR-hQACxAMAAo5HBA5XSWVkzg85UhgE',
    'CAACAgUAAxkBAAIr515ZvUBOmlkm6pYlIW_431n4ljNOAALFAwACjkcEDvXke0MwM-lCGAQ',
    'CAACAgUAAxkBAAIr6V5Zvm6d3v69enuKNRAJ4sFNV_yuAALJAwACjkcEDggRGNfZu46MGAQ',
    'CAACAgUAAxkBAAIr815ZwHv7rbDtK1zjr0J10ZxKaGNQAAIiAAOfLyUk-owVrws73J8YBA',
    'CAACAgQAAxkBAAIsEV5ZxJ3ubCXkhk9_lxK8bkIc30a9AAIBAQACPbBZBgUc07yWPKS3GAQ',
    'CAACAgIAAxkBAAIsL15Zx6CEBvDZfvIuGs9noQureqJCAAKLSgAC4KOCBzUYjW-VB8SyGAQ',
    'CAACAgQAAxkBAAIsM15ZyTxc0XouQWduDCpFq-omAAGFCgACNAEAAj2wWQaxpVeDIbyk_BgE',
    'CAACAgQAAxkBAAIsNV5ZyVdejGsFAAFF7ePZcDMGpu2miAACBAEAAj2wWQYWWb7tHC80URgE'
  ],
  welcome: [
    'CAACAgQAAxkBAAIsF15ZxSBZ1nNrdPJFPqcOCyMP14QWAAL9AAM9sFkGNfqf_rCLZ50YBA',
    'CAACAgQAAxkBAAIr915ZwL-7aP1SUGHk-xFznJdQ6DsFAAIFAQACPbBZBm_XObaUXGcXGAQ',
    'CAACAgQAAxkBAAIr-V5ZwNppGT4ZrUlVUcFGHklQQ3ntAAL5AAM9sFkGtFXbbmSH94sYBA',
    'CAACAgQAAxkBAAIsGV5ZxUERf78tnyftV2_PWtHEz8meAAJFAQACPbBZBlK6kM8Y-Hq6GAQ',
    'CAACAgEAAxkBAAIsK15ZxmgCUnI6n6yHVpyCTvsEzddTAAIpAwACtw3tAAHVk4kWYIIZYBgE'
  ],
  ohno: [
    'CAACAgIAAxkBAAIsAV5ZwVmd4-LDo33lSQc74Ch8wNZrAAJRAQACwRieC6iS7wxj_hDLGAQ',
    'CAACAgIAAxkBAAIsA15ZwWst8PhJPGeUvIROrtvdbIw-AALCBwACwRieC45ft7Au17ucGAQ',
    'CAACAgUAAxkBAAIsB15ZwYvIephZBFhuPie509Yyk92RAAIOAAOfLyUkXmysBsvsRrgYBA',
    'CAACAgQAAxkBAAIsCV5ZwcqoojNvBF4BAfaB6BXoqKKhAAKEAQACPbBZBt6yDU8KNdkuGAQ',
    'CAACAgQAAxkBAAIsC15ZweY1ng3FG59wiSGNHncrB6x-AAK-AQACPbBZBoEG2jOQ6o_YGAQ',
    'CAACAgQAAxkBAAIsFV5ZxLan6Mhyu65tudH4em50iE-ZAAITAQACPbBZBmsWj9-OBxKOGAQ',
    'CAACAgIAAxkBAAIsH15ZxWqI1KNNRxQljhGRg8GTDs2xAAJJAQACwRieC82leVp7UaLJGAQ',
    'CAACAgUAAxkBAAIsI15ZxexFdJEPckYSNNXAHRA-yjBgAAIRAwACkhEjEM8Bx9B28k-gGAQ',
    'CAACAgEAAxkBAAIsLV5Zxnr2Moun5O9deNoAAZlOaJtwKAACaQMAArcN7QABNDi936zrfA4YBA'
  ]
}
