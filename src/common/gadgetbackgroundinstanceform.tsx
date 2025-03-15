import React, { useEffect, useState } from 'react';
import {  
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Tooltip,
  FormControl, 
  Box, 
  Chip, 
  Button,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useParams } from 'react-router';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Icon } from '@iconify/react';
import { useGadgetConn } from '../gadgets/conn';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';

interface InstanceConfig {
  name: string;
  tags: string[];
  nodes: string[];
  runInBackground: boolean;
}

interface BackgroundInstanceFormProps {
  open: boolean;
  onClose: () => void;
  filters: Record<string, any>;
  nodesSelected: string[];
  onGadgetInstanceCreation: (success: any) => void;
  namespace: string;
  pod: string;
  image?: string;
  showNodesSelector?: boolean;
  selectedView?: string;
  config?: any;
  resource: any;
}

const MENU_ITEM_HEIGHT = 48;
const MENU_ITEM_PADDING_TOP = 8;
const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: MENU_ITEM_HEIGHT * 4.5 + MENU_ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getNodeNameFromResource(resource: any) {
  // if resource is pod, Node
  if (resource.kind === 'Pod') {
    return resource.spec.nodeName;
  }
  // if resource is node, return node name
  if (resource.kind === 'Node') {
    return resource.metadata.name;
  }
  return '';
}
export function GadgetBackgroundInstanceForm({
  onClose,
  filters,
  nodesSelected,
  onGadgetInstanceCreation,
  resource,
  image,
  showNodesSelector = true,
  selectedView = 'Pod',
  config,
}: BackgroundInstanceFormProps) {
  const [instanceConfig, setInstanceConfig] = useState<InstanceConfig>({
    name: '',
    tags: [],
    nodes: [],
    runInBackground: false,
  });
  const { enqueueSnackbar } = useSnackbar();
  const { imageName } = useParams<{ imageName: string }>();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const ig = useGadgetConn(nodes, pods);
  const cluster = getCluster();
    
  useEffect(() => {
    setInstanceConfig(prev => ({ ...prev, nodes: nodesSelected }));
  }, [nodesSelected]);

  function handleNodesChange(event: React.ChangeEvent<{ value: unknown }>) {
    const value = event.target.value as string[];
    setInstanceConfig(prev => ({
      ...prev,
      nodes: typeof value === 'string' ? value.split(',') : value,
    }));
  }

  function handleCreateInstance() {
    // Validate required fields
    if (!instanceConfig.name) {
      enqueueSnackbar('Please fill all required fields', { variant: 'error' });
      return;
    }

    const newInstance = {
      id: instanceConfig.name + '' + Math.random(),
      name: instanceConfig.name,
      kind: selectedView || resource?.jsonData.kind,
      gadgetConfig: {
        imageName: image || imageName || '',
        version: config?.version || 1,
        paramValues: {
          ...filters,
        }
      },
      cluster: cluster,
      isHeadless: false,
      tags: instanceConfig.tags,
    };
    if (instanceConfig.runInBackground) {
      // Make a call to ig.createGadgetInstance when Run In Background is checked
      try {
        if (ig && ig.createGadgetInstance) {
          ig.createGadgetInstance({
            name: instanceConfig.name,
            tags: instanceConfig.tags,
            nodes: resource ? [getNodeNameFromResource(resource?.jsonData)] : instanceConfig.nodes,
            gadgetConfig: {
              imageName: image || imageName || '',
              version: 1,
              paramValues: {
                ...filters,
              }
            }
          }, (success) => {
            
            newInstance.id = success.gadgetInstance.id;

            newInstance.isHeadless = true;
            newInstance.cluster = cluster;

            const existingInstances = JSON.parse(
              localStorage.getItem('headlamp_embeded_resources') || '[]'
            );
            const updatedInstances = [...existingInstances, newInstance];
            localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
            enqueueSnackbar(`Created background instance ${instanceConfig.name}`, { variant: 'success' });
            onGadgetInstanceCreation(success);
            onClose();
          }, (error) => {
            console.error('Error creating gadget instance:', error);
            enqueueSnackbar('Failed to create background instance', { variant: 'error' });
          });
        } else {
          console.error('ig.createGadgetInstance is not available');
          enqueueSnackbar('Failed to create background instance: API not available', { variant: 'error' });
          return;
        }
      } catch (error) {
        console.error('Error creating gadget instance:', error);
        enqueueSnackbar('Failed to create background instance', { variant: 'error' });
        return;
      }
    } else {
      // Original localStorage behavior when Run In Background is not checked
      const existingInstances = JSON.parse(
        localStorage.getItem('headlamp_embeded_resources') || '[]'
      );
      const updatedInstances = [...existingInstances, newInstance];
      localStorage.setItem(
        'headlamp_embeded_resources', 
        JSON.stringify(updatedInstances)
      );
      enqueueSnackbar(`Created instance ${instanceConfig.name}`, { variant: 'success' });
      onGadgetInstanceCreation(newInstance);
      onClose();
    }
  }

  return (
    <>
      <TextField
        label="Instance Name"
        required
        variant="outlined"
        margin="normal"
        fullWidth
        value={instanceConfig.name}
        onChange={e =>
          setInstanceConfig(prev => ({
            ...prev,
            name: e.target.value,
          }))
        }
      />
      <TextField
        label="Tags"
        variant="outlined"
        margin="normal"
        fullWidth
        onChange={e =>
          setInstanceConfig(prev => ({
            ...prev,
            tags: e.target.value.split(','),
          }))
        }
        value={instanceConfig.tags.join(',')}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Tags values should be comma separated">
                <Icon icon="mdi:info" />
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
      <FormControlLabel
        control={
          <Checkbox 
            checked={instanceConfig.runInBackground}
            onChange={e => {
              setInstanceConfig(prev => ({
                ...prev,
                runInBackground: e.target.checked,
              }));
            }}
          />
        }
        label={<Box display="flex" alignItems="center">
          <Box>Enable Historic Data</Box>
          <Box ml={1}>
          <Tooltip title="Enable this option to run the instance in background and get historic data">
            <Icon icon="mdi:info" />
          </Tooltip>
          </Box>
        </Box>}
        // show a info icon
       
      />
      {/* @todo: Enable selecting a node when embeding an instance */}
      {/* {nodes && (showNodesSelector || !resource) && (
        <Box my={1.5}>
          <FormControl fullWidth>
            <InputLabel id="nodes">Nodes</InputLabel>
            <Select
              fullWidth
              labelId="nodes"
              id="nodes"
              multiple
              value={instanceConfig.nodes}
              onChange={handleNodesChange}
              input={<OutlinedInput id="multiple-nodes" label={" Nodes"}/>}
              renderValue={selected => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map(value => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
              MenuProps={MENU_PROPS}
            >
              <MenuItem value="All">
                <em>All</em>
              </MenuItem>
              {nodes.map(node => (
                <MenuItem key={node.metadata.name} value={node.metadata.name}>
                  {node.metadata.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )} */}
      <Box display="flex" justifyContent="flex-end" m={2}>
        <Button onClick={handleCreateInstance} variant="contained" disabled={!instanceConfig.name}>
          Create Instance
        </Button>
      </Box>
    </>
  );
}