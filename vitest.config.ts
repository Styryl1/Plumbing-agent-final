/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Load Temporal polyfill for workbench tests that use it
    setupFiles: [
      path.resolve(__dirname, 'workbench/tests/_setup/env-safety.ts')
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Mock configuration: preserve implementations across tests
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Mock Next.js environment flags for testing
    'process.env.NODE_ENV': '"test"',
  },
  // Handle server-only imports in test environment
  ssr: {
    noExternal: ['server-only'],
  },
})