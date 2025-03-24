import React, { useEffect, useRef } from 'react';
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
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
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
  setGadgetData,
  node,
  prepareGadgetInfo,
  setPodStreamsConnected,
  imageName,
}: GenericGadgetRendererProps) {
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${podSelected}/portforward?ports=8080`
  );
  const gadgetRef = useRef<any>(null);
  const gadgetRunningStatusRef = useRef(gadgetRunningStatus);
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
      prepareGadgetInfo
    );
    if (gadgetInstance) {
      setTimeout(
        () =>
          ig.attachGadgetInstance(
            {
              id: gadgetInstance.id,
              version: gadgetInstance.gadgetConfig.version,
            },
            callbacks
          ),
        2000
      );
    } else {
      console.log('Running gadget:', decodedImageName);
      console.log('Filters:', filters);
      console.log('node:', node);
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
    if (!gadgetRunningStatus && !gadgetInstance && gadgetRef.current?.stop) {
      gadgetRef.current?.stop();
      return;
    }
    if (gadgetRunningStatus && podsSelected.length === podStreamsConnected) {
      gadgetStartStopHandler();
    }
  }, [gadgetRunningStatus, podStreamsConnected, podsSelected]);

  useEffect(() => {
    return () => {
      gadgetRef.current?.stop();
    };
  }, []);

  return null;
}
