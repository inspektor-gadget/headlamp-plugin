import React from 'react';
import { isIGPod } from './helper';
import usePortForward from './igSocket';

function gadgetConn(nodes, pods) {
  const node = nodes[0];
  const pod = pods.filter(pod => pod.spec.nodeName === node.metadata.name && isIGPod(pod))[0];
  const { ig, isConnected } = usePortForward(
    `api/v1/namespaces/gadget/pods/${pod.jsonData.metadata.name}/portforward?ports=8080`
  );
  if (!isConnected) {
    return null;
  }
  return ig;
}

export function GadgetConnectionForBackgroundRunningProcess(props: {
  nodes: any[];
  pods: any[];
  callback: (ig: any) => void;
}) {
  const { nodes, pods, callback } = props;
  const ig = gadgetConn(nodes, pods);

  React.useEffect(() => {
    if (ig) {
      callback(ig);
    }
  }, [ig]);

  return null;
}
