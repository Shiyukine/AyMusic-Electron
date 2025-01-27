# AyMusic-Electron
Electron application for AyMusic

## How to use the app
1. Install node
2. `npm install`
3. `npm start`
4. If the app doesn't launch with `npm start`, then launch the app with `npm run startFix`

### Use Spotify
1. Install Python 
2. Install EVS: `python3 -m pip install --upgrade castlabs-evs` (necessary to use Spotify)
3. Connect to your EVS account: `python3 -m castlabs_evs.account reauth` or `python3 -m castlabs_evs.account signup`
4. `python -m castlabs_evs.vmp sign-pkg .\node_modules\electron\dist\`

### Use Discord RPC
1. Create file named `.env` in the root folder
2. Put `DISCORD_CLIENT_ID=...` in this file and replace `...` by your Discord Client ID

## How to build release on Windows
1. Install Python 
2. Install EVS: `python3 -m pip install --upgrade castlabs-evs` (necessary to use Spotify)
3. Connect to your EVS account: `python3 -m castlabs_evs.account reauth` or `python3 -m castlabs_evs.account signup`
4. Replace `process.env.DISCORD_CLIENT_ID` by your Discord Client ID if you want Discord integration (optional)
5. `npm run buildWin`

## How to build release on Linux
1. Install Python
2. `npm run buildLinux`

__Note:__
WebAssets are [here](https://github.com/Shiyukine/AyMusic-WebAssets)

AketsukyUpdater for Windows is [here](https://github.com/Shiyukine/AketsukyUpdater)