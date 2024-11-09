import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import React from 'react';
import { isIGPod } from '../../gadgets/helper';

export function NodeSelection(props: { setPodStreamsConnected: any; setPodsSelected: any }) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodesSelected, setNodesSelected] = React.useState([]);
  const { setPodStreamsConnected, setPodsSelected } = props;

  return (
    <SectionBox title="Select a node you want to run the gadget on" backLink>
      {
        <>
          {nodes === null && <Loader title="" />}
          {nodes?.map(node => {
            return (
              <Box>
                <FormControlLabel
                  control={<Checkbox />}
                  label={node.metadata.name}
                  onChange={e => {
                    let selectedNodes;
                    if (e.target.checked) {
                      selectedNodes = [...nodesSelected, node.metadata.name];
                      setNodesSelected(selectedNodes);
                    } else {
                      selectedNodes = nodesSelected.filter(n => n !== node.metadata.name);
                      setNodesSelected(selectedNodes);
                      setPodStreamsConnected(prev => prev - 1);
                    }
                    const podsInterestedIn = [];
                    selectedNodes.forEach(nodeName => {
                      podsInterestedIn.push(
                        ...[...pods.filter(pod => pod.spec.nodeName === nodeName && isIGPod(pod))]
                      );
                    });
                    setPodsSelected(...[podsInterestedIn]);
                  }}
                />
              </Box>
            );
          })}
        </>
      }
    </SectionBox>
  );
}
