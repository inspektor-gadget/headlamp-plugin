import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Divider from '@mui/material/Divider';
import React, { useCallback, useMemo, useRef } from 'react';
import { FILTERS_TYPE } from './filter_types';
import { removeDuplicates } from './helper';
import AnnotationFilter from './params/annotation';
import CheckboxFilter from './params/bool';
import FilterComponent from './params/filter';
import K8sFilterComponent from './params/k8sfilter';
import SelectFilter from './params/select';
import SortingFilter from './params/sortingfilter';

/**
 * Hook that returns a stable config object { get, set } for a given filter param.
 * This prevents child components from re-rendering due to new object references.
 */
function useStableConfig(
  filters: Record<string, string>,
  handleFilterChange: (key: string, value: string | undefined) => void,
  prefix: string,
  key: string
) {
  const filterKey = prefix + key;
  // Use a ref to hold the latest filters so `get` is stable but always reads current value
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const get = useCallback(() => filtersRef.current[filterKey], [filterKey]);
  const set = useCallback(
    (value: string | undefined) => handleFilterChange(filterKey, value),
    [filterKey, handleFilterChange]
  );

  return useMemo(() => ({ get, set }), [get, set]);
}

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
  onApplyFilters?: () => void;
  showApplyButton?: boolean;
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
  onApplyFilters,
  showApplyButton = false,
}: GadgetFiltersProps) {
  const handleFilterChange = useCallback(
    (key: string, value: string | undefined) => {
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
      allNamespacesParam &&
      filters[allNamespacesParam.prefix + allNamespacesParam.key] !== 'false'
    ) {
      handleFilterChange(allNamespacesParam.prefix + allNamespacesParam.key, 'false');
    }
  }, [initialNamespace, initialPod, namespaceParam, allNamespacesParam, podParam, handleFilterChange]);

  const groupedParams = useMemo(() => {
    const groups: Record<string, FilterParam[]> = {};

    // Derive new param objects for params missing typeHint — do not mutate originals
    const typeHintOverrides: Record<string, string> = {
      'otel-metrics-print-interval': 'string',
      'runtime-containername': 'string',
    };

    uniqueParams.forEach(param => {
      if (param.key === 'all-namespaces') return;

      const override = typeHintOverrides[param.key];
      const resolvedParam = override ? { ...param, typeHint: override } : param;

      const groupTag = resolvedParam.tags?.find(tag => tag.startsWith('group:'));
      const groupName = groupTag ? groupTag.replace('group:', '') : 'Other';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(resolvedParam);
    });

    return groups;
  }, [uniqueParams]);

  const groupOrder = [
    'Other',
    'Data Collection',
    'Data Filtering',
    'eBPF',
    'OCI',
    'OpenTelemetry Metrics',
    'Process',
  ];

  const hasParams = groupOrder.some(g => groupedParams[g]?.length);

  if (!config || (!hasParams && !(!initialNamespace && allNamespacesParam))) return null;

  return (
    <Box p={2}>
      {!initialNamespace && allNamespacesParam && (
        <Box key={allNamespacesParam.key}>
          <ParamFilterRenderer
            param={allNamespacesParam}
            filters={filters}
            handleFilterChange={handleFilterChange}
            gadgetConfig={config}
            initialNamespace={initialNamespace}
            initialPod={initialPod}
          />
        </Box>
      )}
      {groupOrder.map(groupName => {
        const paramsInGroup = groupedParams[groupName];
        if (!paramsInGroup?.length) return null;
        return (
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
                return (
                  <Box key={param.key + index}>
                    <ParamFilterRenderer
                      param={param}
                      filters={filters}
                      handleFilterChange={handleFilterChange}
                      gadgetConfig={config}
                      initialNamespace={initialNamespace}
                      initialPod={initialPod}
                    />
                  </Box>
                );
              })}
            </Box>
            <Divider sx={{ my: 2 }} />
          </Box>
        );
      })}
      {showApplyButton && onApplyFilters && (
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button variant="contained" color="primary" onClick={onApplyFilters}>
            Apply Filters
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * Renders a single param filter with a stable config object.
 * Extracted as a component so useStableConfig hook can be called per-param.
 */
function ParamFilterRenderer({
  param,
  filters,
  handleFilterChange,
  gadgetConfig,
  initialNamespace,
  initialPod,
}: {
  param: FilterParam;
  filters: Record<string, string>;
  handleFilterChange: (key: string, value: string | undefined) => void;
  gadgetConfig: any;
  initialNamespace?: string;
  initialPod?: string;
}) {
  const stableConfig = useStableConfig(filters, handleFilterChange, param.prefix, param.key);

  if (param.key === 'sort' || param.key === 'sorting') {
    return <SortingFilter param={param} config={stableConfig} gadgetConfig={gadgetConfig} />;
  }
  if (param.typeHint === 'bool') {
    return <CheckboxFilter param={param} config={stableConfig} />;
  }
  if (param.key === 'filter' || param.typeHint === 'filter') {
    return <FilterComponent param={param} config={stableConfig} gadgetConfig={gadgetConfig} />;
  }
  if (param.valueHint?.startsWith('k8s:')) {
    return (
      <K8sFilterComponent
        param={param}
        config={stableConfig}
        namespace={initialNamespace ?? ''}
        pod={initialPod ?? ''}
        gadgetConfig={gadgetConfig}
      />
    );
  }
  if (param.possibleValues && param.possibleValues.length > 0) {
    return <SelectFilter param={param} config={stableConfig} />;
  }

  return <FilterInput param={param} onChange={handleFilterChange} />;
}
