import { AttachmentBuilder, EmbedBuilder, Events, Message, TextChannel } from 'discord.js';
import { GifFrame, GifUtil, GifCodec, BitmapImage } from 'gifwrap';
import { parse } from 'node-html-parser';
import path from 'path';
import Jimp from 'jimp';
import axios from 'axios';
import emojiRegex from 'emoji-regex';
import emojiJson from 'emojilib/dist/emoji-en-US.json';

import * as helper from '../helper/helper.js';

type EmojiObj = {
    animated: boolean;
    id: string | undefined;
    name: string | undefined;
    src: string | undefined;
}

async function deleteAndSendEmoji(message: Message, attachment: AttachmentBuilder) {
    const channel = message.client.channels.cache.get(message.channelId) as TextChannel;
    await message.delete();

    const embedMesssage = new EmbedBuilder()
        .setColor(0x9accfd)
        .setAuthor({
            name: message.author.globalName!,
            iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`,
        })
        .setImage(`attachment://${attachment.name}`);

    // Send enlarged emoji
    return helper.wrap(channel.send({
        embeds: [embedMesssage],
        files: [attachment],
    }));
}

export const name = Events.MessageCreate;
export async function execute(message: Message) {
	const _emojiRegex = emojiRegex();

    // matches unicode emoji, get string of emoji if unicode emoji
	const unicodeEmojiString = message.content.match(_emojiRegex);

	// get discord's name of custom emoji
	const customEmojiString = message.content.match(/^<a?:\w+:\d+>$/g);

	if (!customEmojiString && !unicodeEmojiString) {
		return;
	}
	else if (!customEmojiString &&
			 unicodeEmojiString && unicodeEmojiString.length !== 1) {
		return;
	}
	else if (!customEmojiString &&
			 unicodeEmojiString![0] !== message.content) {
		return;
	}

	const emojiObj : EmojiObj = {
		animated: false,
        id: '',
        name: '',
        src: ''
	};

    // if it's custom emoji, gets image file from discord
	if (!unicodeEmojiString && customEmojiString) {
		const emoji = customEmojiString[0];
		emojiObj.animated = emoji.match(/^<a:/g) !== null ? true : false;
		emojiObj.id = emoji.match(/\d{2,}/g)?.at(0);
		emojiObj.name = emoji.match(/:\w+:/g)?.at(0)?.replace(/:/g, '');
		emojiObj.src = `https://cdn.discordapp.com/emojis/${emojiObj.id}`;
	}
    // if it's unicode emoji, gets from emojipedia
	else {
		const emoji = unicodeEmojiString!.at(0);
        emojiObj.name = emojiJson[emoji as keyof (typeof emojiJson)][0].replace(/[_\s]/g, '-') ?? undefined;
		if (!emojiObj.name) {
			console.error(`No emoji name found for ${emoji}`);
			return;
		}

		// get emoji image from emojipedia
        const [response, responseErr] = await helper.wrap(axios.get(`https://emojipedia.org/microsoft/windows-11-23H2/${emojiObj.name}`));
		if (responseErr) {
			console.error(responseErr.code);
			return;
		}
		// get the actual image file from the html page of emojipedia
		emojiObj.src = parse(response.data)?.querySelector('main section > div > div > div > div > img')?.getAttribute('src') ?? undefined;
		if (emojiObj.src === null) {
			console.error(`No emoji src found for ${emoji}`);
			return;
		}
	}

	// console.log(`User ${message.author.globalName} sent emoji [${emojiObj.name}] at #${(message.channel as TextChannel).name}`);

	// if cached emoji exists, send cached emoji
	const cachedEmojiFile = path.join(await helper.getCacheDir(), helper.sha(emojiObj.name! + emojiObj.src!));
	if (await helper.fileExists(cachedEmojiFile)) {
		const attachment = new AttachmentBuilder('');

		if (emojiObj.animated) {
			const [cachedEmoji, cachedEmojiErr] = await helper.wrap(GifUtil.read(cachedEmojiFile));
			if (cachedEmojiErr) {
				console.error(cachedEmojiErr);
				return;
			}

			attachment.attachment = cachedEmoji.buffer;
		}
		else {
			Jimp.read(cachedEmojiFile)
				.catch((error) => console.error(`Error reading cached emoji ${emojiObj.name}:\n${error}`))
				.then(async (readFile) => {
					attachment.attachment = await readFile!.getBufferAsync(Jimp.MIME_PNG);
				});
		}

		attachment.name = `emoji.${emojiObj.animated ? 'gif' : 'png'}`;

        deleteAndSendEmoji(message, attachment)
        .catch(sendErr => {
            console.error(`Error sending enlarged emoji :\n${sendErr}`);
        });;
	}

	const [frameImage, frameImageErr] = await helper.wrap(Jimp.read('./assets/frame.png'));
	if (frameImageErr) {
		console.error(frameImageErr);
		return;
	}

	const attachment = new AttachmentBuilder('');
	// if user sent an animated emoji
	if (emojiObj.animated) {
		// Get emoji gif from discord cdn
		const [response, responseErr] = await helper.wrap(axios.get(emojiObj.src as string, { responseType: 'arraybuffer' }));
		if (responseErr) {
			console.error(responseErr);
			return;
		}

		// Read emoji gif into gifwrap Gif object
		const frames = [];
		const [emojiGif, emojiGifErr] = await helper.wrap(GifUtil.read(response.data));
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
		const [encodedGif, encodedGifErr] = await helper.wrap(codec.encodeGif(frames, { loops: 0 }));
		if (encodedGifErr) {
			console.error(encodedGifErr);
			return;
		}

		const [, writeErr] = await helper.wrap(Bun.write(cachedEmojiFile, encodedGif.buffer));
		if (writeErr) {
			console.error(writeErr);
			return;
		}

		// Set attachment
		attachment.attachment = encodedGif.buffer;
	}
	// if it's not animated, it's a non-animated discord custom emoji or an unicode emoji
	else {
		const [emojiPng, emojiPngErr] = await helper.wrap(Jimp.read(emojiObj.src as string));
		if (emojiPngErr) {
			console.error(emojiPngErr);
			return;
		}

		emojiPng.resize(128, 128);
		frameImage.composite(emojiPng, 7, 27);

		// Get png as buffer
		const [pngBuffer, pngBufferErr] = await helper.wrap(frameImage.getBufferAsync(Jimp.MIME_PNG));
		if (pngBufferErr) {
			console.error(pngBufferErr);
			return;
		}

		const [, writeErr] = await helper.wrap(Bun.write(cachedEmojiFile, pngBuffer));
		if (writeErr) {
			console.error(writeErr);
			return;
		}

		// Set attachment
		attachment.attachment = pngBuffer;
	}

	attachment.name = `emoji.${emojiObj.animated ? 'gif' : 'png'}`;

    deleteAndSendEmoji(message, attachment)
    .catch(sendErr => {
        console.error(`Error sending enlarged emoji :\n${sendErr}`);
    });
}
