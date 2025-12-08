/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/utils/*.ts'],
            exclude: ['src/utils/*.test.ts', 'src/utils/index.ts']
        }
    }
});
