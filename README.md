# Telegram Door Opener Bot

[English](README.md) | [繁體中文](README.zh-TW.md)

A Telegram bot running on Google Apps Script that lets users call their own `mobileAPI.php` door control API. This project handles Telegram conversations and user settings. The remote API is responsible for authorization and the actual door control action.

> **Security notice:** This bot can trigger a physical door lock. Deploy it only with accounts and devices you control, use strong credentials, and limit each API account to the actions it needs. Never commit a Bot Token, Firebase key, API password, or real personal data to GitHub.

## Related projects

- This project: [Nununene/door-opener-bot](https://github.com/Nununene/door-opener-bot)
- Remote control API: [Nununene/mobileAPI](https://github.com/Nununene/mobileAPI)

`mobileAPI` is a PHP API that runs on Linux / Raspberry Pi. It accepts `uid`, `pwd`, and `action` fields and performs the configured action. Both projects must use matching API credentials and compatible actions.

## Features

- Receives messages through a Telegram webhook.
- `/start` and `/help` show usage instructions.
- `/setname`, `/setpassword`, and `/seturl` configure the remote API account, password, and URL. Enter `none` for `/seturl` to use the default URL.
- `/ping` checks the remote API connection; `/open` requests the door action; `/stat` shows the account configuration status.
- Stores user data and conversation state in Firebase Realtime Database.

Expected remote API result codes: `1` success, `2` invalid account or password, `3` permission denied, and `4` invalid argument.

## Requirements

- A Google account and a Google Apps Script project.
- A Telegram Bot Token created with [@BotFather](https://t.me/BotFather).
- Firebase Realtime Database and the `FirebaseApp` Apps Script library used by this project.
- An HTTPS-accessible `mobileAPI.php` endpoint.

This version uses Apps Script-specific services such as `UrlFetchApp` and `Logger`, plus the FirebaseApp library. The `.gs` files cannot run directly on Node.js, PHP, or a general-purpose web server. Porting the bot requires rewriting the webhook handler, Telegram HTTP calls, configuration storage, and Firebase access for the target platform.

## Deploy on Google Apps Script

### 1. Create an Apps Script project

1. Create a project at [Google Apps Script](https://script.google.com/).
2. Import `main.gs`, `mylib.gs`, and `variables.gs` as script files with the same names. `testSend.gs` contains manual testing helpers and can be omitted from a production project.
3. Add the `FirebaseApp` library used by the script in the Apps Script project settings. Use the Script ID and version for the library source used by your existing project; this repository does not identify a specific library version.
4. In **Project Settings → Script Properties**, add these three properties:

   | Property | Value |
   | --- | --- |
   | `FIREBASE_URL` | The full Firebase Realtime Database URL |
   | `FIREBASE_KEY` | The Firebase key used by the FirebaseApp library |
   | `TELEGRAM_BOT_TOKEN` | The Telegram Bot Token from BotFather |

   Save the properties before deploying the web app. These values are no longer stored in `variables.gs`. If a property is missing or empty, the script logs the missing property name and replies **“Bot configuration error”** when Telegram can be reached. If `TELEGRAM_BOT_TOKEN` is missing, the bot cannot send a Telegram reply.
5. Restrict Firebase Realtime Database rules to the access the bot needs. Configure the corresponding user and `ping` / `open` permissions in `mobileAPI.php`.

### 2. Deploy as a web app

1. In Apps Script, select **Deploy → New deployment → Web app**.
2. Set **Execute as** to the deployer and **Who has access** to **Anyone**, so Telegram can call the public HTTPS endpoint. The endpoint is reachable from the internet; add webhook authentication and input checks before using it to control a real door.
3. Deploy and copy the Web App URL, usually ending in `/exec`. When updating the code, edit the existing deployment and select the new version.
4. Register the Telegram webhook:

```sh
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=<APPS_SCRIPT_WEB_APP_URL>"
```

Replace `<TELEGRAM_BOT_TOKEN>` and `<APPS_SCRIPT_WEB_APP_URL>` with your own values. Do not post a command containing the token in a public issue, screenshot, or commit.

Check the webhook status with:

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

The response includes the webhook URL; do not share it publicly.

`doPost` validates the JSON update, required `message` fields, and `update_id`, then returns an `HtmlOutput` response. This avoids the Content Service response redirect, which Telegram does not accept for webhook responses. After deployment, check `getWebhookInfo` and confirm that `last_error_message` is empty; if Telegram still reports a redirect, put a webhook proxy that returns 2xx directly in front of Apps Script. The script logs malformed updates and replies **“Invalid message format”** when a chat ID is available. Updates without a supported message are not processed as bot commands.

The script automatically creates a `PROCESSED_UPDATE_IDS` Script Property to deduplicate recent updates; you do not need to add it manually. It keeps up to 100 IDs and removes entries older than 24 hours. If the script cannot acquire the lock or save an ID, it logs an error and stops processing that update to avoid repeating a door action. An ID is recorded before the message is handled, so if execution stops after recording but before the action completes, a webhook retry will not run it again. This reduces duplicate actions but does not guarantee every action completes successfully.

### 3. First use

Open the bot in Telegram and run `/setname`, `/setpassword`, then `/ping`. Use `/open` only after the connection succeeds. The password is entered in the Telegram chat; use a dedicated API account with limited permissions and clear the chat history after setup.

## Other deployment options

### Node.js web server / Cloud Run / VPS

This option suits deployments managed through a GitHub-based release process. Rewrite `doPost` in Node.js, use an HTTP client for Telegram and `mobileAPI.php`, and replace Firebase access with the Firebase Admin SDK or another storage implementation. The server needs an HTTPS webhook endpoint reachable by Telegram. Store the values corresponding to `FIREBASE_URL`, `FIREBASE_KEY`, and `TELEGRAM_BOT_TOKEN` in the platform's Secret Manager or environment variables, never in source code. Implement update de-duplication with persistent storage and a concurrency lock on that platform. Cloud Run avoids operating system maintenance; a VPS requires you to maintain TLS, updates, and monitoring. **This repository does not include a Node.js implementation or deployment configuration.**

### Self-hosted PHP web server

You can write a PHP webhook and host it on the same Raspberry Pi / Nginx server as `mobileAPI`, then call Telegram and the existing API from PHP. This requires a separate implementation; the `.gs` files cannot be copied to a PHP host and run as-is. Store the three credentials in host environment settings or a secrets manager, and track processed `update_id` values in persistent storage with suitable locking.

## References

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script Properties Service](https://developers.google.com/apps-script/guides/properties)
- [Telegram Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook)

## Changelog

### 2026-11-09

- Added Telegram webhook update validation and format-error replies when a chat ID is available.
- Fixed Telegram command entity end-index parsing.
- Moved the Firebase URL, Firebase key, and Telegram Bot Token to Script Properties.
- Added locking and recent `update_id` tracking to reduce duplicate handling of webhook retries.
- Changed the webhook acknowledgement to an HTML response after confirming Telegram rejects the Content Service redirect.
- Updated Apps Script and alternative deployment instructions.
