import { act, renderHook } from '@testing-library/react';
import { useGadgetState } from './index';

describe('useGadgetState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useGadgetState());

    expect(result.current.podsSelected).toEqual([]);
    expect(result.current.gadgetData).toEqual({});
    expect(result.current.gadgetRunningStatus).toBe(false);
    expect(result.current.dynamicTabs).toEqual([]);
    expect(result.current.activeTabIndex).toBe(0);
  });

  it('adds new dynamic tab and sets it as active (index offsets two static tabs)', () => {
    const { result } = renderHook(() => useGadgetState());
    const row = { id: 'tab1', data: 'test' };

    act(() => {
      result.current.addDynamicTab(row);
    });

    expect(result.current.dynamicTabs).toHaveLength(1);
    expect(result.current.dynamicTabs[0]).toEqual({
      id: 'tab1',
      label: 'tab1',
      content: row,
    });
    expect(result.current.activeTabIndex).toBe(2);
  });

  it('sets existing tab as active when adding duplicate', () => {
    const { result } = renderHook(() => useGadgetState());
    const row = { id: 'tab1', data: 'test' };

    act(() => {
      result.current.addDynamicTab(row);
    });

    act(() => {
      result.current.addDynamicTab(row);
    });

    expect(result.current.dynamicTabs).toHaveLength(1);
    expect(result.current.activeTabIndex).toBe(2);
  });

  it('removes dynamic tab and adjusts active index', () => {
    const { result } = renderHook(() => useGadgetState());

    act(() => {
      result.current.addDynamicTab({ id: 'tab1' });
      result.current.addDynamicTab({ id: 'tab2' });
      result.current.setActiveTabIndex(3);
      result.current.removeDynamicTab(0);
    });

    expect(result.current.dynamicTabs).toHaveLength(1);
    expect(result.current.activeTabIndex).toBe(2);
  });

  it('handles removeDynamicTab when active tab equals removed index', () => {
    const { result } = renderHook(() => useGadgetState());

    act(() => {
      result.current.addDynamicTab({ id: 'tab1' });
      result.current.setActiveTabIndex(2);
      result.current.removeDynamicTab(0);
    });

    expect(result.current.activeTabIndex).toBe(1);
  });

  it('handles removeDynamicTab when active tab is before removed index', () => {
    const { result } = renderHook(() => useGadgetState());

    act(() => {
      result.current.addDynamicTab({ id: 'tab1' });
      result.current.setActiveTabIndex(1);
      result.current.removeDynamicTab(0);
    });

    expect(result.current.activeTabIndex).toBe(1);
  });

  it('prepares gadget info with metric annotations', () => {
    const { result } = renderHook(() => useGadgetState());
    const info = {
      dataSources: [
        {
          id: 'ds1',
          annotations: { 'metrics.print': 'true' },
          fields: [
            { fullName: 'keyField', flags: 0, tags: ['role:key'] },
            { fullName: 'valueField', flags: 0, tags: [], annotations: { 'metrics.unit': 'ms' } },
            { fullName: 'k8s', flags: 0, tags: [] },
            { fullName: 'hiddenField', flags: 4, tags: [] },
          ],
        },
      ],
    };

    act(() => {
      result.current.prepareGadgetInfo(info);
    });

    expect(result.current.isGadgetInfoFetched).toBe(true);
    expect(result.current.gadgetConfig).toEqual(info);
    expect(result.current.dataColumns.ds1).toContain('keyField');
    expect(result.current.dataColumns.ds1).toContain('headlamp_key_keyField');
    expect(result.current.dataColumns.ds1).toContain('headlamp_value_valueField');
    expect(result.current.dataColumns.ds1).toContain('headlamp_metric_unit_ms');
    expect(result.current.dataColumns.ds1).toContain('isMetric');
  });

  it('prepares gadget info without metric annotations', () => {
    const { result } = renderHook(() => useGadgetState());
    const info = {
      dataSources: [
        {
          fields: [
            { fullName: 'field1', flags: 0 },
            { fullName: 'k8s', flags: 0 },
          ],
        },
      ],
    };

    act(() => {
      result.current.prepareGadgetInfo(info);
    });

    expect(result.current.dataColumns[0]).toEqual(['field1']);
  });
});
