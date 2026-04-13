import { Icon } from '@iconify/react';
import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/k8s';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Button } from '@mui/material';
import { Box, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { isIGInstalled, useGadgetConn } from './conn';

export function BackgroundRunning({ embedDialogOpen = false }) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState<any[] | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  const isIGInstallationFound = isIGInstalled(pods);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const ig = useGadgetConn(nodes, pods);

  const cluster = getCluster();
  const { enqueueSnackbar } = useSnackbar();

  const tableData = React.useMemo(() => {
    return runningInstances?.filter(instance => instance.cluster === cluster) || [];
  }, [runningInstances, cluster]);

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

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
    const selectedRows = tableData.filter((_, index) => rowSelection[index]);
    const selectedIds = new Set<string>(selectedRows.map((r: any) => r.id as string));

    // Separate instances that need an API call (headless) from those that don't
    const toDeleteLocally = new Set<string>();
    const toDeleteRemotely: { id: string; name: string }[] = [];

    selectedIds.forEach(id => {
      const instance = (runningInstances || []).find(i => i.id === id);
      if (!instance) return;
      if (instance.isHeadless) {
        toDeleteRemotely.push({ id, name: instance.name || id.slice(-8) });
      } else {
        toDeleteLocally.add(id);
      }
    });

    // Commit removals and close dialog once all async calls have settled
    const remoteDeletedIds = new Set<string>();
    let settledCount = 0;
    const totalRemote = toDeleteRemotely.length;

    const finalizeDelete = () => {
      const allDeletedIds = new Set([...toDeleteLocally, ...remoteDeletedIds]);
      let latestLocalStorageInstances: any[] = [];
      try {
        const stored = localStorage.getItem('headlamp_embeded_resources');
        const parsed = stored ? JSON.parse(stored) : [];
        latestLocalStorageInstances = Array.isArray(parsed) ? parsed : [];
      } catch {
        latestLocalStorageInstances = [];
      }
      const updatedStorage = latestLocalStorageInstances.filter(i => !allDeletedIds.has(i.id));
      localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedStorage));
      setRunningInstances(prev => (prev || []).filter(i => !allDeletedIds.has(i.id)));
      setRowSelection({});
      setOpenConfirmDialog(false);
    };

    // No remote calls needed — finalize immediately
    if (totalRemote === 0) {
      finalizeDelete();
      return;
    }

    if (!ig) {
      enqueueSnackbar(
        toDeleteLocally.size > 0
          ? 'Not connected to gadget API. Local instances were deleted, but remote instances could not be deleted.'
          : 'Not connected to gadget API. Remote instances could not be deleted. Please try again.',
        { variant: 'error' }
      );
      finalizeDelete();
      return;
    }

    toDeleteRemotely.forEach(({ id, name }) => {
      ig.deleteGadgetInstance(
        id,
        () => {
          remoteDeletedIds.add(id);
          settledCount++;
          if (settledCount === totalRemote) finalizeDelete();
        },
        (err: Error) => {
          enqueueSnackbar(`Failed to delete "${name}": ${err?.message ?? String(err)}`, {
            variant: 'error',
          });
          settledCount++;
          if (settledCount === totalRemote) finalizeDelete();
        }
      );
    });
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
      accessorFn: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: row.isHeadless ? '#4caf50' : '#9e9e9e',
            }}
          />
          {row.isHeadless ? 'Running' : 'Stopped'}
        </Box>
      ),
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
        <Table
          data={tableData}
          columns={columns}
          loading={runningInstances === null}
          emptyMessage="No Embedded Instances"
          enableRowSelection
          onRowSelectionChange={setRowSelection}
          state={{ rowSelection }}
          positionToolbarAlertBanner="top"
          enableToolbarInternalActions={selectedCount === 0}
          {...(selectedCount > 0
            ? {
                renderToolbarAlertBannerContent: ({ table }) => {
                  const totalCount = table.getRowModel().rows.length;
                  return (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingX: '1rem',
                        paddingY: '0rem',
                        width: '100%',
                        height: '50px',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <Box>
                          {selectedCount} of {totalCount} row{totalCount > 1 ? 's' : ''} selected
                        </Box>
                        <Box>
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
                      </Box>
                      <Box ml={2}>
                        <Tooltip title="Delete Instances">
                          <Icon
                            icon="mdi:delete"
                            width="22px"
                            height="22px"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setOpenConfirmDialog(true)}
                          />
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                },
              }
            : {})}
        />
      </SectionBox>
    </>
  );
}
