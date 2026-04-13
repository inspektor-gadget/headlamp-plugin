import { Icon } from '@iconify/react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Divider from '@mui/material/Divider';
import React, { useCallback, useMemo } from 'react';
import { FILTERS_TYPE } from './filter_types';
import { removeDuplicates } from './helper';
import AnnotationFilter from './params/annotation';
import CheckboxFilter from './params/bool';
import FilterComponent from './params/filter';
import K8sFilterComponent from './params/k8sfilter';
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
  tags?: string[];
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
            InputProps={{ endAdornment: infoAdornment }}
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
    if (
      initialNamespace &&
      namespaceParam &&
      filters[namespaceParam.prefix + namespaceParam.key] !== initialNamespace
    ) {
      handleFilterChange(namespaceParam.prefix + namespaceParam.key, initialNamespace as string);
    }
    if (initialPod && podParam && filters[podParam.prefix + podParam.key] !== initialPod) {
      handleFilterChange(podParam.prefix + podParam.key, initialPod as string);
    }
    if (
      (initialNamespace || initialPod) &&
      filters[allNamespacesParam.prefix + allNamespacesParam.key] !== 'false'
    ) {
      handleFilterChange(allNamespacesParam.prefix + allNamespacesParam.key, 'false');
    }
  }, [initialNamespace, initialPod, namespaceParam, allNamespacesParam, podParam]);

  const filterComponents = useMemo(() => {
    // Group params by their "group:" tag for sectioned display
    const groups: Record<string, FilterParam[]> = {};

    uniqueParams.forEach(param => {
      // Special-case all-namespaces (handeled seperatly)
      if (param.key === 'all-namespaces') return;

      const groupTag = param.tags?.find(tag => tag.startsWith('group:'));

      const groupName = groupTag ? groupTag.replace('group:', '') : 'Other';

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(param);
    });

    // Desired order of groups;
    const groupOrder = [
      'Other',
      'Data Collection',
      'Data Filtering',
      'eBPF',
      'OCI',
      'OpenTelemetry Metrics',
      'Process',
    ];

    const components: React.ReactNode[] = [];
    console.log(uniqueParams, 'uniqueParams');
    if (!initialNamespace && allNamespacesParam) {
      components.push(
        <Box key={allNamespacesParam.key}>
          <CheckboxFilter
            param={allNamespacesParam}
            config={{
              get: () => config[allNamespacesParam.prefix + allNamespacesParam.key],
              set: value =>
                handleFilterChange(allNamespacesParam.prefix + allNamespacesParam.key, value),
            }}
          />
        </Box>
      );
    }

    // params that are missing typeHint frmo config
    const otelMetricPrintIntervalParam = uniqueParams.find(
      param => param.key === 'otel-metrics-print-interval'
    );
    const runtimeContainerNameParam = uniqueParams.find(
      param => param.key === 'runtime-containername'
    );
    if (runtimeContainerNameParam) {
      runtimeContainerNameParam.typeHint = 'string';
    }
    if (otelMetricPrintIntervalParam) {
      otelMetricPrintIntervalParam.typeHint = 'string';
    }

    groupOrder.forEach(groupName => {
      const paramsInGroup = groups[groupName];
      if (!paramsInGroup || !paramsInGroup.length) return;

      components.push(
        <Box key={groupName} mt={2}>
          {groupName !== 'Other' && (
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 800 }}>
              {groupName}
            </Typography>
          )}
          <Box>
            {paramsInGroup.map((param, index) => {
              if (param.key === 'annotation' || param.key === 'annotate') {
                return (
                  <Box key={param.key + index}>
                    <AnnotationFilter
                      param={param}
                      setFilters={setFilters}
                      filters={filters}
                      // @ts-ignore
                      dataSources={config.dataSources}
                    />
                  </Box>
                );
              }

              if (param.key === 'sort' || param.key === 'sorting') {
                return (
                  <Box key={param.key + index}>
                    <SortingFilter
                      param={param}
                      config={{
                        get: () => config[param.prefix + param.key],
                        set: value => handleFilterChange(param.prefix + param.key, value),
                      }}
                      gadgetConfig={config}
                    />
                  </Box>
                );
              }
              if (param.typeHint === 'bool') {
                return (
                  <Box key={param.key + index}>
                    <CheckboxFilter
                      param={param}
                      config={{
                        get: () => config[param.prefix + param.key],
                        set: value => handleFilterChange(param.prefix + param.key, value),
                      }}
                    />
                  </Box>
                );
              }

              if (param.key === 'filter' || param.typeHint === 'filter') {
                return (
                  <Box key={param.key + index}>
                    <FilterComponent
                      param={param}
                      config={{
                        get: () => filters[param.prefix + param.key],
                        set: value => handleFilterChange(param.prefix + param.key, value),
                      }}
                      gadgetConfig={config}
                    />
                  </Box>
                );
              }

              if (param.valueHint?.startsWith('k8s:')) {
                return (
                  <Box key={param.key + index}>
                    <K8sFilterComponent
                      param={param}
                      config={{
                        get: () => filters[param.prefix + param.key],
                        set: value => handleFilterChange(param.prefix + param.key, value),
                      }}
                      namespace={initialNamespace}
                      pod={initialPod}
                      gadgetConfig={config}
                    />
                  </Box>
                );
              }
              if (param.possibleValues && param.possibleValues.length > 0) {
                return (
                  <Box key={param.key + index}>
                    <SelectFilter
                      param={param}
                      config={{
                        get: () => filters[param.prefix + param.key],
                        set: value => handleFilterChange(param.prefix + param.key, value),
                      }}
                    />
                  </Box>
                );
              }

              return (
                <Box key={param.key + index}>
                  {param.key}
                  <FilterInput param={param} onChange={handleFilterChange} />
                </Box>
              );
            })}
          </Box>
          <Divider sx={{ my: 2 }} />
        </Box>
      );
    });

    return components;
  }, [uniqueParams, handleFilterChange]);

  if (!config || !filterComponents.length) return null;

  return <Box p={2}>{filterComponents}</Box>;
}
