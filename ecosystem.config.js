module.exports = {
	apps : [{
		name   : 'Discord Bot',
		script : './dist/index.js',
		interpreter: '~/.bun/bin/bun',
		instances: 'max',
		exec_mode: 'cluster',
	}],
};