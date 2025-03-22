import { Icon } from '@iconify/react';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useGadgetConn } from '../gadgets/conn';
import { generateRandomString } from './helpers';

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
  selectedView = 'Pod',
  config,
}: BackgroundInstanceFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { imageName } = useParams<{ imageName: string }>();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const ig = useGadgetConn(nodes, pods);
  const cluster = getCluster();

  // Generate default name using imageName with a random string
  const getDefaultName = () => {
    const imgName = image || imageName || 'gadget';
    return `${imgName}-custom-${generateRandomString()}`;
  };

  const [instanceConfig, setInstanceConfig] = useState<InstanceConfig>({
    name: getDefaultName(),
    tags: [],
    nodes: [],
    runInBackground: false,
  });

  useEffect(() => {
    setInstanceConfig(prev => ({ ...prev, nodes: nodesSelected }));
  }, [nodesSelected]);

  // Update name if image changes
  useEffect(() => {
    if (!instanceConfig.name || instanceConfig.name === '') {
      setInstanceConfig(prev => ({ ...prev, name: getDefaultName() }));
    }
  }, [image, imageName]);

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
        },
      },
      cluster: cluster,
      isHeadless: false,
      tags: instanceConfig.tags,
      isEmbedded: true,
    };
    if (instanceConfig.runInBackground) {
      // Make a call to ig.createGadgetInstance when Run In Background is checked
      try {
        if (ig && ig.createGadgetInstance) {
          ig.createGadgetInstance(
            {
              name: instanceConfig.name,
              tags: instanceConfig.tags,
              nodes: resource
                ? [getNodeNameFromResource(resource?.jsonData)]
                : instanceConfig.nodes,
              gadgetConfig: {
                imageName: image || imageName || '',
                version: 1,
                paramValues: {
                  ...filters,
                },
              },
            },
            success => {
              newInstance.id = success.gadgetInstance.id;

              newInstance.isHeadless = true;
              newInstance.cluster = cluster;

              const existingInstances = JSON.parse(
                localStorage.getItem('headlamp_embeded_resources') || '[]'
              );
              const updatedInstances = [...existingInstances, newInstance];
              localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
              enqueueSnackbar(`Created background instance ${instanceConfig.name}`, {
                variant: 'success',
              });
              onGadgetInstanceCreation(success);
              onClose();
            },
            error => {
              console.error('Error creating gadget instance:', error);
              enqueueSnackbar('Failed to create background instance', { variant: 'error' });
            }
          );
        } else {
          console.error('ig.createGadgetInstance is not available');
          enqueueSnackbar('Failed to create background instance: API not available', {
            variant: 'error',
          });
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
      localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
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
        label={
          <Box display="flex" alignItems="center">
            <Box>Enable Historic Data</Box>
            <Box ml={1}>
              <Tooltip title="Enable this option to run the instance in background and get historic data">
                <Icon icon="mdi:info" />
              </Tooltip>
            </Box>
          </Box>
        }
      />
      <Box display="flex" justifyContent="flex-end" m={2}>
        <Button onClick={handleCreateInstance} variant="contained" disabled={!instanceConfig.name}>
          Create Instance
        </Button>
      </Box>
    </>
  );
}
