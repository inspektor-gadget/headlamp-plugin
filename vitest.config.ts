
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        alias: {
            '@kinvolk/headlamp-plugin/lib': path.resolve(__dirname, 'node_modules/@kinvolk/headlamp-plugin/lib'),
        },
        deps: {
            // Inline headlamp-plugin to ensure it's processed if needed, though mostly we mock it.
            inline: ['@kinvolk/headlamp-plugin'],
        },
    },
});
