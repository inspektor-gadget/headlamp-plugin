import { Icon } from '@iconify/react';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { FILTERS_TYPE } from './filter_types';
import { removeDuplicates } from './helper';

let FilterComponents = [];
export default function GadgetFilters(props: {
  config: any;
  setFilters: (func?: (val: any) => any) => void;
  isConnected: boolean;
  filters: any;
  onApplyFilters: () => void;
}) {
  const { config, setFilters, isConnected } = props;
  if (!isConnected) {
    return null;
  }

  React.useMemo(() => {
    if (config && config.params) {
      const uniqueConfig = removeDuplicates(config.params);
      FilterComponents = uniqueConfig?.map((param, index) => {
        if (!param.typeHint && !param.valueHint) {
          return (
            <Grid item md={6}>
              <TextField
                key={param.key + index}
                label={param.title || param.key}
                variant="outlined"
                fullWidth
                onChange={e => {
                  setFilters(prevVal => {
                    return {
                      ...prevVal,
                      [param.prefix + param.key]: e.target.value,
                    };
                  });
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={param.description}>
                        <Icon icon="mdi:info" />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          );
        }
        const filter = FILTERS_TYPE[param.typeHint];
        if (param.key === 'all-namespaces') {
          return null;
        }
        if (param?.valueHint?.includes('namespace')) {
          return (
            <NamespaceFilter
              setFilters={setFilters}
              key={param.key + index}
              param={param}
              allNamespace={uniqueConfig.filter(param => param.key === 'all-namespaces')}
              pod={uniqueConfig.filter(param => param.key === 'podname')}
            />
          );
        }

        if (!filter) return null;

        if (filter.type === 'checkbox') {
          return (
            <Grid item md={6} key={param.key + index}>
              <FormControlLabel
                control={
                  <Switch
                    defaultChecked={param.defaultValue === 'true'}
                    onChange={e => {
                      setFilters(prevVal => {
                        return {
                          ...prevVal,
                          [param.prefix + param.key]: String(e.target.checked),
                        };
                      });
                    }}
                  />
                }
                label={param.title || param.key}
              />
            </Grid>
          );
        }

        if (filter.type === 'number') {
          return (
            <Grid item md={6} key={param.key + index}>
              <TextField
                type={'number'}
                defaultValue={param.defaultValue}
                onChange={e => {
                  setFilters(prevVal => {
                    return {
                      ...prevVal,
                      [param.prefix + param.key]: e.target.value,
                    };
                  });
                }}
                min={filter.min}
                max={filter.max}
                label={param.title || param.key}
                fullWidth
                variant="outlined"
              />
            </Grid>
          );
        }

        if (filter.type === 'string') {
          return (
            <Grid item md={6} key={param.key + index}>
              <TextField
                defaultValue={param.defaultValue}
                onChange={e => {
                  setFilters(prevVal => {
                    return {
                      ...prevVal,
                      [param.prefix + param.key]: e.target.value,
                    };
                  });
                }}
                label={param.title || param.key}
                fullWidth
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={param.description}>
                        <Icon icon="mdi:info" />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          );
        }

        return null;
      });
    }
  }, [config, config?.params]);

  return (
    config &&
    FilterComponents?.length > 0 && (
      <Accordion>
        <AccordionSummary
          expandIcon={<Icon icon="mdi:arrow-down" />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          Params
        </AccordionSummary>
        <AccordionDetails>
          <Box p={2}>
            <Grid container spacing={2} alignItems="center">
              {FilterComponents}
            </Grid>
            <Box textAlign="right">
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
                  props.onApplyFilters();
                }}
              >
                Apply Filters
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    )
  );
}

function PodsInputFilter(props: {
  setFilters: (func?: (val: any) => any) => void;
  selectedNamespace: string;
  podFilter: any;
}) {
  const [pods, error] = K8s.ResourceClasses.Pod.useList({ namespace: props.selectedNamespace });
  const { podFilter, setFilters, selectedNamespace } = props;
  const { prefix, key } = podFilter;
  console.log('pods', podFilter);

  if (!prefix || !key || !selectedNamespace) {
    return null;
  }

  if (error || !pods) {
    return null;
  }

  return (
    <Grid item md={6} key={key}>
      <InputLabel id="pods-label">Pods</InputLabel>
      <Select
        labelId="pods-label"
        label="Pods"
        select
        fullWidth
        variant="outlined"
        onChange={e => {
          setFilters(prevVal => {
            return {
              ...prevVal,
              [param.prefix + param.key]: e.target.value,
            };
          });
        }}
      >
        {pods.map(pod => {
          return (
            <MenuItem key={pod.metadata.name} value={pod.metadata.name}>
              {pod.metadata.name}
            </MenuItem>
          );
        })}
      </Select>
    </Grid>
  );
}

function NamespaceFilter(props: {
  setFilters: (func?: (val: any) => any) => any;
  key: string;
  param: any;
  allNamespace: any[];
  pod: any[];
}) {
  const { param, setFilters, allNamespace, pod } = props;
  const [namespaces, error] = K8s.ResourceClasses.Namespace.useList();
  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  console.log('pods is ', pod);
  if (error || !namespaces) {
    return null;
  }
  return (
    <>
      {selectedNamespace && pod && selectedNamespace !== 'all-namespaces' && (
        <PodsInputFilter
          podFilter={pod[0]}
          selectedNamespace={selectedNamespace}
          setFilters={setFilters}
        />
      )}
      <Grid item md={6}>
        <InputLabel id="namespace-label">Namespace</InputLabel>
        <Select
          labelId="namespace-label"
          label="Namespace"
          select
          fullWidth
          variant="outlined"
          onChange={e => {
            setSelectedNamespace(e.target.value as string);
            if (e.target.value === 'all-namespaces') {
              setFilters(prevVal => {
                return {
                  ...prevVal,
                  [allNamespace[0].prefix + allNamespace[0].key]: 'true',
                };
              });
              return;
            } else {
              setFilters(prevVal => {
                return {
                  ...prevVal,
                  [allNamespace[0].prefix + allNamespace[0].key]: 'false',
                  [param.prefix + param.key]: e.target.value,
                };
              });
            }
          }}
        >
          {allNamespace?.map(param => {
            return (
              <MenuItem key={param.key} value={param.key}>
                {param.key}
              </MenuItem>
            );
          })}
          {namespaces.map(namespace => {
            return (
              <MenuItem key={namespace.metadata.name} value={namespace.metadata.name}>
                {namespace.metadata.name}
              </MenuItem>
            );
          })}
        </Select>
      </Grid>
    </>
  );
}
