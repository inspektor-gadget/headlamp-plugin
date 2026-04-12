import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../common/helpers';
import { getProperty } from './helper';

export const MAX_DATA_LIMIT = 20000;

export type FieldMeta = { type?: string; annotations?: Record<string, string> };
export type ColumnMeta = Record<string, FieldMeta>;
export type AllColumnMeta = Record<string, ColumnMeta>;

export function getSortedColumns(columns: string[], annotations?: Record<string, string>): string[] {
  const preferredOrderStr = annotations?.['columns'];
  if (preferredOrderStr) {
    const preferredOrder = preferredOrderStr.split(',').map(s => s.trim());
    return [...columns].sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  // Fallback: prioritize k8s columns
  const k8sOrder = ['k8s.node', 'k8s.namespace', 'k8s.podName', 'k8s.containerName'];
  return [...columns].sort((a, b) => {
    const isAK8s = a.startsWith('k8s.');
    const isBK8s = b.startsWith('k8s.');
    if (isAK8s && !isBK8s) return -1;
    if (!isAK8s && isBK8s) return 1;
    if (isAK8s && isBK8s) {
      const idxA = k8sOrder.indexOf(a);
      const idxB = k8sOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return 0;
  });
}

/**
 * Format a nanosecond duration into a human-readable string.
 */
export function formatDuration(ns: number): string {
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

/**
 * Process a single column of gadget data
 */
export const processDataColumn = (
  payload: any,
  column: string,
  fieldMeta?: FieldMeta
): React.ReactNode | null => {
  if (column === IS_METRIC || column.includes(HEADLAMP_KEY) || column.includes(HEADLAMP_VALUE)) {
    return null;
  }

  const value = getProperty(payload, column);

  switch (column) {
    case 'k8s.containerName':
      return value;
    case 'k8s.namespace':
    case 'k8s.node':
      return (
        <Link routeName={column} params={{ name: value }}>
          {value}
        </Link>
      );
    case 'k8s.podName':
      return payload.k8s['namespace'] ? (
        <Link routeName="pod" params={{ name: value, namespace: payload.k8s['namespace'] }}>
          {value}
        </Link>
      ) : (
        value
      );
    default: {
      const raw = JSON.stringify(value).replace(/['"]+/g, '');
      const isDuration =
        fieldMeta?.type === 'gadget_duration_ns' ||
        fieldMeta?.annotations?.['columns.formatter'] === 'duration';
      if (isDuration) {
        const ns = Number(value);
        return isNaN(ns) ? raw : formatDuration(ns);
      }
      return raw;
    }
  }
};

/**
 * Process gadget data and update state
 */
export const processGadgetData = (
  data: any,
  dsID: string,
  columns: string[],
  node: string,
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>,
  columnMetaForDs?: ColumnMeta
) => {
  if (columns.length === 0) return;

  const massagedData: Record<string, any> = columns.includes(IS_METRIC)
    ? data
    : columns.reduce((acc, column) => {
      const processedValue = processDataColumn(data, column, columnMetaForDs?.[column]);
      if (processedValue !== null) {
        acc[column] = processedValue;
      }
      return acc;
    }, {});

  if (columns.includes(IS_METRIC)) {
    setBufferedGadgetData(prevData => ({
      ...prevData,
      [dsID]: {
        ...prevData[dsID],
        [node]: massagedData,
      },
    }));
  } else {
    setBufferedGadgetData(prevData => {
      const newData = [...(prevData[dsID] || []), massagedData];
      return {
        ...prevData,
        [dsID]: newData.slice(-MAX_DATA_LIMIT),
      };
    });
  }
};

/**
 * Setup gadget callbacks
 */
export const createGadgetCallbacks = (
  node: string,
  dataColumns: Record<string, string[]>,
  setLoading: (loading: boolean) => void,
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>,
  prepareGadgetInfo?: (info: any) => void,
  columnMeta?: AllColumnMeta
) => {
  return {
    onGadgetInfo: prepareGadgetInfo || (() => { }),
    onReady: () => setLoading(false),
    onDone: () => setLoading(false),
    onError: (error: any) => console.error('Gadget error:', error),
    onData: (dsID: string, dataFromGadget: any) => {
      const dataToProcess = Array.isArray(dataFromGadget) ? dataFromGadget : [dataFromGadget];
      setLoading(false);
      dataToProcess.forEach(data =>
        processGadgetData(
          data,
          dsID,
          dataColumns[dsID] || [],
          node,
          setGadgetData,
          setBufferedGadgetData,
          columnMeta?.[dsID]
        )
      );
    },
  };
};
