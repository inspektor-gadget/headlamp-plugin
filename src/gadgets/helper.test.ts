/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    IG_CONTAINER_KEY,
    IG_CONTAINER_VALUE,
    isIGPod,
    removeDuplicates,
    getProperty,
    createIdentifier,
    parseIdentifier,
    isIdentifier,
    isElectron,
    isDockerDesktop,
    getServerURL,
} from './helper';

describe('gadgets helper utilities', () => {
    let originalWindow: any;
    let originalProcess: any;
    let originalNavigator: any;

    beforeEach(() => {
        // Save globals for restoring
        originalWindow = global.window;
        originalProcess = global.process;
        originalNavigator = global.navigator;
    });

    afterEach(() => {
        // Restore globals
        global.window = originalWindow;
        global.process = originalProcess;
        global.navigator = originalNavigator;
        vi.restoreAllMocks();
    });

    describe('isIGPod', () => {
        test('returns false if podResource has no labels', () => {
            const podResource = { metadata: {} };
            expect(isIGPod(podResource)).toBe(false);
        });

        test('returns true if podResource has matching IG container label', () => {
            const podResource = {
                metadata: {
                    labels: {
                        [IG_CONTAINER_KEY]: IG_CONTAINER_VALUE,
                    },
                },
            };
            expect(isIGPod(podResource)).toBe(true);
        });

        test('returns false if podResource has labels but no matching IG label', () => {
            const podResource = {
                metadata: {
                    labels: {
                        'some-other-key': 'some-value',
                    },
                },
            };
            expect(isIGPod(podResource)).toBe(false);
        });
    });

    describe('removeDuplicates', () => {
        test('removes duplicate objects based on "key" property', () => {
            const input = [
                { key: 'a', value: 1 },
                { key: 'b', value: 2 },
                { key: 'a', value: 3 }, // Duplicate key
            ];
            const expected = [
                { key: 'a', value: 1 },
                { key: 'b', value: 2 },
            ];
            expect(removeDuplicates(input)).toEqual(expected);
        });

        test('returns an empty array when given an empty array', () => {
            expect(removeDuplicates([])).toEqual([]);
        });

        test('returns the same array if there are no duplicates', () => {
            const input = [
                { key: 'a', value: 1 },
                { key: 'b', value: 2 },
            ];
            expect(removeDuplicates(input)).toEqual(input);
        });
    });

    describe('getProperty', () => {
        test('returns nested property value using dot notation', () => {
            const obj = { user: { profile: { name: 'Alice' } } };
            expect(getProperty(obj, 'user.profile.name')).toBe('Alice');
        });

        test('returns undefined if property does not exist', () => {
            const obj = { user: { profile: { name: 'Alice' } } };
            expect(getProperty(obj, 'user.profile.age')).toBeUndefined();
        });

        test('handles missing intermediate objects gracefully', () => {
            const obj = { user: {} };
            expect(getProperty(obj, 'user.profile.name')).toBeUndefined();
        });

        test('returns direct property value', () => {
            const obj = { name: 'Alice' };
            expect(getProperty(obj, 'name')).toBe('Alice');
        });
    });

    describe('createIdentifier', () => {
        test('returns serialized string with prefix', () => {
            const result = createIdentifier('id', '123');
            expect(result).toBe('headlamp_{"id":"123"}');
        });
    });

    describe('parseIdentifier', () => {
        test('parses the serialized string back into an object', () => {
            const input = 'headlamp_{"id":"123"}';
            expect(parseIdentifier(input)).toEqual({ id: '123' });
        });
    });

    describe('isIdentifier', () => {
        test('returns true if string starts with "headlamp_"', () => {
            expect(isIdentifier('headlamp_something')).toBe(true);
        });

        test('returns false if string does not start with "headlamp_"', () => {
            expect(isIdentifier('headlampsomething')).toBe(false);
            expect(isIdentifier('other_headlamp_')).toBe(false);
        });
    });

    describe('isElectron', () => {
        test('returns true if window.process.type is renderer', () => {
            global.window = {
                process: { type: 'renderer' }
            } as any;
            expect(isElectron()).toBe(true);
        });

        test('returns true if process.versions.electron is defined', () => {
            global.window = {} as any;
            global.process = { versions: { electron: '1.0.0' } } as any;
            expect(isElectron()).toBe(true);
        });

        test('returns true if navigator.userAgent contains Electron', () => {
            global.window = {} as any;
            global.process = {} as any;
            global.navigator = { userAgent: 'Mozilla/5.0 Electron/1.0.0' } as any;
            expect(isElectron()).toBe(true);
        });

        test('returns false in non-electron environment', () => {
            global.window = {} as any;
            global.process = {} as any;
            global.navigator = { userAgent: 'Chrome' } as any;
            expect(isElectron()).toBe(false);
        });
    });

    describe('isDockerDesktop', () => {
        test('returns false if window.ddClient is undefined', () => {
            global.window = {} as any;
            expect(isDockerDesktop()).toBe(false);
        });

        test('returns true if window.ddClient is defined', () => {
            global.window = { ddClient: {} } as any;
            expect(isDockerDesktop()).toBe(true);
        });
    });

    describe('getServerURL', () => {
        test('returns Docker Desktop URL if isDockerDesktop is true', () => {
            global.window = { ddClient: {} } as any;
            expect(getServerURL()).toBe('http://localhost:64446');
        });

        test('returns default URL if isDockerDesktop is false', () => {
            global.window = {} as any;
            expect(getServerURL()).toBe('http://localhost:4466');
        });
    });
});
