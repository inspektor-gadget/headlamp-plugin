import { Icon } from '@iconify/react';
import { ConfirmDialog, Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import {
  Box,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  MenuProps as MUIMenuProps,
  OutlinedInput,
  Select,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { DefaultGadgets } from '../../gadgets/default_gadgets';
import { isIGPod } from '../../gadgets/helper';

// Improved type definitions
interface Node {
  metadata: {
    uid: string;
    name: string;
  };
  jsonData?: {
    metadata: {
      name: string;
    };
  };
}

interface Pod {
  spec: {
    nodeName: string;
  };
}

interface GadgetInstance {
  id: string;
  gadgetConfig: {
    version: number;
    imageName: string;
  };
  tags: string[];
  nodes?: string[];
}

interface NodeSelectionProps {
  setPodsSelected: (pods: Pod[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  nodesSelected: string[];
  setNodesSelected: (nodes: string[]) => void;
  setPodStreamsConnected: (connected: boolean) => void;
  gadgetConn: {
    listGadgetInstances: (callback: (instances: GadgetInstance[]) => void) => void;
    deleteGadgetInstance: (id: string, callback: (success: any) => void) => void;
  };
  gadgetInstance: GadgetInstance;
  onInstanceDelete: (gadgetInstance: GadgetInstance) => void;
}

export function NodeSelection(props: NodeSelectionProps) {
  const [nodes] = K8s.ResourceClasses.Node.useList() as [Node[]];
  const [pods] = K8s.ResourceClasses.Pod.useList() as [Pod[]];
  const [finalNodes, setFinalNodes] = useState<Node[]>(null);
  const {
    setPodsSelected,
    nodesSelected,
    setNodesSelected,
    gadgetConn,
    gadgetInstance,
    onInstanceDelete,
  } = props;
  const { imageName } = useParams<{ imageName: string }>();
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const decodedImageName = decodeURIComponent(imageName || '');

  useEffect(() => {
    // in case of no instance, set the final nodes to all nodes
    if (!gadgetInstance) {
      setFinalNodes(nodes);
    }
  }, [nodes]);

  useEffect(() => {
    if (gadgetInstance && gadgetConn) {
      setLoading(true);
      gadgetConn.listGadgetInstances(instances => {
        const i = instances?.find(instance => instance.id === instance);

        if (!i?.nodes) {
          setFinalNodes(nodes);
          setLoading(false);
          const nodeNames = nodes.map(node => node.metadata.name);
          setNodesSelected(nodeNames);

          const podsInterestedIn = nodes.reduce<Pod[]>((acc, node) => {
            const nodePods = pods.filter(
              pod => pod.spec.nodeName === node.metadata.name && isIGPod(pod as any)
            );
            return [...acc, ...nodePods];
          }, []);

          setPodsSelected(podsInterestedIn);
          return;
        }

        const finalNodesCollection = nodes.filter(node => i.nodes?.includes(node.metadata.name));

        setFinalNodes(finalNodesCollection);
        setLoading(false);

        const nodeNames = finalNodesCollection.map(
          node => node.jsonData?.metadata.name || node.metadata.name
        );
        setNodesSelected(nodeNames);

        const podsInterestedIn = finalNodesCollection.reduce<Pod[]>((acc, node) => {
          const nodeName = node.jsonData?.metadata.name || node.metadata.name;
          const nodePods = pods.filter(
            pod => pod.spec.nodeName === nodeName && isIGPod(pod as any)
          );
          return [...acc, ...nodePods];
        }, []);

        setPodsSelected(podsInterestedIn);
      });
    }
  }, [gadgetConn]);

  if (finalNodes === null) {
    return <Loader title="" />;
  }
  if (loading) {
    return <Loader title="Loading" />;
  }

  const handleChange = (event: { target: { value: string[] } }) => {
    const { value } = event.target;
    setNodesSelected(value);

    const podsInterestedIn = value.reduce<Pod[]>((acc, nodeName) => {
      const nodePods = pods.filter(pod => pod.spec.nodeName === nodeName && isIGPod(pod as any));
      return [...acc, ...nodePods];
    }, []);

    setPodsSelected(podsInterestedIn);
  };

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps: MUIMenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  return (
    <>
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Instances"
        description="Are you sure you want to delete the selected instances?"
        onConfirm={() => {
          gadgetConn.deleteGadgetInstance(gadgetInstance.id, () => {
            onInstanceDelete(gadgetInstance);
          });
        }}
        handleClose={() => {
          setDeleteDialog(false);
        }}
      />
      <SectionBox
        title={
          <>
            <Box display="flex" alignItems="center">
              <Box ml={2} height="3.5rem">
                <h2>{decodedImageName}</h2>
              </Box>
              {gadgetInstance && (
                <Box
                  mt={2}
                  onClick={() => {
                    setDeleteDialog(true);
                  }}
                >
                  <IconButton>
                    <Icon icon="mdi:bin" />
                  </IconButton>
                </Box>
              )}
            </Box>
            <Box ml={2} mb={2}>
              {DefaultGadgets.find(gadget => gadget.name === decodedImageName).description || ''}
            </Box>
          </>
        }
      >
        {gadgetInstance ? (
          <Box>Select a node you want to get result from</Box>
        ) : (
          <Box>Select a node you want to run the gadget on</Box>
        )}
        <Box display="flex" my={2} width="100%">
          <FormControl fullWidth>
            <InputLabel
              id="nodes-select"
              style={{
                padding: '0 1.5rem',
                margin: '-0.3rem -0.1rem',
              }}
            >
              Nodes
            </InputLabel>
            <Select
              labelId="nodes-select"
              id="nodes-select"
              multiple
              value={nodesSelected}
              onChange={handleChange}
              input={<OutlinedInput label="Nodes" />}
              renderValue={selected => selected.join(', ')}
              MenuProps={MenuProps}
              fullWidth
            >
              {finalNodes.map(node => (
                <MenuItem key={node.metadata.uid} value={node.metadata.name}>
                  <Checkbox checked={nodesSelected.indexOf(node.metadata.name) > -1} />
                  <ListItemText primary={node.metadata.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </SectionBox>
    </>
  );
}
