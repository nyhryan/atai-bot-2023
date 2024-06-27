# ATAI's Discord Bot with [Discord.js](https://github.com/discordjs/discord.js)

![bot](https://github.com/nyhryan/atai-bot-2023/assets/85018069/7ea6bcb9-636a-4980-9105-64d1841fa8d5)

## ⭐&#xFE0F; Features
- Sends back enlarged emoji as embedded image when user sends an emoji to the chat.
    - Saves enlarged emoji image as cache(File IO), saves image conversion time when the user sends the same emoji later again.
- Check ping in miliseconds.
- Change bot's user status with command.
- Check server/user info with command.

## ✅&#xFE0F; Stuffs Used
- Discord.js
- TypeScript
- Bun runtime(alternative of node.js)
- Google Compute Engine's free tier VM
- Visual Studio Code

## Usage
```shell
# install packages first
$ bun install

# run TypeScript compiler on watch mode, based on tsconfig.json
$ bunx tsc -w

# run the bot!
$ bun --watch run dist/index.js
```