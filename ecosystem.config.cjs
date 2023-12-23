module.exports = {
	apps : [{
		name   : 'Discord Bot',
		script : './dist/index.js',
		cwd: '/home/atai/actions-runner/_work/atai-bot-2023/atai-bot-2023/',
		interpreter: '~/.bun/bin/bun',
		instances: 'max',
		exec_mode: 'cluster',
	}],
};