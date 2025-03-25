import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, Button, Checkbox } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { isIGInstalled, useGadgetConn } from './conn';

export function BackgroundRunning({ embedDialogOpen = false }) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState(new Set());
  const selectedRowsRef = React.useRef(selectedRows);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const isIGInstallationFound = isIGInstalled(pods);
  const ig = useGadgetConn(nodes, pods);
  const cluster = getCluster();

  // Load instances only once when ig is available
  useEffect(() => {
    if (!ig) return;

    // Get all instances from localStorage
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    // Process embedded and non-embedded instances
    const processedInstances = localStorageInstances.map(item => ({
      ...item,
      isEmbedded: item.isEmbedded || false, // Default to false if not set
    }));

    // Load remote instances
    ig.listGadgetInstances(
      instances => {
        let filteredInstances = instances || [];
        // Filter out instances already in localStorage
        filteredInstances = filteredInstances.filter(instance => {
          return !processedInstances.some(localInstance => localInstance.id === instance.id);
        });

        // Map remote instances to the required format
        filteredInstances = filteredInstances.map(fI => ({
          id: fI.id,
          name: fI.name || fI.gadgetConfig?.imageName || 'Unnamed Gadget',
          gadgetConfig: {
            imageName: fI.gadgetConfig?.imageName,
            version: fI.gadgetConfig?.version,
            paramValues: fI.gadgetConfig?.paramValues,
          },
          isHeadless: true,
          tags: fI.tags || [],
          nodes: fI.nodes || [],
          cluster: getCluster(),
          isEmbedded: false, // Mark these instances as not embedded
        }));
        const updatedInstances = [...processedInstances, ...filteredInstances];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));

        setRunningInstances(updatedInstances);
      },
      err => {
        console.error('Error loading gadget instances:', err);
        // If error, at least show localStorage instances
        setRunningInstances(processedInstances);
      }
    );
  }, [ig, embedDialogOpen]);

  function CustomCheckbox({ selectedRowsRef, onChange, id }) {
    const [checked, setChecked] = useState(false);
    const handleChange = event => {
      setChecked(event.target.checked);
      onChange(event);
    };
    useEffect(() => {
      const selectedRows = selectedRowsRef.current;
      if (selectedRows && selectedRows.size > 0) {
        const isChecked = selectedRows.has(id);
        setChecked(isChecked);
      }

      return () => {
        setChecked(false);
      };
    }, [selectedRowsRef.current, id]);

    return <Checkbox checked={checked} onChange={handleChange} />;
  }

  const handleSelectRow = React.useCallback((id, checked) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      selectedRowsRef.current = newSelected;
      return newSelected;
    });
  }, []);

  const handleDeleteInstances = () => {
    // Get all instances from localStorage
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    let updatedInstances = [...localStorageInstances];
    let updatedDisplayInstances = [...(runningInstances || [])];

    // Process each selected row
    selectedRows.forEach(id => {
      const instance = runningInstances.find(instance => instance.id === id);
      if (!instance) return;

      if (instance.isHeadless !== undefined && !instance.isHeadless) {
        // Remove from localStorage instances
        updatedInstances = updatedInstances.filter(i => i.id !== id);
      } else {
        // Handle remote instance deletion
        ig.deleteGadgetInstance(
          id,
          () => {
            // This is handled in the updatedDisplayInstances filter below
          },
          err => {
            console.error('Error deleting instance:', err);
          }
        );

        // Remove from localStorage instances
        updatedInstances = updatedInstances.filter(i => i.id !== id);
      }

      // Remove from running instances in UI
      updatedDisplayInstances = updatedDisplayInstances.filter(i => i.id !== id);
    });

    // Update localStorage
    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
    setRunningInstances(updatedDisplayInstances);
    setSelectedRows(new Set());
    selectedRowsRef.current = new Set();
    setOpenConfirmDialog(false);
  };

  if (pods === null) {
    return <Loader />;
  }

  if (isIGInstallationFound == null) {
    return <Loader />;
  }

  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }

  return (
    <>
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Instances"
        description="Are you sure you want to delete the selected instances?"
        onConfirm={handleDeleteInstances}
        handleClose={() => {
          setOpenConfirmDialog(false);
        }}
      />
      <SectionBox>
        {selectedRows && selectedRows.size > 0 && (
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Box>
              <Button
                sx={theme => ({
                  color: theme.palette.clusterChooser.button.color,
                  background: theme.palette.clusterChooser.button.background,
                  '&:hover': {
                    background: theme.palette.clusterChooser.button.hover.background,
                  },
                  maxWidth: '20em',
                  textTransform: 'none',
                  padding: '6px 6px',
                })}
                onClick={() => {
                  setOpenConfirmDialog(true);
                }}
              >
                Delete Selected Instances
              </Button>
            </Box>
          </Box>
        )}
        <Table
          data={runningInstances?.filter(instance => instance.cluster === cluster) || []}
          columns={[
            {
              id: 'select',
              header: 'Select',
              accessorFn: row => {
                return (
                  <CustomCheckbox
                    selectedRowsRef={selectedRowsRef}
                    onChange={e => handleSelectRow(row.id, e.target.checked)}
                    id={row.id}
                  />
                );
              },
              size: 20,
              enableSorting: false,
              enableColumnFilter: false,
            },
            {
              id: 'name',
              header: 'Name',
              accessorFn: row => (
                <Link
                  routeName={'/gadgets/:imageName/:id'}
                  params={{
                    imageName: row.gadgetConfig?.imageName,
                    id: row.id,
                  }}
                >
                  {row.name || row?.gadgetConfig?.imageName || 'Unnamed'}
                </Link>
              ),
            },
            {
              id: 'id',
              header: 'ID',
              accessorFn: row => row.id,
            },
            {
              id: 'imageName',
              header: 'ImageName',
              accessorFn: row => row.imageName || row?.gadgetConfig?.imageName,
              size: 300,
            },
            {
              id: 'tags',
              header: 'Tags',
              accessorFn: row => row?.tags?.join(', ') || '',
            },
            {
              id: 'Status',
              header: 'Status',
              accessorFn: row => (row.isHeadless ? 'Running In Background' : 'Not Running'),
            },
            {
              id: 'embedded',
              header: 'Embedded',
              accessorFn: row => (row.isEmbedded ? row.kind : '-'),
              size: 150,
            },
            {
              id: 'version',
              header: 'Version',
              accessorFn: row => row.version || row?.gadgetConfig?.version,
              size: 200,
            },
          ]}
          loading={runningInstances === null}
          emptyMessage="No Embedded Instances"
        />
      </SectionBox>
    </>
  );
}
