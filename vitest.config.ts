import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    __SPECS_CLI_VERSION__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@rudironsoni/specs-schema': path.resolve(__dirname, './src/schema/index.ts'),
      '@rudironsoni/specs-from-figma': path.resolve(__dirname, './src/from-figma/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/*/tests/**/*.test.ts'],
    typecheck: {
      include: ['src/*/tests/**/*.test-d.ts'],
    },
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/tests/**', 'src/**/types.ts'],
    },
  },
});
