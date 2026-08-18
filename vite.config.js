import { defineConfig, loadEnv } from 'vite';
import copy from 'rollup-plugin-copy';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { existsSync, readFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useHttps = env.VITE_DEV_HTTPS !== 'false';
  const certPath = env.VITE_DEV_HTTPS_CERT || './cert.pem';
  const keyPath = env.VITE_DEV_HTTPS_KEY || './private.key';
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;
  const hasCustomCerts = existsSync(certPath) && existsSync(keyPath);

  const plugins = [
    vue(),
    copy({
      targets: [
        { src: 'public/fonts/*', dest: 'dist/assets/fonts' },
      ],
      verbose: true,
      hook: 'writeBundle',
      apply: 'build',
    }),
  ];

  if (useHttps && !hasCustomCerts) {
    plugins.push(basicSsl());
  }

  const httpsConfig = useHttps
    ? hasCustomCerts
      ? {
          cert: readFileSync(certPath),
          key: readFileSync(keyPath),
        }
      : true
    : undefined;

  return {
    plugins,
    test: {
      browser: {
        enabled: true,
        name: 'chromium',
      },
    },
    server: {
      host: env.VITE_DEV_HOST || 'localhost',
      port: Number(env.VITE_DEV_PORT || 5173),
      ...(httpsConfig ? { https: httpsConfig } : {}),
      ...(proxyTarget
        ? {
            proxy: {
              '/requests.json': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            },
          }
        : {}),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('node_modules/vuetify')) {
              return 'vendor-vuetify';
            }

            return 'vendor';
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name?.startsWith('vendor')) {
              return 'assets/[name]-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          },
        },
      },
    },
  };
});
