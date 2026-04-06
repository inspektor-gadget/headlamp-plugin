import React, { useEffect, useRef } from 'react';
import usePortForward from '../../gadgets/igSocket';
import { AllColumnMeta, createGadgetCallbacks } from '../../gadgets/utility';

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
  imageName: string;
  columnMeta?: AllColumnMeta;
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
  imageName,
  columnMeta,
}: GenericGadgetRendererProps) {
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`
  );
  const gadgetRef = useRef<any>(null);
  const gadgetRunningStatusRef = useRef(gadgetRunningStatus);
  const attachTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachStopRef = useRef<{ stop?: () => void } | null>(null);
  const mountedRef = useRef(true);
  const decodedImageName = decodeURIComponent(imageName || '');
  function gadgetStartStopHandler() {
    if (!ig) return;
    setLoading(true);

    const callbacks = createGadgetCallbacks(
      node,
      dataColumns,
      setLoading,
      setGadgetData,
      setBufferedGadgetData,
      prepareGadgetInfo,
      columnMeta
    );
    if (gadgetInstance) {
      // Clear any pending attachment timeout
      if (attachTimeoutRef.current) {
        clearTimeout(attachTimeoutRef.current);
        attachTimeoutRef.current = null;
      }
      // Stop any existing attachment
      if (attachStopRef.current?.stop) {
        attachStopRef.current.stop();
        attachStopRef.current = null;
      }

      attachTimeoutRef.current = setTimeout(() => {
        // Guard: ensure component is still mounted and ig is still valid
        if (!mountedRef.current || !ig) {
          return;
        }
        // Note: attachGadgetInstance returns a stop handle but the interface types it as void
        attachStopRef.current = ig.attachGadgetInstance(
          {
            id: gadgetInstance.id,
            version: gadgetInstance.gadgetConfig.version,
          },
          callbacks
        ) as unknown as { stop?: () => void };
      }, 2000);
    } else {
      gadgetRef.current = ig.runGadget(
        {
          version: 1,
          imageName: decodedImageName,
          paramValues: filters,
        },
        {
          ...callbacks,
          onReady: () => {
            if (!gadgetRunningStatusRef.current) {
              gadgetRef.current?.stop();
            }
          },
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
    if (!gadgetRunningStatus && !gadgetInstance) {
      // Stop runGadget
      if (gadgetRef.current?.stop) {
        gadgetRef.current.stop();
      }
      // Clear pending attachment timeout
      if (attachTimeoutRef.current) {
        clearTimeout(attachTimeoutRef.current);
        attachTimeoutRef.current = null;
      }
      // Stop attachment if active
      if (attachStopRef.current?.stop) {
        attachStopRef.current.stop();
        attachStopRef.current = null;
      }
      return;
    }
    if (gadgetRunningStatus && podsSelected.length === podStreamsConnected) {
      gadgetStartStopHandler();
    }
  }, [gadgetRunningStatus, podStreamsConnected, podsSelected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear pending attachment timeout
      if (attachTimeoutRef.current) {
        clearTimeout(attachTimeoutRef.current);
        attachTimeoutRef.current = null;
      }
      // Stop attachment if active
      if (attachStopRef.current?.stop) {
        attachStopRef.current.stop();
        attachStopRef.current = null;
      }
      // Stop runGadget if active
      gadgetRef.current?.stop();
    };
  }, []);

  return null;
}
