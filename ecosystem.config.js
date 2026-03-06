module.exports = {
  apps: [{
    name: 'reactivate-worker',
    script: 'npx',
    args: 'tsx scripts/reactivate-worker.ts',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: { NODE_ENV: 'production' },
  }],
};
