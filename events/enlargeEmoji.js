const { AttachmentBuilder, EmbedBuilder, Events } = require('discord.js');
const { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');
const { wrap, getCacheDir, fileExists, sha } = require('../helper/helper');
const { parse } = require('node-html-parser');
const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');
const axios = require('axios');
const emojiRegex = require('emoji-regex');
const emojiJson = require('emojilib');
require('dotenv').config();

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		const _emojiRegex = emojiRegex();
		const resultUnicodeEmojis = message.content.match(_emojiRegex);

		// gets emoji string like <(a:)name:id> from message
		const resultDiscordEmoji = message.content.match(/^<a?:\w+:\d+>$/g);

		if (resultDiscordEmoji === null && resultUnicodeEmojis === null) {
			return;
		}
		else if (resultDiscordEmoji === null && resultUnicodeEmojis !== null && resultUnicodeEmojis.length > 1) {
			return;
		}

		// check if message.content only contains a single emoji
		const emojiObj = {
			animated: false,
			id: '',
			name: '',
			src: '',
		};

		// if it's a discord emoji
		if (resultUnicodeEmojis === null && resultDiscordEmoji !== null) {
			emojiObj.animated = resultDiscordEmoji[0].match(/^<a:/g) !== null ? true : false;
			emojiObj.id = resultDiscordEmoji[0].match(/\d{2,}/g)[0];
			emojiObj.name = resultDiscordEmoji[0].match(/:\w+:/g)[0].replace(/:/g, '');
			emojiObj.src = `https://cdn.discordapp.com/emojis/${emojiObj.id}`;
		}
		// if it's an unicode emoji
		else {
			emojiObj.animated = false;
			emojiObj.name = emojiJson[resultUnicodeEmojis[0]][0].replace(/[_\s]/g, '-');

			// get emoji image from emojipedia
			const [response, responseErr] = await wrap(axios.get(`https://emojipedia.org/microsoft-3D-fluent/15.0/${emojiObj.name}`));
			if (responseErr) {
				console.error(responseErr.code);
				return;
			}
			// get the actual image file from the html page of emojipedia
			emojiObj.src = parse(response.data).querySelector('main section > div > div > div > div > img').getAttribute('src');
		}

		// if cached emoji exists, send cached emoji
		const cachedEmojiFile = path.join(await getCacheDir(), sha(emojiObj.name + emojiObj.src));
		if (await fileExists(cachedEmojiFile)) {
			const attachment = new AttachmentBuilder('');

			if (emojiObj.animated) {
				const [cachedEmoji, cachedEmojiErr] = await wrap(GifUtil.read(cachedEmojiFile));
				if (cachedEmojiErr) {
					console.error(cachedEmojiErr);
					return;
				}

				attachment.attachment = cachedEmoji.buffer;
			}
			else {
				const [cachedEmoji, cachedEmojiErr] = await wrap(Jimp.read(cachedEmojiFile));
				if (cachedEmojiErr) {
					console.error(cachedEmojiErr);
					return;
				}
				const [cachedToBuffer, cachedToBufferErr] = await wrap(cachedEmoji.getBufferAsync(Jimp.MIME_PNG));
				if (cachedToBufferErr) {
					console.error(cachedToBufferErr);
					return;
				}

				attachment.attachment = cachedToBuffer;
			}

			attachment.name = `${emojiObj.name}.${emojiObj.animated ? 'gif' : 'png'}`;

			// Delete original message
			const channel = message.client.channels.cache.get(message.channelId);
			const [, deleteErr] = await wrap(message.delete());
			if (deleteErr) {
				console.error(deleteErr);
				return;
			}

			const embedMesssage = new EmbedBuilder()
				.setColor(0x9accfd)
				.setAuthor({
					name: message.author.globalName,
					iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.${emojiObj.animated ? 'gif' : 'png'}`,
				})
				.setImage(`attachment://${attachment.name}`);

			// Send enlarged emoji
			const [, sendErr] = await wrap(channel.send({
				embeds: [embedMesssage],
				files: [attachment],
			}));
			if (sendErr) {
				console.error(sendErr);
				return;
			}

			return;
		}

		const [frameImage, frameImageErr] = await wrap(Jimp.read('./assets/frame.png'));
		if (frameImageErr) {
			console.error(frameImageErr);
			return;
		}
		const attachment = new AttachmentBuilder('');
		// if user sent an animated emoji
		if (emojiObj.animated) {
			// Get emoji gif from discord cdn
			const [response, responseErr] = await wrap(axios.get(emojiObj.src, { responseType: 'arraybuffer' }));
			if (responseErr) {
				console.error(responseErr);
				return;
			}

			// Read emoji gif into gifwrap Gif object
			const frames = [];
			const [emojiGif, emojiGifErr] = await wrap(GifUtil.read(response.data));
			if (emojiGifErr) {
				console.error(emojiGifErr);
				return;
			}
			// Overlay frame image on each frame of emoji gif
			for (const frame of emojiGif.frames) {
				const currentFrameAsJimp = GifUtil.copyAsJimp(Jimp, frame);
				currentFrameAsJimp.resize(128, 128);
				const compositedFrame = frameImage.clone().composite(currentFrameAsJimp, 7, 27);

				const gifFrame = new GifFrame(
					new BitmapImage(compositedFrame.bitmap),
					{
						disposalMethod: frame.disposalMethod,
						delayCentisecs: frame.delayCentisecs,
					});
				frames.push(gifFrame);
			}

			// Encode gif
			const codec = new GifCodec();
			GifUtil.quantizeDekker(frames);
			const [encodedGif, encodedGifErr] = await wrap(codec.encodeGif(frames, { loop: 0 }));
			if (encodedGifErr) {
				console.error(encodedGifErr);
				return;
			}

			// Write gif to cache
			const [, writeErr] = await wrap(fs.writeFile(cachedEmojiFile, encodedGif.buffer, 'binary'));
			if (writeErr) {
				console.error(writeErr);
				return;
			}

			// Set attachment
			attachment.attachment = encodedGif.buffer;
			attachment.name = `${emojiObj.name}.gif`;
		}
		// if it's not animated, it's a non-animated discord custom emoji or an unicode emoji
		else if (!emojiObj.animated) {
			const [emojiPng, emojiPngErr] = await wrap(Jimp.read(emojiObj.src));
			if (emojiPngErr) {
				console.error(emojiPngErr);
				return;
			}

			emojiPng.resize(128, 128);
			frameImage.composite(emojiPng, 7, 27);

			// Write gif to cache
			const [, writeErr] = await wrap(frameImage.writeAsync(cachedEmojiFile));
			if (writeErr) {
				console.error(writeErr);
				return;
			}

			// Get png buffer
			const [pngBuffer, pngBufferErr] = await wrap(frameImage.getBufferAsync(Jimp.MIME_PNG));
			if (pngBufferErr) {
				console.error(pngBufferErr);
				return;
			}

			// Set attachment
			attachment.attachment = pngBuffer;
			attachment.name = `${emojiObj.name}.png`;
		}

		// Delete original message
		const channel = message.client.channels.cache.get(message.channelId);
		const [, deleteErr] = await wrap(message.delete());
		if (deleteErr) {
			console.error(deleteErr);
			return;
		}

		const embedMesssage = new EmbedBuilder()
			.setColor(0x9accfd)
			.setAuthor({
				name: message.author.globalName,
				iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`,
			})
			.setImage(`attachment://${attachment.name}`);

		// Send enlarged emoji
		const [, sendErr] = await wrap(channel.send({
			embeds: [embedMesssage],
			files: [attachment],
		}));
		if (sendErr) {
			console.error(sendErr);
			return;
		}
	},
};