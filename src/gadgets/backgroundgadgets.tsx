import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Button, Checkbox } from '@mui/material';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
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
  const cluster = getCluster();
  console.log('pods:', pods);
  console.log('isIGInstallationFound:', isIGInstallationFound);
  // Process localStorage embedded instances
  const processLocalStorageEmbeddedInstances = (localStorageInstances) => {
    if (!localStorageInstances) return [];
    return localStorageInstances.map(item => {
      return {
        id: `${item.id}`,
        name: item.name,
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
        isEmbedded: true // Mark these instances as embedded
      };
    });
  };
  
  // Process localStorage running instances (not embedded)
  const processLocalStorageRunningInstances = (runningInstances) => {
    if (!runningInstances) return [];
    return runningInstances.map(item => {
      return {
        id: `${item.id}`,
        name: item.name || item.gadgetConfig?.imageName || 'Unnamed Gadget',
        gadgetConfig: {
          imageName: item.gadgetConfig?.imageName,
          version: item.gadgetConfig?.version,
          paramValues: item.gadgetConfig?.paramValues
        },
        kind: item.kind,
        isHeadless: item.isHeadless,
        tags: item.tags || [],
        nodes: item.nodes || [],
        cluster: item.cluster,
        isEmbedded: false // Mark these instances as not embedded
      };
    });
  };

  // Load instances only once when ig is available
  useEffect(() => {
    if (!ig) return;
    
    // Get embedded instances from localStorage
    const embeddedInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );
    
    // Get running instances from localStorage
    const runningStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]'
    );
    
    // Process embedded instances
    const processedEmbeddedInstances = processLocalStorageEmbeddedInstances(embeddedInstances).filter((instance) => {
      if (imageName !== 'undefined' && instance.gadgetConfig?.imageName !== imageName) {
        return false;
      }
      return true;
    });
    
    // Process running instances
    const processedRunningInstances = processLocalStorageRunningInstances(runningStorageInstances).filter((instance) => {
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
      
      // // Add name property to remote instances if missing
      // const enhancedInstances = filteredInstances.map(instance => ({
      //   ...instance,
      //   name: instance.name || instance.gadgetConfig?.imageName || 'Unnamed Gadget',
      //   isEmbedded: false // Remote instances are not embedded
      // }));

      const combinedInstances = [
        ...processedEmbeddedInstances,
        ...processedRunningInstances,
        // ...enhancedInstances
      ];
      setRunningInstances(combinedInstances);
    }, err => {
      console.error('Error loading gadget instances:', err);
      // If error, at least show localStorage instances
      setRunningInstances([...processedEmbeddedInstances, ...processedRunningInstances]);
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
    // Get a copy of the current localStorage for both embedded and running instances
    const embeddedInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );
    const foregroundRunningInstances = JSON.parse(
      localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]'
    );
    
    let updatedEmbeddedInstances = [...embeddedInstances];
    let updatedRunningInstances = [...foregroundRunningInstances];
    let updatedDisplayInstances = [...(runningInstances || [])];
    console.log('selected rows:', selectedRows);
    // Process each selected row
    selectedRows.forEach((id) => {
      const instance = runningInstances.find((instance) => instance.id === id);
      console.log('instance:', instance);
      if (!instance) return;
      
      if (instance.isHeadless != undefined && !instance.isHeadless) {
        // Handle localStorage instance deletion
        // a instance is embedded if it's in the updatedEmbeddedInstances
        const isEmbedded = updatedEmbeddedInstances.findIndex((i) => i.id === id) !== -1;
        if (isEmbedded) {
          // Remove from embedded instances
          updatedEmbeddedInstances = updatedEmbeddedInstances.filter(
            (i) => i.id !== id
          );
        } else {
          // Remove from running instances
          updatedRunningInstances = updatedRunningInstances.filter(
            (i) => i.id !== id
          );
        }
      } else {
        // Handle remote instance deletion
        ig.deleteGadgetInstance(id, (success) => {
          // This is handled in the updatedDisplayInstances filter below
        }, err => {
          console.error('Error deleting instance:', err);
        });

        // if it's a background running instance which is embeded or not remove it
        const isEmbedded = updatedEmbeddedInstances.findIndex((i) => i.id === id) !== -1;
        if (isEmbedded) {
          // Remove from embedded instances
          updatedEmbeddedInstances = updatedEmbeddedInstances.filter(
            (i) => i.id !== id
          );
        } else {
          // Remove from running instances
          updatedRunningInstances = updatedRunningInstances.filter(
            (i) => i.id !== id
          );
        }
      }
      
      // Remove from running instances in UI
      updatedDisplayInstances = updatedDisplayInstances.filter(i => i.id !== id);
      console.log('id is:', id);
    });
    
    // Update localStorage for both keys
    localStorage.setItem(
      'headlamp_embeded_resources',
      JSON.stringify(updatedEmbeddedInstances)
    );
    localStorage.setItem(
      'headlamp_gadget_foreground_running_instances',
      JSON.stringify(updatedRunningInstances)
    );
    console.log('updated display instances:', updatedDisplayInstances);
    setRunningInstances(updatedDisplayInstances);
    setSelectedRows(new Set());
    selectedRowsRef.current = new Set();
    setOpenConfirmDialog(false);
  };

  if (pods === null) {
    return <Loader />;
  }
  
  if(isIGInstallationFound == null) {
    return <Loader />;
  }

  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }
  console.log('running instances:', runningInstances);
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
          data={runningInstances?.filter(instance => instance.cluster === cluster)}
          columns={[
            {
              id: 'select',
              header: 'Select',
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
              accessorFn: row => <Link routeName={"/gadgets/:imageName/:id"} params={{
                imageName: row.gadgetConfig?.imageName,
                id: row.id,
              }}>{ row.name || row?.gadgetConfig?.imageName || 'Unnamed' }</Link>,
            },
            {
              id: 'id',
              header: 'ID',
              accessorFn: row => row.id,
            },
            // {
            //   id: 'id',
            //   header: 'ID',
            //   accessorKey: 'id',
            //   size: 300,
            //   Cell: ({ row }) => (
            //     <Link
            //       routeName={''}
            //       onClick={e => {
            //         if (hideTitle) {
            //           e.preventDefault();
            //           callback(row.original);
            //         }
            //       }}
            //     >
            //       {row.original.id}
            //     </Link>
            //   ),
            // },
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
              id: 'embedded',
              header: 'Embedded',
              accessorFn: row => row.isEmbedded ? 'Yes' : 'No',
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