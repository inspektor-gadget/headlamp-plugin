import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DataSource } from 'src/types';
// Assuming you've converted the Title component to React

const operations = [
  { key: '==', description: 'equals' },
  { key: '!=', description: 'not equals' },
  { key: '<=', description: 'less than or equals' },
  { key: '>=', description: 'greater than or equals' },
  { key: '<', description: 'less than' },
  { key: '>', description: 'greater than' },
  { key: '~=', description: 'matches regular expression' },
];

const FilterComponent = ({ param, config, gadgetConfig }) => {
  const [filters, setFilters] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  // Tracks when init parsing found a non-empty config value but zero recognized fields.
  // Prevents the sync effect from wiping the stored config on mount.
  const parseFailed = useRef(false);
  const maxDescriptionLength = 100; // Characters before collapsing
  const shouldCollapse = param.description && param.description.length > maxDescriptionLength;

  const fields = useMemo(() => {
    const gadgetInfo = gadgetConfig.dataSources;
    if (!gadgetInfo) return [];
    const tmpFields = [];
    Object.values(gadgetInfo).forEach((ds: DataSource) => {
      ds.fields.forEach(f => {
        tmpFields.push({ ds: ds.name, ...f });
      });
    });
    return tmpFields;
  }, [gadgetConfig.dataSources]);

  // Initialization effect: parse existing config value into local state so the UI
  // reflects any filter that was already set before this component mounted.
  useEffect(() => {
    if (initialized) return;
    if (!fields || fields.length === 0) return;

    const currentValue = config.get();
    if (!currentValue) {
      setInitialized(true);
      return;
    }

    const ops = ['==', '!=', '<=', '>=', '~=', '<', '>'];
    const parts = currentValue.split(/(?<!\\),/);
    const parsedFilters = parts
      .map(part => {
        for (const op of ops) {
          const idx = part.indexOf(op);
          if (idx > 0) {
            const key = part.slice(0, idx);
            const value = part
              .slice(idx + op.length)
              .replace(/\\,/g, ',')
              .replace(/\\\\/g, '\\');
            if (fields.find(f => `${f.ds}:${f.fullName}` === key)) {
              return { key, op, value };
            }
          }
        }
        return null;
      })
      .filter(Boolean);

    if (parsedFilters.length > 0) {
      setFilters(parsedFilters);
    } else {
      // currentValue was non-empty but no field keys matched — mark so the sync
      // effect does not wipe the original config value on mount.
      parseFailed.current = true;
    }
    setInitialized(true);
  }, [config.get, fields, initialized]);

  // Sync effect: serialize local filter state back to config whenever user edits.
  useEffect(() => {
    if (!initialized) return;
    const res = filters
      .map(f => {
        return `${f.key}${f.op}${f.value?.replace(/\\/g, '\\\\').replace(/,/g, '\\,') || ''}`;
      })
      .join(',');
    if (filters.length === 0) {
      // Only clear the stored config when the user explicitly removed all filters.
      // If parseFailed, the empty state is from init failing to match field keys —
      // the original config value should be preserved.
      if (!parseFailed.current) {
        config.set(undefined);
      }
    } else {
      parseFailed.current = false;
      config.set(res);
    }
  }, [filters, config.set, initialized]);

  const handleFilterChange = (index, field, value) => {
    setFilters(prevFilters => {
      const newFilters = [...prevFilters];
      newFilters[index] = { ...newFilters[index], [field]: value };
      return newFilters;
    });
  };

  const addFilter = () => {
    setFilters(prevFilters => [...prevFilters, {}]);
  };

  const removeFilter = index => {
    setFilters(prevFilters => prevFilters.filter((_, i) => i !== index));
  };

  const toggleDescription = () => {
    setExpanded(!expanded);
  };

  const renderDescription = () => {
    if (!param.description) return null;

    if (shouldCollapse) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', my: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              textOverflow: expanded ? 'clip' : 'ellipsis',
              overflow: expanded ? 'visible' : 'hidden',
              maxHeight: expanded ? 'none' : '2.4rem', // About 2 lines of text
            }}
          >
            {param.description}
          </Typography>
          <Box
            onClick={toggleDescription}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'primary.main',
              mt: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ mr: 0.5 }}>
              {expanded ? 'Show less' : 'Show more'}
            </Typography>
            <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="16" height="16" />
          </Box>
        </Box>
      );
    }

    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          whiteSpace: 'pre-wrap',
          textOverflow: 'ellipsis',
          marginBottom: 1,
        }}
      >
        {param.description}
      </Typography>
    );
  };

  // Helper function to get field description from annotations
  const getFieldDescription = fieldKey => {
    if (!fieldKey) return null;
    const [dsName, fieldName] = fieldKey.split(':');
    const field = fields.find(f => f.ds === dsName && f.fullName === fieldName);
    return field?.annotations?.description;
  };

  // Helper function to get the selected field
  const getSelectedField = fieldKey => {
    if (!fieldKey) return null;
    const [dsName, fieldName] = fieldKey.split(':');
    return fields.find(f => f.ds === dsName && f.fullName === fieldName);
  };

  function prepareFilterValueComponentType(filter, idx) {
    if (!filter.key) return null;

    const selectedField = getSelectedField(filter.key);

    if (selectedField?.annotations?.['value.one-of']) {
      const options = selectedField.annotations['value.one-of'].split(',').map(o => o.trim());
      return (
        <Select
          fullWidth
          value={filter.value || ''}
          onChange={e => handleFilterChange(idx, 'value', e.target.value)}
        >
          {options.map(option => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      );
    }

    return (
      <TextField
        fullWidth
        placeholder={param.defaultValue}
        value={filter.value || ''}
        onChange={e => handleFilterChange(idx, 'value', e.target.value)}
      />
    );
  }
  return (
    <Box>
      <Box my={1}>
        <Typography variant="body1">{param.title || param.key}</Typography>
        {renderDescription()}
      </Box>
      <Box display="flex" flexDirection="column" gap={1} mb={2}>
        {filters.map((filter, idx) => (
          <Box key={idx} display="flex" flexDirection="row" alignItems="center" gap={1}>
            <Select
              value={filter.key || ''}
              onChange={e => handleFilterChange(idx, 'key', e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {fields.map(field => (
                <MenuItem
                  key={`${field.ds}:${field.fullName}`}
                  value={`${field.ds}:${field.fullName}`}
                >
                  {`${field.ds}:${field.fullName}`}
                </MenuItem>
              ))}
            </Select>
            {filter.key && getFieldDescription(filter.key) && (
              <Tooltip title={getFieldDescription(filter.key)} arrow placement="top">
                <IconButton size="small" color="info" sx={{ mr: -1, ml: -0.5 }}>
                  <Icon icon="mdi:information" width="16" height="16" />
                </IconButton>
              </Tooltip>
            )}
            <Select
              value={filter.op || ''}
              onChange={e => handleFilterChange(idx, 'op', e.target.value)}
              sx={{ minWidth: 100 }}
            >
              {operations.map(op => (
                <MenuItem key={op.key} value={op.key}>
                  {op.key}
                </MenuItem>
              ))}
            </Select>
            {prepareFilterValueComponentType(filter, idx)}
            <IconButton onClick={() => removeFilter(idx)} color="error">
              <Icon icon="mdi:delete" />
            </IconButton>
          </Box>
        ))}
        <Button variant="contained" onClick={addFilter} startIcon={<Icon icon="mdi:add" />}>
          Add Filter
        </Button>
      </Box>
    </Box>
  );
};

export default FilterComponent;
