import React from 'react';
import { useParams } from 'react-router';
import { isIGPod } from './helper';
import usePortForward from './igSocket';

function gadgetConn(nodes, pods) {
  const node = nodes[0];
  const pod = pods.find(pod => {
    return pod.jsonData.spec.nodeName === node.jsonData.metadata.name && isIGPod(pod.jsonData);
  });
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${pod?.jsonData.metadata.name}/portforward?ports=8080`
  );
  if (!isConnected) {
    return null;
  }
  return ig;
}

export function isIGInstalled(pods) {
  if (pods === null) {
    return null;
  }
  return pods.some(pod => isIGPod(pod.jsonData));
}

export function GadgetConnectionForBackgroundRunningProcess(props: {
  nodes: any[];
  pods: any[];
  callback: (ig: any) => void;
  prepareGadgetInfo: (info: any) => void;
  setIsGadgetInfoFetched?: (isGadgetInfoFetched: boolean) => void;
}) {
  const { nodes, pods, callback, prepareGadgetInfo, setIsGadgetInfoFetched } = props;
  const { imageName } = useParams<{ imageName: string }>();
  const decodedImageName = decodeURIComponent(imageName);
  let ig = gadgetConn(nodes, pods);

  if (nodes && pods) {
    ig = gadgetConn(nodes, pods);
  }

  React.useEffect(() => {
    if (ig && prepareGadgetInfo) {
      ig.getGadgetInfo(
        {
          version: 1,
          imageName: `${decodedImageName}`,
        },
        info => {
          prepareGadgetInfo(info);
          setIsGadgetInfoFetched(true);
        },
        err => {
          console.error(err);
        }
      );
    }
  }, [ig]);

  React.useEffect(() => {
    if (ig) {
      callback(ig);
    }
  }, [ig]);

  return null;
}
