# Telegram Door Opener Bot

[English](README.md) | [繁體中文](README.zh-TW.md)

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
4. 在 Apps Script 專案的 **Project Settings → Script Properties** 新增以下三個 property：

   | Property | Value |
   | --- | --- |
   | `FIREBASE_URL` | Firebase Realtime Database 的完整 URL |
   | `FIREBASE_KEY` | FirebaseApp 函式庫使用的 Firebase key |
   | `TELEGRAM_BOT_TOKEN` | 從 BotFather 取得的 Telegram Bot Token |

   儲存後重新部署 Web App。這三個值不再放在 `variables.gs`。如果任一項未設定或為空，程式會在 Apps Script 執行記錄中記下缺少的 property 名稱，並在可聯絡 Telegram 時回覆「機器人參數錯誤」。若缺少 `TELEGRAM_BOT_TOKEN`，就無法透過 Telegram 傳送錯誤訊息。
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

`doPost` 會驗證 JSON 更新、必要的 `message` 欄位與 `update_id`，並回傳 `HtmlOutput`。這可避免 Content Service 回應時的重新導向，而 Telegram 不接受 webhook 回應重新導向。重新部署後請查詢 `getWebhookInfo`，確認 `last_error_message` 為空；若 Telegram 仍回報重新導向，需在 Apps Script 前加上能直接回傳 2xx 的 webhook 代理。格式錯誤時會記錄原因；若能取得 chat ID，會回覆「訊息格式錯誤」。對沒有支援訊息的更新，程式不會執行 bot 命令。

程式會在 Script Properties 中自動建立 `PROCESSED_UPDATE_IDS`，用來去重近期已處理的更新；它不需要手動設定。程式最多保存 100 個 ID，並清除 24 小時以前的記錄。若無法取得鎖或保存 ID，該更新會記錄錯誤並停止處理，以免重複執行開門動作。ID 在處理訊息前先登記，所以若執行在登記後、完成動作前中斷，該更新也不會由重送再次執行；這可抑制重複操作，但不能保證每個動作都成功完成。

### 3. 初次使用

在 Telegram 開啟 bot，依序執行 `/setname`、`/setpassword`、`/ping`。確認連線成功後再使用 `/open`。密碼會透過 Telegram 聊天輸入；建議使用專用、權限受限的 API 帳號，並在完成設定後清除包含密碼的聊天紀錄。

## 其他部署方式

### Node.js Web Server / Cloud Run / VPS

適合希望版本控制與部署流程完全由 GitHub 管理的情況。需要以 Node.js 重寫 `doPost`，用 HTTP client 呼叫 Telegram 與 `mobileAPI.php`，並改用 Firebase Admin SDK 或其他資料儲存實作。伺服器須提供 Telegram 可連線的 HTTPS webhook；將 `FIREBASE_URL`、`FIREBASE_KEY`、`TELEGRAM_BOT_TOKEN` 對應的值放在平台 Secret Manager 或環境變數，不要放進程式碼。去重也要改用該平台的持久儲存與併發鎖定實作。Cloud Run 可避免自行維護作業系統；VPS 則需要自行維護 TLS、更新與監控。**目前 repository 沒有 Node.js 版本或可直接部署的設定。**

### 自架 PHP Web Server

可將 bot webhook 寫成 PHP，部署到與 `mobileAPI` 相同的 Raspberry Pi / Nginx 主機，並以 PHP 呼叫 Telegram 與既有 API。這是另一個實作版本，不是把目前 `.gs` 檔案直接放到 PHP 主機即可執行。將三項憑證放在主機的環境設定或秘密管理工具中，並以資料庫或具鎖定能力的儲存方式記錄已處理的 `update_id`。

## 相關文件

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script Properties Service](https://developers.google.com/apps-script/guides/properties)
- [Telegram Bot API：setWebhook](https://core.telegram.org/bots/api#setwebhook)

## 更新記錄

### 2026-11-09

- 驗證 Telegram webhook 更新格式，並在可取得 chat ID 時回覆格式錯誤訊息。
- 修正 Telegram command entity 的結尾索引解析。
- 將 Firebase URL、Firebase key 與 Telegram Bot Token 改由 Script Properties 讀取。
- 加入鎖定與近期 `update_id` 紀錄，降低 webhook 重送造成的重複處理。
- 確認 Telegram 不接受 Content Service 的重新導向後，將 webhook 確認回應改為 HTML 輸出。
- 更新 Apps Script 與其他主機部署說明。
