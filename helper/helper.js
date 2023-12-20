const fs = require('fs/promises');
const crypto = require('crypto');

module.exports = {
	/**
	 * Wraps a promise that resolves to a [value, reason] array.
	 * - If the promise is rejected, the `[undefined, reason]` is returned.
	 * - Else if the promise is resolved, the `[value, undefined]` is returned.
	 * @param {*} promise
	 * @returns {Promise<[value: any, reason: any]>}
	 */
	wrap : async (promise) => {
		const [{ value, reason }] = await Promise.allSettled([promise]);
		return [value, reason];
	},

	getCacheDir : (() => {
		const cacheDir = './node_modules/.cache';

		let prom = undefined;
		return () => prom = (prom || (async () => {
			await fs.mkdir(cacheDir, { recursive: true });

			return cacheDir;
		})());
	})(),

	sha: (x) => crypto.createHash('sha256').update(x).digest('hex'),

	fileExists : async (file) => {
		return fs.access(file, fs.constants.F_OK)
			.then(() => true).catch(() => false);
	},
};