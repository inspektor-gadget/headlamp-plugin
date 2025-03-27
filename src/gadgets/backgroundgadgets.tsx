import { Icon } from '@iconify/react';
import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Button } from '@mui/material';
import { Box, Tooltip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { isIGInstalled, useGadgetConn } from './conn';

export function BackgroundRunning({ embedDialogOpen = false }) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const [tableInstance, setTableInstance] = useState(null);
  const isIGInstallationFound = isIGInstalled(pods);
  const [selectedCount, setSelectedCount] = useState(0);
  const ig = useGadgetConn(nodes, pods);
  const cluster = getCluster();

  useEffect(() => {
    if (!ig) return;

    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    const processedInstances = localStorageInstances.map(item => ({
      ...item,
      isEmbedded: item.isEmbedded || false,
    }));

    ig.listGadgetInstances(
      instances => {
        let filteredInstances = instances || [];

        filteredInstances = filteredInstances.filter(instance => {
          return !processedInstances.some(localInstance => localInstance.id === instance.id);
        });

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
          isEmbedded: false,
        }));
        const updatedInstances = [...processedInstances, ...filteredInstances];
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
        setRunningInstances(updatedInstances);
      },
      err => {
        console.error('Error loading gadget instances:', err);
        setRunningInstances(processedInstances);
      }
    );
  }, [ig, embedDialogOpen]);

  const handleDeleteInstances = () => {
    if (!tableInstance) return;

    const selectedRows = tableInstance.getSelectedRowModel().rows;
    const selectedIds = new Set(selectedRows.map(r => r.original.id));
    const localStorageInstances = JSON.parse(
      localStorage.getItem('headlamp_embeded_resources') || '[]'
    );

    let updatedInstances = [...localStorageInstances];
    let updatedDisplayInstances = [...(runningInstances || [])];

    selectedIds.forEach(id => {
      const instance = runningInstances.find(instance => instance.id === id);
      if (!instance) return;

      if (instance.isHeadless !== undefined && !instance.isHeadless) {
        updatedInstances = updatedInstances.filter(i => i.id !== id);
      } else {
        ig.deleteGadgetInstance(
          id,
          () => {},
          err => {
            console.error('Error deleting instance:', err);
          }
        );
        updatedInstances = updatedInstances.filter(i => i.id !== id);
      }

      updatedDisplayInstances = updatedDisplayInstances.filter(i => i.id !== id);
    });

    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));
    setRunningInstances(updatedDisplayInstances);
    tableInstance.resetRowSelection(); // Reset row selection after updating data
    setOpenConfirmDialog(false);
  };

  if (pods === null) {
    return <Loader title="loading pods" />;
  }

  if (isIGInstallationFound === null) {
    return <Loader title="loading ig installation checks" />;
  }

  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }

  const columns = [
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
  ];

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
        {selectedCount === 0 ? (
          <Table
            data={runningInstances?.filter(instance => instance.cluster === cluster) || []}
            columns={columns}
            loading={runningInstances === null}
            emptyMessage="No Embedded Instances"
            enableRowSelection
            positionToolbarAlertBanner="top"
            renderTopToolbarCustomActions={({ table }) => {
              setTableInstance(table);
              setSelectedCount(table.getSelectedRowModel().rows.length);
              return null;
            }}
          />
        ) : (
          <Table
            data={runningInstances?.filter(instance => instance.cluster === cluster) || []}
            columns={columns}
            loading={runningInstances === null}
            emptyMessage="No Embedded Instances"
            enableRowSelection
            enableToolbarInternalActions={false}
            positionToolbarAlertBanner="top"
            renderToolbarAlertBannerContent={({ table }) => {
              const selectedCount = table.getSelectedRowModel().rows.length;
              const totalCount = table.getRowModel().rows.length;
              return (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingX: '1rem',
                    paddingY: '0.5rem',
                    width: '100%',
                  }}
                >
                  {/* Left: X of Y selected + Clear */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span>
                      {selectedCount} of {totalCount} row{totalCount > 1 ? 's' : ''} selected
                    </span>
                    <Button
                      sx={{
                        cursor: 'pointer',
                        color: '#3393DC',
                        fontWeight: 500,
                        textTransform: 'none',
                        padding: 0,
                        minWidth: 'unset',
                      }}
                      onClick={() => table.resetRowSelection()}
                    >
                      CLEAR SELECTION
                    </Button>
                  </Box>

                  <Tooltip title="Delete Instances">
                    <Icon
                      icon="mdi:delete"
                      width="22px"
                      height="22px"
                      style={{ cursor: 'pointer', color: 'white' }}
                      onClick={() => setOpenConfirmDialog(true)}
                    />
                  </Tooltip>
                </Box>
              );
            }}
            renderTopToolbarCustomActions={({ table }) => {
              setTableInstance(table);
              setSelectedCount(table.getSelectedRowModel().rows.length);
              return null;
            }}
          />
        )}
      </SectionBox>
    </>
  );
}
