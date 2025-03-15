import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Button, Checkbox } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { isIGInstalled, useGadgetConn } from './conn';

export function BackgroundRunning({ imageName, callback, hideTitle = false, addGadget=false, callbackAddGadget=() => {}, embedDialogOpen=false }) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState(new Set());
  const selectedRowsRef = React.useRef(selectedRows);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const isIGInstallationFound = isIGInstalled(pods);
  const ig = useGadgetConn(nodes, pods);
  // Process localStorage instances once
  const processLocalStorageInstances = (localStorageInstances) => {
    if (!localStorageInstances) return [];
    return localStorageInstances.map(item => {
      // Store the original localStorage index for easier identification when deleting
      return {
        id: `${item.id}`, // More consistent ID format
        name: item.gadgetConfig.imageName, // Add name for consistency with table columns
        gadgetConfig: {
          imageName: item.gadgetConfig.imageName,
          version: item.gadgetConfig.version,
          paramValues: item.gadgetConfig.paramValues
        },
        kind: item.kind,
        isHeadless: item.isHeadless,
        tags: item.tags || [],
        nodes: item.nodes || [],
        cluster: item.cluster,
      };
    });
  };

  // Load instances only once when ig is available
  useEffect(() => {
     if (!ig) return;
    
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );
    
    const processedLocalStorageInstances = processLocalStorageInstances(localStorageInstances).filter((instance) => {
      
      if (imageName !== 'undefined' && instance.gadgetConfig?.imageName !== imageName) {
        return false;
      }
      return true;
    });
    // Load remote instances
    ig.listGadgetInstances(instances => {
      let filteredInstances = instances || [];
      // Apply imageName filter if provided
      if (imageName !== 'undefined' && filteredInstances.length > 0) {
        filteredInstances = filteredInstances.filter(
          instance => instance.gadgetConfig?.imageName === imageName
        );
      }
      
      // Add name property to remote instances if missing
      const enhancedInstances = filteredInstances.map(instance => ({
        ...instance,
        name: instance.name || instance.gadgetConfig?.imageName || 'Unnamed Gadget'
      }));

      const combinedInstances = [
        ...processedLocalStorageInstances,
        // ...filteredEnhancedInstances
      ];
      setRunningInstances(combinedInstances);
    }, err => {
      console.error('Error loading gadget instances:', err);
      // If error, at least show localStorage instances
      setRunningInstances(processedLocalStorageInstances);
    });
  }, [ig, imageName, embedDialogOpen]);

  function CustomCheckbox({ selectedRowsRef, onChange, id }) {
    const [checked, setChecked] = useState(false);
     const handleChange = (event) => {
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
      }
    }, [selectedRowsRef.current, id]);
  
  
    return (
      <Checkbox
        checked={checked}
        onChange={handleChange}
  
      />
    );
  }

  const handleSelectAll = React.useCallback(
    checked => {
      if (!runningInstances) return;

      if (checked) {
        const newSelected = new Set(runningInstances.map(instance => instance.id));
        setSelectedRows(newSelected);
      } else {
        setSelectedRows(new Set());
      }
    },
    [runningInstances]
  );

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
    // Get a copy of the current localStorage
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );
    let updatedLocalStorageInstances = [...localStorageInstances];
    let updatedRunningInstances = [...runningInstances];
    
    // Process each selected row
    selectedRows.forEach((id) => {
      const instance = runningInstances.find((instance) => instance.id === id);
      
      if (!instance) return;
      
      if (instance.isHeadless != undefined && !instance.isHeadless) {
        // Handle localStorage instance deletion using the stored original index
        const id = instance.id;
        updatedLocalStorageInstances = updatedLocalStorageInstances.filter(
          (i) => i.id !== id
        );
      } else {
        // Handle remote instance deletion
        ig.deleteGadgetInstance(id, (success) => {
          // This is handled in the updatedRunningInstances filter below
        }, err => {
          console.error('Error deleting instance:', err);
        });
      }
      
      // Remove from running instances in UI
      updatedRunningInstances = updatedRunningInstances.filter(i => i.id !== id);
      // also delete from localStorage if present
      updatedLocalStorageInstances = updatedLocalStorageInstances.filter(i => i.id !== id);
    });
    
    // Update localStorage and state
    localStorage.setItem(
      'headlamp_embeded_resources',
      JSON.stringify(updatedLocalStorageInstances)
    );
    setRunningInstances(updatedRunningInstances);
    setSelectedRows(new Set());
    selectedRowsRef.current = new Set();
    setOpenConfirmDialog(false);
  };

  if (pods === null) {
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
      <SectionBox backLink={false}>
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
          data={runningInstances}
          columns={[
            {
              id: 'select',
              header: (
                'Select'
                // <Checkbox
                //   checked={isAllSelected}
                //   indeterminate={isIndeterminate}
                //   onChange={e => handleSelectAll(e.target.checked)}
                // />
              ),
              accessorFn: row => {
                return (
                <CustomCheckbox
                  selectedRowsRef={selectedRowsRef}
                  onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                  id={row.id}
                />
              )},
              size: 20,
              enableSorting: false,
              enableColumnFilter: false,
            },
            {
              id: 'name',
              header: 'Name',
              accessorFn: row => row.name || row?.gadgetConfig?.imageName || 'Unnamed',
            },
            {
              id: 'id',
              header: 'ID',
              accessorKey: 'id',
              size: 300,
              Cell: ({ row }) => (
                <Link
                  routeName={''}
                  onClick={e => {
                    if (hideTitle) {
                      e.preventDefault();
                      callback(row.original);
                    }
                  }}
                >
                  {row.original.id}
                </Link>
              ),
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
              accessorFn: row => row.isHeadless ? 'Running In Background' : 'Not Running',
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