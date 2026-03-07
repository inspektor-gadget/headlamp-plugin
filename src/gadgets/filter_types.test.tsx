/** @vitest-environment jsdom */
import { describe, test, expect } from 'vitest';
import { FILTERS_TYPE } from './filter_types';

describe('gadget filter types', () => {
    test('exports FILTERS_TYPE constant', () => {
        expect(FILTERS_TYPE).toBeDefined();
        expect(typeof FILTERS_TYPE).toBe('object');
    });

    test('uint32 filter is mapped correctly', () => {
        expect(FILTERS_TYPE.uint32).toBeDefined();
        expect(FILTERS_TYPE.uint32.type).toBe('number');
        expect(FILTERS_TYPE.uint32.max).toBe(4294967295);
        expect(FILTERS_TYPE.uint32.min).toBe(0);
    });

    test('int32 filter is mapped correctly', () => {
        expect(FILTERS_TYPE.int32).toBeDefined();
        expect(FILTERS_TYPE.int32.type).toBe('number');
        expect(FILTERS_TYPE.int32.max).toBe(2147483647);
        expect(FILTERS_TYPE.int32.min).toBe(-2147483648);
    });

    test('string filter is mapped correctly', () => {
        expect(FILTERS_TYPE.string).toBeDefined();
        expect(FILTERS_TYPE.string.type).toBe('string');
    });

    test('bool filter is mapped correctly', () => {
        expect(FILTERS_TYPE.bool).toBeDefined();
        expect(FILTERS_TYPE.bool.type).toBe('checkbox');
    });

    test('[]string filter is mapped correctly', () => {
        expect(FILTERS_TYPE['[]string']).toBeDefined();
        expect(FILTERS_TYPE['[]string'].type).toBe('string');
    });
});
