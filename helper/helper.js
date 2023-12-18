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
};