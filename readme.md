# AyMusic-Electron
Electron application for AyMusic

## How to use the app (development mode)
1. Install node
2. `npm install`
3. `git restore .` (important, will make musics working)
4. In `res/main.js`, modify the line `94` to `if (true)` to use our public production server
5. `npm start`
6. If the app doesn't launch with `npm start`:
    - On Linux: launch the app with `npm run startFix`
    - On macOS: launch the app with `npm run startFixMac`

### Use Spotify (for Windows and macOS)
1. Install Python 
2. Install castlabs's EVS: `python3 -m pip install --upgrade castlabs-evs` (necessary to use Spotify)
3. Connect to your EVS account: `python3 -m castlabs_evs.account reauth` or `python3 -m castlabs_evs.account signup`
4. Sign the app:
    - On Windows: `python -m castlabs_evs.vmp sign-pkg .\node_modules\electron\dist\`
    - On macOS: `python3 -m castlabs_evs.vmp sign-pkg ./node_modules/electron/dist/`

### Use Discord RPC (for Windows)
1. Create file named `.env` in the root folder
2. Put `DISCORD_CLIENT_ID=...` in this file and replace `...` by your Discord Client ID

## How to do a release build for Windows
1. Install Python 
3. Create file named `.env` in the root folder
4. Install castlabs's EVS: `python3 -m pip install --upgrade castlabs-evs` (necessary to use Spotify)
5. Connect to your EVS account: `python3 -m castlabs_evs.account reauth` or `python3 -m castlabs_evs.account signup`
6. Replace `process.env.DISCORD_CLIENT_ID` by your Discord Client ID if you want Discord integration (optional)
7. `npm run buildWin`

## How to do a release build for macOS
1. Install Python 
3. Create file named `.env` in the root folder
4. Install castlabs's EVS: `python3 -m pip install --upgrade castlabs-evs` (necessary to use Spotify)
5. Connect to your EVS account: `python3 -m castlabs_evs.account reauth` or `python3 -m castlabs_evs.account signup`
6. `npm run buildMac`

## How to do a release build for Linux
1. Install Python
3. Create file named `.env` in the root folder
4. `npm run buildLinux`

## Repos used
- [AyMusic's WebAssets](https://github.com/Shiyukine/AyMusic-WebAssets)
- [AketsukyUpdater for Windows](https://github.com/Shiyukine/AketsukyUpdater)
- [Fork of discordJS/RPC](https://github.com/Shiyukine/discordjs-RPC)
- [castlabs/electron-releases](https://github.com/castlabs/electron-releases)

## Other repos
- [Android application of AyMusic](https://github.com/Shiyukine/AyMusic-Android)
- [iOS application of AyMusic](https://github.com/Shiyukine/AyMusic-iOS)