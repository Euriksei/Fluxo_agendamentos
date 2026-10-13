// pm2 da VPS: 1 processo em fork (o rate limit do express-rate-limit fica em memória, cluster quebraria a contagem por IP).
// cwd = backend/ porque o dotenv lê o .env do diretório atual. Logs em ~deploy/.pm2/logs.
// .cjs porque o package.json da raiz é "type": "module" e o pm2 carrega o ecosystem com require().
module.exports = {
    apps: [
        {
            name: 'fluxo',
            script: 'app.js',
            cwd: '/home/deploy/fluxo/backend',

            exec_mode: 'fork',
            instances: 1,
            watch: false,
            max_memory_restart: '500M',

            env_production: {
                NODE_ENV: 'production'
            },

            time: true,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000,
            kill_timeout: 5000
        }
    ]
};
