const { AttachmentBuilder, Events } = require('discord.js');
const Jimp = require('jimp');
const { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');
const axios = require('axios');
require('dotenv').config();

module.exports = {
	name: Events.MessageCreate,
	async execute(interaction) {
		// gets emoji string like <(a:)name:id> from message
		const emojiFromContent = interaction.content.match(/^<a?:\w+:\d+>$/g);
		// gets emoji id from emoji string
		const emojiId = emojiFromContent !== null ? emojiFromContent[0].match(/\d{2,}/g)[0] : null;

		if (emojiId === null) {
			return;
		}

		const emojiName = emojiFromContent[0].match(/:\w+:/g)[0].replace(/:/g, '');
		console.log(`Emoji name: ${emojiName}`);
		console.log(`Emoji id: ${emojiId}`);

		const isEmojiAnimated = emojiFromContent[0].match(/^<a:/g) !== null ? true : false;
		const frameImage = await Jimp.read('./assets/frame.png');


		if (isEmojiAnimated) {
			const res = await axios.get(`https://cdn.discordapp.com/emojis/${emojiId}.gif`, { responseType: 'arraybuffer' });

			const emojiGif = await GifUtil.read(res.data);
			const frames = [];
			for (const frame of emojiGif.frames) {
				const emojiGifFrame = GifUtil.copyAsJimp(Jimp, frame);
				emojiGifFrame.resize(128, 128);
				const compositedFrame = frameImage.clone().composite(emojiGifFrame, 7, 27);

				const gifFrame = new GifFrame(
					new BitmapImage(compositedFrame.bitmap),
					{
						disposalMethod: frame.disposalMethod,
						delayCentisecs: frame.delayCentisecs,
					});
				frames.push(gifFrame);
			}

			const codec = new GifCodec();
			GifUtil.quantizeDekker(frames);
			const encodedGif = await codec.encodeGif(frames, { loop: 0 });
			const attachment = new AttachmentBuilder(
				encodedGif.buffer,
				{ name: 'emoji.gif' },
			);

			const channel = interaction.client.channels.cache.get(interaction.channelId);
			channel.send({
				files: [attachment],
			});
		}
		else {
			const emojiImg = await Jimp.read(`https://cdn.discordapp.com/emojis/${emojiId}.png`);
			emojiImg.resize(128, 128);
			frameImage.composite(emojiImg, 7, 27);
			frameImage.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
				if (err) throw err;
				const attachment = new AttachmentBuilder(
					buffer,
					{ name: 'emoji.png' },
				);

				const channel = interaction.client.channels.cache.get(interaction.channelId);
				channel.send({
					files: [attachment],
				});
			});
		}
	},
};