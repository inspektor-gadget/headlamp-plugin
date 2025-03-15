import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../common/helpers';
import { getProperty } from './helper';

export const MAX_DATA_LIMIT = 20000;

/**
 * Process a single column of gadget data
 */
export const processDataColumn = (payload: any, column: string): React.ReactNode | null => {
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
    default:
      return JSON.stringify(value).replace(/['"]+/g, '');
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
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>
) => {
  if (columns.length === 0) return;

  const massagedData: Record<string, any> = columns.includes(IS_METRIC)
    ? data
    : columns.reduce((acc, column) => {
        const processedValue = processDataColumn(data, column);
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
  prepareGadgetInfo?: (info: any) => void
) => {
  return {
    onGadgetInfo: prepareGadgetInfo || (() => {}),
    onReady: () => console.log('gadget is ready'),
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
          setBufferedGadgetData
        )
      );
    },
  };
};