import { AttachmentBuilder, EmbedBuilder, Events, Message, TextChannel } from 'discord.js';
import { GifFrame, GifUtil, GifCodec, BitmapImage } from 'gifwrap';
import { parse } from 'node-html-parser';
import Jimp from 'jimp';
import axios from 'axios';
import emojiRegex from 'emoji-regex';
import emojiJson from 'emojilib/dist/emoji-en-US.json' with { type: 'json' };

import { wrap } from '../helper/helper.js';

import dotenv from 'dotenv';
dotenv.config();


export const name = Events.MessageCreate;

export async function execute(message: Message) {
	const _emojiRegex = emojiRegex();
	const resultUnicodeEmojis = message.content.match(_emojiRegex);

	// gets emoji string like <(a:)name:id> from message
	const resultDiscordEmoji = message.content.match(/^<a?:\w+:\d+>$/g);

	// check if message.content only contains a single emoji
	if (resultDiscordEmoji === null && resultUnicodeEmojis === null) {
		return;
	}
	else if (resultDiscordEmoji === null && resultUnicodeEmojis !== null && resultUnicodeEmojis.length > 1) {
		return;
	}

	interface EmojiObj {
		animated?: boolean | undefined;
		id?: string | undefined;
		name?: string | undefined;
		src?: string | undefined;
	}

	const emojiObj : EmojiObj = {
		animated: false,
	};

	if (resultUnicodeEmojis === null && resultDiscordEmoji !== null) {
		const emoji = resultDiscordEmoji[0];
		emojiObj.animated = emoji.match(/^<a:/g) !== null ? true : false;
		emojiObj.id = emoji.match(/\d{2,}/g)?.at(0);
		emojiObj.name = emoji.match(/:\w+:/g)?.at(0)?.replace(/:/g, '');
		emojiObj.src = `https://cdn.discordapp.com/emojis/${emojiObj.id}`;
	}
	else {
		emojiObj.animated = false;

		const emoji = resultUnicodeEmojis!.at(0);
		emojiObj.name = emojiJson[emoji as keyof typeof emojiJson][0].replace(/[_\s]/g, '-');

		// get emoji image from emojipedia
		const [response, responseErr] = await wrap(axios.get(`https://emojipedia.org/microsoft-3D-fluent/15.0/${emojiObj.name}`));
		if (responseErr) {
			console.error(responseErr.code);
			return;
		}
		// get the actual image file from the html page of emojipedia
		emojiObj.src = parse(response.data)?.querySelector('main section > div > div > div > div > img')?.getAttribute('src');
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
		const [response, responseErr] = await wrap(axios.get(emojiObj.src as string, { responseType: 'arraybuffer' }));
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
		GifUtil.quantizeDekker(frames, 256);
		const [encodedGif, encodedGifErr] = await wrap(codec.encodeGif(frames, { loops: 0 }));
		if (encodedGifErr) {
			console.error(encodedGifErr);
			return;
		}

		// Set attachment
		attachment.attachment = encodedGif.buffer;
		attachment.name = `${emojiObj.name}.gif`;
	}
	// if it's not animated, it's a non-animated discord custom emoji or an unicode emoji
	else if (!emojiObj.animated) {
		const [emojiPng, emojiPngErr] = await wrap(Jimp.read(emojiObj.src as string));
		if (emojiPngErr) {
			console.error(emojiPngErr);
			return;
		}

		emojiPng.resize(128, 128);
		frameImage.composite(emojiPng, 7, 27);

		// Get png as buffer
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
	const channel = message.client.channels.cache.get(message.channelId) as TextChannel;
	const [, deleteErr] = await wrap(message.delete());
	if (deleteErr) {
		console.error(deleteErr);
		return;
	}

	const embedMesssage = new EmbedBuilder()
		.setColor(0x9accfd)
		.setAuthor({
			name: message.author.globalName!,
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
}
