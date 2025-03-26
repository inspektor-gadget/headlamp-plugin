import { Icon } from '@iconify/react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import React, { useCallback, useMemo } from 'react';
import { FILTERS_TYPE } from './filter_types';
import { removeDuplicates } from './helper';
import AnnotationFilter from './params/annotation';
import CheckboxFilter from './params/bool';
import FilterComponent from './params/filter';
import SelectFilter from './params/select';
import SortingFilter from './params/sortingfilter';

// Types for better type safety and documentation
interface FilterParam {
  key: string;
  title?: string;
  prefix: string;
  typeHint?: string;
  valueHint?: string;
  description?: string;
  defaultValue?: string;
  possibleValues?: string[];
}

interface GadgetFiltersProps {
  config: {
    params?: FilterParam[];
  };
  setFilters: (func: (prev: Record<string, string>) => Record<string, string>) => void;
  filters: Record<string, string>;
  onApplyFilters: () => void;
  namespace?: string;
  pod?: string;
}

// Separate component for filter input to reduce complexity
const FilterInput: React.FC<{
  param: FilterParam;
  onChange: (key: string, value: string) => void;
}> = React.memo(({ param, onChange }) => {
  const handleChange = useCallback(
    (value: string) => {
      onChange(param.prefix + param.key, value);
    },
    [param.prefix, param.key, onChange]
  );

  const commonProps = {
    label: param.title || param.key,
    variant: 'outlined' as const,
    fullWidth: true,
  };

  const infoAdornment = param.description ? (
    <InputAdornment position="end">
      <Tooltip title={param.description}>
        <Icon icon="mdi:info" />
      </Tooltip>
    </InputAdornment>
  ) : null;

  if (!param.typeHint && !param.valueHint) {
    return (
      <TextField
        {...commonProps}
        onChange={e => handleChange(e.target.value)}
        InputProps={{ endAdornment: infoAdornment }}
      />
    );
  }

  const filter = FILTERS_TYPE[param.typeHint];
  if (!filter) return null;

  switch (filter.type) {
    case 'checkbox':
      return (
        <Box my={1}>
          <FormControlLabel
            control={
              <Checkbox
                defaultChecked={param.defaultValue === 'true'}
                onChange={e => handleChange(String(e.target.checked))}
              />
            }
            label={param.title || param.key}
          />
        </Box>
      );
    case 'number':
      return (
        <Box my={1}>
          <TextField
            {...commonProps}
            type="number"
            defaultValue={param.defaultValue}
            onChange={e => handleChange(e.target.value)}
            inputProps={{ min: filter.min, max: filter.max }}
          />
        </Box>
      );
    case 'string':
      return (
        <Box my={1}>
          <TextField
            {...commonProps}
            defaultValue={param.defaultValue}
            onChange={e => handleChange(e.target.value)}
            InputProps={{ endAdornment: infoAdornment }}
          />
        </Box>
      );
    default:
      return null;
  }
});

// Main component
export default function GadgetFilters({
  config,
  setFilters,
  namespace: initialNamespace,
  pod: initialPod,
  filters,
}: GadgetFiltersProps) {
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      if (!value) {
        setFilters(prev => {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        });
        return;
      }
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  const uniqueParams = useMemo(
    () => (config?.params ? removeDuplicates(config.params) : []),
    [config?.params]
  );

  const namespaceParam = useMemo(
    () => uniqueParams.find(p => p.valueHint?.includes('namespace')),
    [uniqueParams]
  );

  const allNamespacesParam = useMemo(
    () => uniqueParams.find(p => p.key === 'all-namespaces'),
    [uniqueParams]
  );

  const podParam = useMemo(() => uniqueParams.find(p => p.key === 'podname'), [uniqueParams]);

  // Set initial values for namespace and pod if provided
  React.useEffect(() => {
    if (initialNamespace && initialPod && namespaceParam && allNamespacesParam && podParam) {
      handleFilterChange(allNamespacesParam.prefix + allNamespacesParam.key, 'false');
      handleFilterChange(namespaceParam.prefix + namespaceParam.key, initialNamespace);
      handleFilterChange(podParam.prefix + podParam.key, initialPod);
    }
  }, [initialNamespace, initialPod, namespaceParam, allNamespacesParam, podParam]);

  const filterComponents = useMemo(
    () =>
      uniqueParams.map((param, index) => {
        // Skip namespace-related params as they're handled separately
        if (param.key === 'all-namespaces' || param?.valueHint?.includes('namespace')) {
          return null;
        }
        if (param.key === 'annotation' || param.key === 'annotate') {
          return (
            <Grid item xs={12} key={param.key + index}>
              <AnnotationFilter
                param={param}
                setFilters={setFilters}
                filters={filters}
                // @ts-ignore
                dataSources={config.dataSources}
              />
            </Grid>
          );
        }

        if (param.key === 'sort' || param.key === 'sorting') {
          return (
            <Grid item xs={4} key={param.key + index}>
              <SortingFilter
                param={param}
                config={{
                  get: () => config[param.prefix + param.key],
                  set: value => handleFilterChange(param.prefix + param.key, value),
                }}
                gadgetConfig={config}
              />
            </Grid>
          );
        }
        if (param.typeHint === 'bool') {
          return (
            <Grid item xs={4}>
              <CheckboxFilter
                param={param}
                config={{
                  get: () => config[param.prefix + param.key],
                  set: value => handleFilterChange(param.prefix + param.key, value),
                }}
              />
            </Grid>
          );
        }

        if (param.key === 'filter' || param.typeHint === 'filter') {
          return (
            <Grid item xs={12} key={param.key + index}>
              <FilterComponent
                param={param}
                config={{
                  get: () => filters[param.prefix + param.key],
                  set: value => handleFilterChange(param.prefix + param.key, value),
                }}
                gadgetConfig={config}
              />
            </Grid>
          );
        }

        if (param.possibleValues && param.possibleValues.length > 0) {
          return (
            <Grid item md={6} key={param.key + index}>
              <SelectFilter
                param={param}
                config={{
                  get: () => filters[param.prefix + param.key],
                  set: value => handleFilterChange(param.prefix + param.key, value),
                }}
              />
            </Grid>
          );
        }

        return (
          <Grid item md={6} key={param.key + index}>
            <FilterInput param={param} onChange={handleFilterChange} />
          </Grid>
        );
      }),
    [uniqueParams, handleFilterChange]
  );

  if (!config || !filterComponents.length) return null;

  return <Box p={2}>{filterComponents}</Box>;
}
