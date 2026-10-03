module.exports = {
    apps: [
        {
            name: 'fluxo',
            script: './backend/app.js',
            cwd: '/var/www/fluxo',
            
            instances: 'max',
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '500M',

            env_production: {
                NODE_ENV: 'production',
                PORT: 3001
            },

            env_development: {
                NODE_ENV: 'development',
                PORT: 3001
            },

            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: '/var/log/pm2/minha-api-error.log',
            out_file: '/var/log/pm2/minha-api-out.log',
            merge_logs: true,

            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000,

            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,
        }
    ]
}