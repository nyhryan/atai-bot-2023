import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Wraps a promise that resolves to a [value, reason] array.
 * - If the promise is rejected, the `[undefined, reason]` is returned.
 * - Else if the promise is resolved, the `[value, undefined]` is returned.
 * @param promise The promise to wrap.
 * @returns A promise that resolves to a `[value, reason]` array.
 */
export async function wrap(promise: Promise<any>): Promise<[any, any]> {
	const [result] = await Promise.allSettled([promise]);
	const value = result.status === 'fulfilled' ? result.value : undefined;
	const reason = result.status === 'rejected' ? result.reason : undefined;
	return [value, reason];
}

export const getDirName = (url: string | URL) => path.dirname(fileURLToPath(url));