import { Icon } from '@iconify/react';
import { DateLabel, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import GadgetFilters from '../../gadgets/gadgetFilters';
import { IS_METRIC } from '../helpers';
import { MetricChart } from '../MetricChart';

// Type definitions
interface InstanceConfig {
  name: string;
  tags: string[];
  nodes: string[];
}

interface BackgroundInstanceFormProps {
  open: boolean;
  onClose: () => void;
  filters: Record<string, any>;
  gadgetConn: any;
  nodesSelected: string[];
  onGadgetInstanceCreation: (success: any) => void;
}

interface GadgetWithDataSourceProps {
  podsSelected: any[];
  podStreamsConnected: number;
  setGadgetData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setBufferedGadgetData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setGadgetRunningStatus: React.Dispatch<React.SetStateAction<boolean>>;
  gadgetRunningStatus: boolean;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  filters: Record<string, any>;
  loading: boolean;
  gadgetConfig: any;
  dataSourceID: string;
  gadgetData: Record<string, any>;
  columns: string[];
  bufferedGadgetData: Record<string, any[]>;
  renderCreateBackgroundGadget: boolean;
  gadgetInstance?: any;
  gadgetConn: any;
  isRunningInBackground: boolean;
  setIsRunningInBackground: React.Dispatch<React.SetStateAction<boolean>>;
  onGadgetInstanceCreation: (success: any) => void;
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

function GadgetBackgroundInstanceForm({
  open,
  onClose,
  filters,
  gadgetConn,
  nodesSelected,
  onGadgetInstanceCreation,
}: BackgroundInstanceFormProps) {
  const [instanceConfig, setInstanceConfig] = useState<InstanceConfig>({
    name: '',
    tags: [],
    nodes: [],
  });
  const { enqueueSnackbar } = useSnackbar();
  const { imageName } = useParams<{ imageName: string }>();
  const [nodes] = K8s.ResourceClasses.Node.useList();

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
    enqueueSnackbar(`Creating background instance ${instanceConfig.name}`, {
      variant: 'info',
    });

    gadgetConn.createGadgetInstance(
      {
        gadgetConfig: {
          version: 1,
          imageName: imageName || '',
          paramValues: filters,
        },
        name: instanceConfig.name,
        tags: instanceConfig.tags,
        nodes: instanceConfig.nodes.includes('All') ? [] : instanceConfig.nodes,
      },
      (success: any) => {
        enqueueSnackbar('Background instance created', { variant: 'success' });
        onGadgetInstanceCreation(success);
      },
      (error: Error) => {
        enqueueSnackbar('Failed to create background instance', { variant: 'error' });
        console.error('Instance creation error:', error);
      }
    );
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Background Instance</DialogTitle>
      <DialogContent>
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
        {nodes && (
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
                input={<OutlinedInput id="multiple-nodes" label="Chip" />}
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={!instanceConfig.name} onClick={handleCreateInstance}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function GadgetWithDataSource(props: GadgetWithDataSourceProps) {
  const {
    podStreamsConnected,
    setGadgetData,
    setBufferedGadgetData,
    setGadgetRunningStatus,
    gadgetRunningStatus,
    setFilters,
    filters,
    loading,
    gadgetConfig,
    dataSourceID,
    gadgetData,
    columns,
    bufferedGadgetData,
    podsSelected,
    renderCreateBackgroundGadget,
    gadgetInstance,
    gadgetConn,
    setIsRunningInBackground,
    isRunningInBackground,
    onGadgetInstanceCreation,
  } = props;
  const [gadgetInstanceFormOpen, setGadgetInstanceFormOpen] = useState(false);
  const areAllPodStreamsConnected = podStreamsConnected === podsSelected.length;

  useEffect(() => {
    if (gadgetInstance) {
      const timer = setTimeout(() => {
        setGadgetRunningStatus(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gadgetInstance]);

  const fields = useMemo(
    () =>
      columns?.map(column => ({
        header: column,
        accessorFn: (data: any) =>
          column === 'timestamp' ? <DateLabel date={data[column]} /> : data[column],
      })),
    [columns]
  );

  useEffect(() => {
    if (bufferedGadgetData[dataSourceID]?.length > 0) {
      setGadgetData(bufferedGadgetData);
    }
  }, [bufferedGadgetData[dataSourceID], dataSourceID, setGadgetData]);

  function handleStartStop() {
    if (isRunningInBackground) {
      setGadgetInstanceFormOpen(true);
      return;
    }

    // Reset data when starting
    if (!gadgetRunningStatus) {
      setGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
      setBufferedGadgetData(prev => ({
        ...prev,
        [dataSourceID]: [],
      }));
    }

    setGadgetRunningStatus(prev => !prev);
  }

  const renderContent = () => {
    const hasMetricField = fields?.some(field => field.header === IS_METRIC);

    if (hasMetricField) {
      return podsSelected.map(pod => {
        const node = pod?.spec.nodeName;

        if (!node || !gadgetData[dataSourceID]) return null;
        return (
          <MetricChart
            key={pod?.jsonData.metadata.name}
            data={gadgetData[dataSourceID][node] || []}
            fields={fields}
            node={node}
          />
        );
      });
    }

    return (
      fields && <Table columns={fields} data={gadgetData[dataSourceID] || []} loading={loading} />
    );
  };

  return (
    <>
      {!gadgetInstance && (
        <GadgetFilters
          config={gadgetConfig}
          setFilters={setFilters}
          filters={filters}
          onApplyFilters={() => {
            setGadgetData(prev => ({
              ...prev,
              [dataSourceID]: [],
            }));
            setBufferedGadgetData(prev => ({
              ...prev,
              [dataSourceID]: [],
            }));

            // Toggle running status
            setGadgetRunningStatus(prev => !prev);
          }}
        />
      )}
      {!gadgetInstance && (
        <Box my={1} mx={2}>
          <span>Run in Background</span>
          <Checkbox
            checked={isRunningInBackground}
            onChange={e => setIsRunningInBackground(e.target.checked)}
          />
        </Box>
      )}
      {areAllPodStreamsConnected && (
        <Box mt={2}>
          <Box m={2}>
            <Grid container justifyContent="space-between" spacing={2}>
              <Grid item>Status: {gadgetRunningStatus ? 'Running' : 'Stopped'}</Grid>
              <GadgetBackgroundInstanceForm
                open={gadgetInstanceFormOpen}
                onClose={() => setGadgetInstanceFormOpen(false)}
                filters={filters}
                gadgetConn={gadgetConn}
                nodesSelected={podsSelected.map(pod => pod.spec.nodeName)}
                onGadgetInstanceCreation={onGadgetInstanceCreation}
              />

              {!gadgetInstance && renderCreateBackgroundGadget && (
                <Grid item>
                  <span>Run in Background</span>
                  <Checkbox
                    checked={isRunningInBackground}
                    onChange={e => setIsRunningInBackground(e.target.checked)}
                  />
                </Grid>
              )}

              <Grid item>
                {gadgetInstance ? (
                  <>
                    <Button
                      disabled={podsSelected.length === 0 || gadgetRunningStatus}
                      onClick={() => setGadgetRunningStatus(prev => !prev)}
                      variant="outlined"
                    >
                      {loading ? 'Processing' : !gadgetRunningStatus ? 'Attach' : 'Attached'}
                    </Button>
                  </>
                ) : (
                  podsSelected.length > 0 && (
                    <Button
                      disabled={podsSelected.length === 0}
                      onClick={handleStartStop}
                      variant="outlined"
                    >
                      {loading
                        ? 'Processing'
                        : !gadgetRunningStatus
                        ? isRunningInBackground
                          ? 'Start'
                          : 'Run Now'
                        : 'Stop'}
                    </Button>
                  )
                )}
              </Grid>
            </Grid>
          </Box>

          {renderContent()}
        </Box>
      )}
    </>
  );
}
