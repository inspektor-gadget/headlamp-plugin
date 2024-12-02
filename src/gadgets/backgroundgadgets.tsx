import {
  ConfirmDialog,
  Link,
  Loader,
  SectionBox,
  Table,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, Button, Checkbox } from '@mui/material';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { IGNotFound } from '../common/NotFound';
import { GadgetConnectionForBackgroundRunningProcess, isIGInstalled } from './conn';

export function BackgroundRunning({ imageName, callback, hideTitle = false }) {
  const [gadgetConn, setGadgetConn] = React.useState(null);
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState(null);
  const [selectedRows, setSelectedRows] = React.useState(new Set());
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const isIGInstallationFound = isIGInstalled(pods);
  // get query params from url which contains iamge
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const imageNameFromUrl = queryParams.get('image');

  React.useEffect(() => {
    if (gadgetConn) {
      gadgetConn.listGadgetInstances(instances => {
        if (!instances) {
          setRunningInstances([]);
          return;
        }
        if (imageNameFromUrl) {
          setRunningInstances(
            instances.filter(instance => instance.gadgetConfig?.imageName === imageNameFromUrl)
          );
          return;
        }
        if (imageName) {
          setRunningInstances(
            instances.filter(instance => instance.gadgetConfig?.imageName === imageName)
          );
          return;
        }
        setRunningInstances([...instances]);
      });
    }
  }, [gadgetConn, location]);

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
      return newSelected;
    });
  }, []);

  const isAllSelected = React.useMemo(() => {
    if (!runningInstances || runningInstances.length === 0) return false;
    return runningInstances.every(instance => selectedRows.has(instance.id));
  }, [runningInstances, selectedRows]);

  const isIndeterminate = React.useMemo(() => {
    if (!runningInstances || runningInstances.length === 0) return false;
    return selectedRows.size > 0 && !isAllSelected;
  }, [runningInstances, selectedRows, isAllSelected]);

  const columns = React.useMemo(() => {
    const tempColumns = [
      {
        id: 'select',
        header: (
          <Checkbox
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onChange={e => handleSelectAll(e.target.checked)}
          />
        ),
        Cell: ({ row }) => (
          <Checkbox
            checked={selectedRows.has(row.original.id)}
            onChange={e => handleSelectRow(row.original.id, e.target.checked)}
          />
        ),
        size: 20,
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: 'name',
        header: 'Name',
        accessorFn: row => row.name,
      },
      {
        id: 'id',
        header: 'ID',
        accessorKey: 'id',
        size: 300,
        Cell: ({ row }) => (
          <Link
            routeName={`/gadgets/background/:instance/:version/:imageName`}
            params={{
              instance: row.original.id,
              version: row.original.gadgetConfig?.version,
              imageName: row.original.gadgetConfig?.imageName,
            }}
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
        accessorFn: row => row.imageName || row.gadgetConfig?.imageName,
        size: 300,
      },
      {
        id: 'tags',
        header: 'Tags',
        accessorFn: row => row.tags.join(''),
      },
      {
        id: 'version',
        header: 'Version',
        accessorFn: row => row.version || row.gadgetConfig?.version,
        size: 200,
      },
    ];
    return tempColumns;
  }, [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleSelectRow]);

  if (pods === null) {
    return <Loader />;
  }
  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }

  return (
    <>
      {nodes && pods && (
        <GadgetConnectionForBackgroundRunningProcess
          nodes={nodes}
          pods={pods}
          callback={setGadgetConn}
          prepareGadgetInfo={null}
        />
      )}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Instances"
        description="Are you sure you want to delete the selected instances?"
        onConfirm={() => {
          selectedRows.forEach(id => {
            gadgetConn.deleteGadgetInstance(id, () => {
              console.log(`Deleted instance ${id}`);
              setRunningInstances(prev => prev.filter(instance => instance.id !== id));
            });
          });
          setOpenConfirmDialog(false);
        }}
        handleClose={() => {
          setOpenConfirmDialog(false);
        }}
      />
      <SectionBox title={hideTitle ? '' : `Running Instances`}>
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
                  padding: '6px 22px',
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
          data={runningInstances ?? []}
          columns={columns}
          loading={runningInstances === null}
        />
      </SectionBox>
    </>
  );
}
