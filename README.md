# Telegram Door Opener Bot

部署在 Google Apps Script 的 Telegram 機器人，讓使用者透過 Telegram 指令呼叫自己的 `mobileAPI.php` 開門主機。這個專案負責 Telegram 對話、使用者狀態與帳號設定；實際的門鎖控制與權限判斷由遠端 API 處理。

> **安全提醒：**這個機器人能觸發實體門鎖。請只部署在自己管理的帳號與設備上，使用強密碼，並限制 API 帳號的可用動作。不要把 Bot Token、Firebase 金鑰、API 密碼或真實個資提交到 GitHub。

## 專案關聯

- 本專案：[Nununene/door-opener-bot](https://github.com/Nununene/door-opener-bot)
- 遠端控制 API：[Nununene/mobileAPI](https://github.com/Nununene/mobileAPI)

`mobileAPI` 是執行在 Linux / Raspberry Pi 上的 PHP API，接收 `uid`、`pwd`、`action` 欄位，並依設定執行對應動作。兩邊必須設定相同的 API 帳號、密碼與相容的 action。

## 功能

- 透過 Telegram webhook 接收訊息。
- `/start`、`/help` 顯示使用說明。
- `/setname`、`/setpassword` 設定遠端 API 帳號與密碼；`/seturl` 設定 API 網址，輸入 `none` 使用預設網址。
- `/ping` 測試遠端 API 連線；`/open` 呼叫開門動作；`/stat` 顯示帳號設定狀態。
- 將使用者資料與對話狀態儲存在 Firebase Realtime Database。

遠端 API 回傳碼目前預期為：`1` 成功、`2` 帳密錯誤、`3` 權限不足、`4` 參數錯誤。

## 執行環境

- Google 帳號與 Google Apps Script 專案。
- Telegram Bot Token（由 [@BotFather](https://t.me/BotFather) 建立）。
- Firebase Realtime Database，以及此程式使用的 `FirebaseApp` Apps Script 函式庫。
- 可從網際網路以 HTTPS 存取的 `mobileAPI.php` 端點。

此版本使用 Apps Script 專屬服務（`UrlFetchApp`、`Logger`）和 FirebaseApp 函式庫，不能直接以 Node.js、PHP 或一般 Web Server 執行。若改用其他主機，需將 webhook handler、Telegram HTTP 呼叫、設定儲存與 Firebase 存取改寫成該平台支援的實作。

## Google Apps Script 部署

### 1. 建立 Apps Script 專案

1. 前往 [Google Apps Script](https://script.google.com/) 建立新專案。
2. 將 `main.gs`、`mylib.gs`、`variables.gs` 匯入為同名的 Script 檔案。`testSend.gs` 是手動測試輔助程式，正式環境可不匯入。
3. 在 Apps Script 專案設定中加入程式使用的 `FirebaseApp` 函式庫。請依你目前 FirebaseApp 套件的來源與版本填入 Script ID 和版本；本 repository 沒有足夠資訊判定你現行專案使用的函式庫版本。
4. 在 `variables.gs` 設定 `FB_KEY`、`FB_URL`、`TG_KEY`、`DEFAULT_API_URL` 和 `MY_TG_ID`。請勿提交含真實值的檔案。較安全的作法是將機密改存 Apps Script 的 Script Properties，再由程式讀取；目前程式仍直接讀取 `variables.gs` 常數，尚未支援 Script Properties。
5. 確認 Firebase Realtime Database 規則只允許必要的存取，並確認 `mobileAPI.php` 已建立對應使用者與 `ping`、`open` 等權限。

### 2. 部署為 Web App

1. 在 Apps Script 按 **Deploy → New deployment → Web app**。
2. **Execute as** 選擇部署者；**Who has access** 設為 **Anyone**，讓 Telegram webhook 能呼叫公開 HTTPS 端點。這會讓端點可由網際網路呼叫，請務必先加入 webhook 驗證與輸入檢查，再用於實際門鎖。
3. 部署後複製 Web App URL（通常以 `/exec` 結尾）。更新程式時請管理既有部署並建立新版本。
4. 設定 Telegram webhook：

```sh
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=<APPS_SCRIPT_WEB_APP_URL>"
```

將 `<TELEGRAM_BOT_TOKEN>` 和 `<APPS_SCRIPT_WEB_APP_URL>` 換成自己的值。不要把含 Token 的完整命令貼到公開 issue、截圖或提交紀錄。

使用下列方式確認 webhook 狀態（回應會包含 webhook URL，請勿公開貼出）：

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Apps Script Web App 的 HTTP handler 應回傳 `TextOutput` 或 `HtmlOutput`。目前 `doPost` 回傳的是布林值；第一次部署或遷移時，請先確認 Telegram webhook 收到的 HTTP 狀態與回應，並考慮調整為明確回傳 `ContentService.createTextOutput('OK')`。Telegram 會在 webhook 回應非 2xx 時重送更新，因此處理 `/open` 時應加入 `update_id` 去重，避免重送造成重複動作。

### 3. 初次使用

在 Telegram 開啟 bot，依序執行 `/setname`、`/setpassword`、`/ping`。確認連線成功後再使用 `/open`。密碼會透過 Telegram 聊天輸入；建議使用專用、權限受限的 API 帳號，並在完成設定後清除包含密碼的聊天紀錄。

## 其他部署方式

### Node.js Web Server / Cloud Run / VPS

適合希望版本控制與部署流程完全由 GitHub 管理的情況。需要以 Node.js 重寫 `doPost`，用 HTTP client 呼叫 Telegram 與 `mobileAPI.php`，並改用 Firebase Admin SDK 或其他資料儲存實作。伺服器須提供 Telegram 可連線的 HTTPS webhook；Token 與 Firebase 憑證放在平台的 Secret Manager / 環境變數，不要放進程式碼。Cloud Run 可避免自行維護作業系統；VPS 則需要自行維護 TLS、更新與監控。**目前 repository 沒有 Node.js 版本或可直接部署的設定。**

### 自架 PHP Web Server

可將 bot webhook 寫成 PHP，部署到與 `mobileAPI` 相同的 Raspberry Pi / Nginx 主機，並以 PHP 呼叫 Telegram 與既有 API。這是另一個實作版本，不是把目前 `.gs` 檔案直接放到 PHP 主機即可執行；也要避免 bot webhook 與開門 API 共用不必要的權限。

## GitHub 上架前建議

- 將 Bot Token、Firebase 憑證和其他部署設定移出 `variables.gs`，改從 Script Properties 讀取。上架前檢查所有歷史檔案與 commit；若真實憑證曾經提交，先撤銷並重新產生，單純刪除目前檔案不會移除 Git 歷史。
- 加入 Telegram webhook secret 驗證。Telegram `setWebhook` 支援設定 `secret_token`，會透過 `X-Telegram-Bot-Api-Secret-Token` header 傳送；需先確認 Apps Script 是否能可靠讀取該 header，否則可在 webhook URL 加隨機 query secret 並於 `doPost` 驗證，或採用可檢查 header 的伺服器。
- 在 `doPost` 驗證更新格式、處理沒有 `message` 的 Telegram update，並回傳明確的 HTTP 回應。現在程式假設每個更新都有 `message`，且 `doPost` 回傳布林值。
- 修正 `identifyCmd` 取 Telegram entity 的結尾索引。現有程式將 `substring` 的第二個參數當成長度；若指令前有文字或空白，命令可能被解析錯誤。
- 加入依 `update_id` 去重的處理，避免 Telegram webhook 重送時重複執行開門動作。
- 檢查使用者可自行設定的 API URL，限制為可信任的 HTTPS host，避免 bot 被用來請求非預期的內部或外部服務。
- 補上 `appsscript.json`、FirebaseApp 函式庫版本、授權需求，以及可重現的本機檢查流程。若使用 `clasp` 管理 Apps Script，將含 Script ID 的 `.clasp.json` 排除在版本控制之外。
- `testSend.gs` 含測試函式與範例帳密，建議移至獨立測試專案或改成不含可用憑證的測試資料。

## 相關文件

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script Properties Service](https://developers.google.com/apps-script/guides/properties)
- [Telegram Bot API：setWebhook](https://core.telegram.org/bots/api#setwebhook)
