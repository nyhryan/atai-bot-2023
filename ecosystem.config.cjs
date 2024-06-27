module.exports = {
	apps : [{
		name   : 'Discord Bot',
		script : './dist/index.js',
		interpreter: '$HOME/.bun/bin/bun',
		cwd: '$HOME/actions-runner/_work/atai-bot-2023/atai-bot-2023/',
	}],
};