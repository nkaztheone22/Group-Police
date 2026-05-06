# 🚔 Group Police - WhatsApp Bot

A powerful WhatsApp group moderation bot built with Baileys.

## Features

✅ **Anti-Link** - Automatically warns and removes users who post links
✅ **Anti-Bad Words** - Filters offensive language
✅ **Warning System** - 3-strike system with auto-removal
✅ **24-Hour Auto-Clear** - Warnings expire automatically
✅ **Anti-Ban Delays** - Random delays to avoid WhatsApp bans
✅ **Persistent Storage** - Settings and warnings saved to JSON files

## Commands

- `!help` - Show available commands
- `!settings` - Display current settings
- `!antilink on/off` - Toggle link protection
- `!antiword on/off` - Toggle bad word filter
- `!badwords list` - Show the bad words list

## Installation (Local)

```bash
git clone https://github.com/nkaztheone22/Group-Police.git
cd Group-Police
npm install
npm start
```

Scan the pairing code that appears in your terminal with WhatsApp.

## Deployment on Render.com

### Step 1: Prepare Your Bot
1. Fork this repository
2. Deploy to Render as a "Background Worker"

### Step 2: On Render Dashboard
1. Create a new "Background Worker" service
2. Connect your GitHub repository
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Select **Node** as the environment

### Step 3: First Time Setup
1. After deployment starts, go to the **Logs** tab
2. You'll see a pairing code in the logs
3. Open WhatsApp on your phone
4. Go to **Settings > Devices > Link a device**
5. Enter the pairing code from the logs

### Step 4: Monitor
- Check logs regularly to ensure the bot is running
- The bot will automatically restart if it crashes

## Settings

Edit `settings.json` to customize:

```json
{
  "antilink": true,
  "antiword": true,
  "warnKick": 3,
  "antiBanDelay": true,
  "badwords": ["word1", "word2"]
}
```

## License

MIT

## Support

For issues, create an issue on GitHub: https://github.com/nkaztheone22/Group-Police/issues
