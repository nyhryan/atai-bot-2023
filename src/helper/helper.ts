import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/**
 * Wraps a promise that resolves to a [value, reason] array.
 * - If the promise is rejected, the `[undefined, reason]` is returned.
 * - Else if the promise is resolved, the `[value, undefined]` is returned.
 * @param promise The promise to wrap.
 * @returns A promise that resolves to a `[value, reason]` array.
 */
export const wrap = async (promise: Promise<any>) => {
	const [result] = await Promise.allSettled([promise]);
	const value = result.status === 'fulfilled' ? result.value : undefined;
	const reason = result.status === 'rejected' ? result.reason : undefined;
	return [value, reason];
};

export const getDirName = (url: string | URL) => path.dirname(fileURLToPath(url));

export const getCacheDir = (() => {
	const cacheDir = './.emoji_cache';

	let prom: Promise<string> | undefined;
	return () => prom = (prom || (async () => {
		await fs.promises.mkdir(cacheDir, { recursive: true });

		return cacheDir;
	})());
})();

export const sha = (x: string) => {
	const hasher = new Bun.CryptoHasher('sha256');
	hasher.update(x);
	return hasher.digest('hex');
};

export const fileExists = async (filePath: string) => {
	const file = Bun.file(filePath);
	const result = await file.exists();
	if (result) return true;
	else return false;
};