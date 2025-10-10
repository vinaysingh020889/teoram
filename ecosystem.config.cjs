module.exports = {
  apps: [
    {
      name: "teoram-api",
      cwd: "./apps/api",
      script: "pnpm",
      args: "start",               // or "dev" for development
      interpreter: "none",         // allows pnpm execution directly
      instances: 1,                // increase if you want clustering
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "teoram-workers",
      cwd: "./apps/workers",
      script: "pnpm",
      args: "start",
      interpreter: "none",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "teoram-cms",
      cwd: "./apps/cms",
      script: "pnpm",
      args: "start",               // `pnpm start` must run Next.js
      interpreter: "none",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
