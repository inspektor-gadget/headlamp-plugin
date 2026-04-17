import React, { useEffect, useRef } from 'react';
import { gadgetRegistry } from '../../gadgets/GadgetRegistry';
import usePortForward from '../../gadgets/igSocket';
import { createGadgetCallbacks } from '../../gadgets/utility';

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
  node: string;
  prepareGadgetInfo: (info: any) => void;
  setPodStreamsConnected: React.Dispatch<React.SetStateAction<number>>;
  imageName: string;
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
  node,
  prepareGadgetInfo,
  setPodStreamsConnected,
  imageName,
}: GenericGadgetRendererProps) {
  const {
    ig,
    isConnected,
    error: connectionError,
  } = usePortForward(`api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`);

  const gadgetExecutionId = useRef<string>(
    gadgetInstance?.id || `${imageName}-${node}-${podSelected}`
  );
  const mountedRef = useRef(true);
  const decodedImageName = decodeURIComponent(imageName || '');

  // Update registry status if connection status changes
  useEffect(() => {
    gadgetRegistry.register(gadgetExecutionId.current, decodedImageName);
    gadgetRegistry.updateStatus(gadgetExecutionId.current, {
      isConnected,
      error: connectionError || undefined,
    });
  }, [isConnected, connectionError, decodedImageName]);

  async function gadgetStartStopHandler() {
    if (!ig) return;
    setLoading(true);

    const callbacks = createGadgetCallbacks(
      node,
      dataColumns,
      setLoading,
      setBufferedGadgetData,
      prepareGadgetInfo
    );

    try {
      if (gadgetInstance) {
        await gadgetRegistry.attachGadget(
          ig,
          gadgetExecutionId.current,
          {
            id: gadgetInstance.id,
            version: gadgetInstance.gadgetConfig.version,
          },
          callbacks
        );
      } else {
        await gadgetRegistry.runGadget(
          ig,
          gadgetExecutionId.current,
          {
            version: 1,
            imageName: decodedImageName,
            paramValues: filters,
          },
          {
            ...callbacks,
            onReady: () => {
              callbacks.onReady();
              // Internal check if still should be running
              const status = gadgetRegistry.getStatus(gadgetExecutionId.current);
              if (status && !status.isRunning) {
                status.stop?.();
              }
            },
          }
        );
      }
    } catch (err) {
      console.error('Gadget execution error:', err);
      setLoading(false);
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
    if (!gadgetRunningStatus) {
      gadgetRegistry.updateStatus(gadgetExecutionId.current, { isRunning: false });
      const status = gadgetRegistry.getStatus(gadgetExecutionId.current);
      status?.stop?.();
      return;
    }

    if (gadgetRunningStatus && podsSelected.length === podStreamsConnected) {
      gadgetStartStopHandler();
    }
  }, [gadgetRunningStatus, podStreamsConnected, podsSelected, ig]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const id = gadgetExecutionId.current;
      gadgetRegistry.unregister(id);
    };
  }, []);

  return null;
}
