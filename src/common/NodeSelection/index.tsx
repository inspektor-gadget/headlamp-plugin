import { ConfirmDialog, Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster, getClusterPrefixedPath } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  MenuProps as MUIMenuProps,
  OutlinedInput,
  Select,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { isIGPod } from '../../gadgets/helper';
import { GadgetDescription } from '../GadgetDescription';

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
  isInstantRun: boolean;
}

export function NodeSelection(props: NodeSelectionProps) {
  const [nodes] = K8s.ResourceClasses.Node.useList() as [Node[]];
  const [pods] = K8s.ResourceClasses.Pod.useList() as [Pod[]];
  const [finalNodes, setFinalNodes] = useState<Node[]>(null);
  const { setPodsSelected, nodesSelected, setNodesSelected, gadgetConn, gadgetInstance, isInstantRun } = props;
  const { id, imageName } = useParams<{ id: string, imageName: string }>();
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectionDisabled, setSelectionDisabled] = useState(false);
  const history = useHistory();
  const cluster = getCluster();


  // Set all nodes when nodesSelected is empty and nodes are available
  useEffect(() => {
    if (nodes?.length > 0 && nodesSelected?.length === 0) {
      const allNodeNames = nodes.map(node => node.metadata.name);
      setNodesSelected(allNodeNames);
      
      // Also update pods based on all nodes
      const allPodsForNodes = nodes.reduce<Pod[]>((acc, node) => {
        const nodePods = pods.filter(
          pod => pod.spec.nodeName === node.metadata.name && isIGPod(pod as any)
        );
        return [...acc, ...nodePods];
      }, []);
      
      setPodsSelected(allPodsForNodes);
      
      // Disable selection when nodes are programmatically set
      setSelectionDisabled(true);
    }
  }, [nodes, nodesSelected, pods]);

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
        const i = instances?.find(ins => gadgetInstance.id === ins.id);
        if (!i?.nodes) {
          setFinalNodes(nodes);
          setLoading(false);
          const nodeNames = nodes.map(node => node.metadata.name);
          setNodesSelected(nodeNames);
          setSelectionDisabled(true); // Disable selection when all nodes are set

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
        
        // If custom nodes are set (not all), we allow changing
        setSelectionDisabled(false);

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
  }, [gadgetConn, nodes, pods]);

  if (finalNodes === null) {
    return <Loader title="" />;
  }
  if (loading) {
    return <Loader title="Loading" />;
  }

  const handleChange = (event: { target: { value: string[] } }) => {
    // Skip handling changes if selection is disabled
    if (selectionDisabled && !isInstantRun) return;
    
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
          
        }}
        handleClose={() => {
          setDeleteDialog(false);
        }}
      />
     
        {gadgetInstance ? (
          <Box>Select a node you want to get result from</Box>
        ) : (
          <Box>{!isInstantRun ? 'Running on all nodes' : 'Select a node you want to run the gadget on'}</Box>
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
              renderValue={(selected) => {
                return !isInstantRun ? 'All nodes selected' : selected.join(', ');
              }}
              MenuProps={MenuProps}
              fullWidth
              disabled={!isInstantRun}
            >
              {finalNodes.map(node => (
                <MenuItem 
                  key={node.metadata.uid} 
                  value={node.metadata.name}
                  disabled={!isInstantRun}
                >
                  <Checkbox 
                    checked={nodesSelected.indexOf(node.metadata.name) > -1} 
                    disabled={!isInstantRun}
                  />
                  <ListItemText primary={node.metadata.name} />
                </MenuItem>
              ))}
            </Select>
            {!isInstantRun && (
              <Typography variant="caption" color="textSecondary" style={{ marginTop: '4px' }}>
                All nodes are automatically selected and cannot be changed
              </Typography>
            )}
          </FormControl>
        </Box>
    </>
  );
}