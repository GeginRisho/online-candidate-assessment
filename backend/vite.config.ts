import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@sockets': path.resolve(__dirname, './src/sockets'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});
