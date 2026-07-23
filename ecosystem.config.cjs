module.exports = {
  apps: [
    {
      name: 'sistema-infra',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '400M',
      time: true,
    },
  ],
}
