import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import _ from 'lodash';
import React, { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { getProperty } from '../../gadgets/helper';
import usePortForward from '../../gadgets/igSocket';
import { HEADLAMP_KEY, HEADLAMP_VALUE, IS_METRIC } from '../helpers';

const MAX_DATA_LIMIT = 20000;

interface GenericGadgetRendererProps {
  podsSelected: string[];
  podStreamsConnected: number;
  podSelected: string;
  setGadgetConfig: (config: any) => void;
  dataColumns: Record<string, string[]>;
  gadgetRunningStatus: boolean;
  filters: Record<string, any>;
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setLoading: (loading: boolean) => void;
  gadgetInstance?: { id: string; gadgetConfig: { version: number } };
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  node: string;
  prepareGadgetInfo: (info: any) => void;
  setPodStreamsConnected: React.Dispatch<React.SetStateAction<number>>;
}

export default function GenericGadgetRenderer({
  podsSelected,
  podStreamsConnected,
  podSelected,
  dataColumns,
  gadgetRunningStatus,
  filters,
  setBufferedGadgetData,
  setLoading,
  gadgetInstance,
  setGadgetData,
  node,
  prepareGadgetInfo,
  setPodStreamsConnected,
}: GenericGadgetRendererProps) {
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`
  );

  const gadgetRef = useRef<any>(null);
  const gadgetRunningStatusRef = useRef(gadgetRunningStatus);
  const { imageName } = useParams<{ imageName: string }>();
  const decodedImageName = decodeURIComponent(imageName || '');

  const processDataColumn = useCallback((payload: any, column: string) => {
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
  }, []);

  function handleGadgetData(data: any, dsID: string) {
    if (!gadgetRunningStatusRef.current && !gadgetInstance) return;

    setLoading(false);
    const columns = dataColumns[dsID] || [];

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

    const debouncedUpdate = _.debounce(() => {
      if (columns.includes(IS_METRIC)) {
        setGadgetData(prevData => ({
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
    }, 1000);

    debouncedUpdate();
  }

  function gadgetStartStopHandler() {
    if (!ig) return;
    setLoading(true);

    const handleDataCallback = (dsID: string, dataFromGadget: any) => {
      const dataToProcess = Array.isArray(dataFromGadget) ? dataFromGadget : [dataFromGadget];

      dataToProcess.forEach(data => handleGadgetData(data, dsID));
    };

    if (gadgetInstance) {
      ig.attachGadgetInstance(
        {
          id: gadgetInstance.id,
          version: gadgetInstance.gadgetConfig.version,
        },
        {
          onGadgetInfo: prepareGadgetInfo,
          onReady: () => console.log('gadget is ready'),
          onDone: () => setLoading(false),
          onError: error => console.error('Gadget error:', error),
          onData: handleDataCallback,
        }
      );
    } else {
      gadgetRef.current = ig.runGadget(
        {
          version: 1,
          imageName: decodedImageName,
          paramValues: filters,
        },
        {
          onGadgetInfo: () => {},
          onReady: () => {
            if (!gadgetRunningStatusRef.current) {
              gadgetRef.current?.stop();
            }
          },
          onDone: () => setLoading(false),
          onError: error => console.error('Gadget error:', error),
          onData: handleDataCallback,
        },
        err => console.error('Gadget run error:', err)
      );
    }
  }

  useEffect(() => {
    if (isConnected) {
      setPodStreamsConnected(prev => (podsSelected.length < prev + 1 ? prev : prev + 1));
    }
  }, [isConnected, podsSelected.length, setPodStreamsConnected]);

  useEffect(() => {
    setLoading(false);
  }, [gadgetInstance, setLoading]);

  useEffect(() => {
    gadgetRunningStatusRef.current = gadgetRunningStatus;
    if (!gadgetRunningStatus && !gadgetInstance && gadgetRef.current?.stop) {
      gadgetRef.current?.stop();
      return;
    }

    if (gadgetRunningStatus && podsSelected.length === podStreamsConnected) {
      gadgetStartStopHandler();
    }
  }, [gadgetRunningStatus]);

  useEffect(() => {
    return () => {
      gadgetRef.current?.stop();
    };
  }, []);

  return null;
}
