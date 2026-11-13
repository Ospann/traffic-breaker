import { fileURLToPath } from 'node:url';
import playgamaBridge from '@playgama/bridge/vite';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const platform = env.VITE_PLATFORM || (command === 'serve' ? 'mock' : 'bridge');
  if (platform !== 'mock' && platform !== 'bridge') {
    throw new Error(`Unknown VITE_PLATFORM "${platform}", expected "mock" or "bridge"`);
  }

  const plugins: PluginOption[] = [];
  if (platform === 'bridge') plugins.push(playgamaBridge({ mode: 'local' }));

  return {
    base: './',
    plugins,
    define: {
      'import.meta.env.VITE_PLATFORM': JSON.stringify(platform),
    },
    resolve: {
      alias: {
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      },
    },
    server: {
      host: true,
    },
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 2000,
      sourcemap: false,
    },
  };
});
