import React from 'react';
import { useParams } from 'react-router';
import { isIGPod } from './helper';
import usePortForward from './igSocket';

export function useGadgetConn(nodes: any | any[] | null, pods: any[] | null) {
  // Always declare state hooks at the top level
  const [portForwardUrl, setPortForwardUrl] = React.useState<string | null>(null);
  // Update URL in effect to avoid conditional hook calls
  React.useEffect(() => {
    if (!nodes || !pods || nodes.length === 0) {
      setPortForwardUrl(null);
      return;
    }
    let pod;
    // if nodes is not array
    if (!Array.isArray(nodes)) {
      pod = pods.find(pod => pod.jsonData.spec.nodeName === nodes && isIGPod(pod.jsonData));
    } else {
      pod = pods.find(
        pod =>
          pod.jsonData.spec.nodeName === nodes[0]?.jsonData.metadata.name && isIGPod(pod.jsonData)
      );
    }
    const url =
      pod && isIGInstalled(pods)
        ? `api/v1/namespaces/gadget/pods/${pod.jsonData.metadata.name}/portforward?ports=8080`
        : null;
    setPortForwardUrl(url);
  }, [nodes, pods]);

  // Always call usePortForward with the state value
  const { ig, isConnected } = usePortForward(portForwardUrl);
  return isConnected ? ig : null;
}

export function isIGInstalled(pods: any[] | null) {
  if (!pods) {
    return null;
  }
  return pods.some(pod => isIGPod(pod.jsonData));
}

// RunningGadgetsForResource.tsx
interface Props {
  nodes: any[];
  pods: any[];
  callback: (ig: any) => void;
  prepareGadgetInfo: (info: any) => void;
  setIsGadgetInfoFetched?: (isGadgetInfoFetched: boolean) => void;
}

export function GadgetConnectionForBackgroundRunningProcess({
  nodes,
  pods,
  callback,
  prepareGadgetInfo,
  setIsGadgetInfoFetched,
}: Props) {
  // Always declare all hooks at the top level
  const [decodedImageName, setDecodedImageName] = React.useState<string>('');
  const { imageName } = useParams<{ imageName: string }>();
  const ig = useGadgetConn(nodes, pods);

  // Handle URL decoding in effect
  React.useEffect(() => {
    if (imageName) {
      setDecodedImageName(decodeURIComponent(imageName));
    }
  }, [imageName]);

  // Handle gadget info fetching
  React.useEffect(() => {
    if (!ig || !prepareGadgetInfo || !decodedImageName) {
      return;
    }

    ig.getGadgetInfo(
      {
        version: 1,
        imageName: decodedImageName,
      },
      (info: any) => {
        prepareGadgetInfo(info);
        setIsGadgetInfoFetched?.(true);
      },
      (err: Error) => {
        console.error('Failed to get gadget info:', err);
      }
    );
  }, [ig, decodedImageName, prepareGadgetInfo, setIsGadgetInfoFetched]);

  // Handle callback
  React.useEffect(() => {
    if (ig) {
      callback(ig);
    }
  }, [ig, callback]);

  return null;
}
