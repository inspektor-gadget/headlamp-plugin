
import '@testing-library/jest-dom';
import { generateRandomString, updateInstanceFromStorage, IS_METRIC } from './helpers';
import { describe, it, expect, beforeEach } from 'vitest';

describe('helpers', () => {
    describe('generateRandomString', () => {
        it('should generate a string of default length 6', () => {
            const str = generateRandomString();
            expect(str).toHaveLength(6);
            expect(typeof str).toBe('string');
        });

        it('should generate a string of specified length', () => {
            const str = generateRandomString(10);
            expect(str).toHaveLength(10);
        });

        it('should generate different strings on subsequent calls', () => {
            const str1 = generateRandomString();
            const str2 = generateRandomString();
            expect(str1).not.toBe(str2);
        });
    });

    describe('updateInstanceFromStorage', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should return null if instance is not found', () => {
            const result = updateInstanceFromStorage('non-existent-id');
            expect(result).toBeNull();
        });

        it('should update existing instance correctly', () => {
            const initialInstance = {
                id: 'test-id',
                name: 'Test Gadget',
                isEmbedded: false,
                gadgetConfig: { paramValues: {} }
            };
            localStorage.setItem('headlamp_embeded_resources', JSON.stringify([initialInstance]));

            const updated = updateInstanceFromStorage(
                'test-id',
                'Pod',
                true, // isHeadless
                { filter: 'value' }
            );

            expect(updated).not.toBeNull();
            expect(updated.id).toBe('test-id');
            expect(updated.kind).toBe('Pod');
            expect(updated.isEmbedded).toBe(true);
            expect(updated.isHeadless).toBe(true);
            expect(updated.gadgetConfig.paramValues).toEqual({ filter: 'value' });
            expect(updated.name).toBe('Test Gadget');

            // Verify storage update
            const stored = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual(updated);
        });

        it('should handle None embedView correctly', () => {
            const initialInstance = {
                id: 'test-id',
                name: 'Test Gadget',
                kind: 'Pod',
                isEmbedded: true,
                gadgetConfig: { paramValues: {} }
            };
            localStorage.setItem('headlamp_embeded_resources', JSON.stringify([initialInstance]));

            const updated = updateInstanceFromStorage(
                'test-id',
                'None'
            );

            expect(updated.kind).toBeUndefined();
            expect(updated.isEmbedded).toBe(false);
        });
    });

    describe('Constants', () => {
        it('should export correct constants', () => {
            expect(IS_METRIC).toBe('isMetric');
        });
    });
});
