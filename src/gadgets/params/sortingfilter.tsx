import { Icon } from '@iconify/react';
import { Box, Button, IconButton, MenuItem, Select, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { DataSource } from 'src/types';
import Title from './title'; // Assuming you've converted the Title component to React

const SortingFilter = ({ param, config, gadgetConfig }) => {
  const operations = {
    '-': { icon: 'mdi:arrow-up', title: 'Descending' },
    '': { icon: 'mdi:arrow-down', title: 'Ascending' },
  };

  const [filters, setFilters] = useState([]);
  const [initialized, setInitialized] = useState(false);
  // Tracks when init parsing found a non-empty config value but zero recognized fields.
  // Prevents the sync effect from wiping the stored config on mount.
  const parseFailed = useRef(false);

  const fields = React.useMemo(() => {
    const gadgetInfo = gadgetConfig.dataSources;
    if (!gadgetInfo) return [];

    const tmpFields = [];
    Object.values(gadgetInfo).forEach((ds: DataSource) => {
      ds.fields.forEach(f => {
        tmpFields.push({ ds: ds.name, field: f.fullName, display: `${ds.name}.${f.fullName}` });
      });
    });
    return tmpFields;
  }, [gadgetConfig.dataSources]);

  useEffect(() => {
    if (initialized) {
      return;
    }

    if (!fields || fields.length === 0) {
      return;
    }

    const currentValue = typeof config.get === 'function' ? config.get() : undefined;

    if (!currentValue) {
      setInitialized(true);
      return;
    }

    const parsedFilters = [];

    currentValue.split(';').forEach(part => {
      if (!part) return;
      const [ds, fieldsPart] = part.split(':');
      if (!ds || !fieldsPart) return;

      fieldsPart.split(',').forEach(token => {
        if (!token) return;
        const sorting = token.startsWith('-') ? '-' : '';
        const fieldName = sorting === '-' ? token.slice(1) : token;
        const fieldObj = fields.find(f => f.ds === ds && f.field === fieldName);
        if (fieldObj) {
          parsedFilters.push({ sorting, field: fieldObj });
        }
      });
    });

    if (parsedFilters.length > 0) {
      setFilters(parsedFilters);
    } else {
      // currentValue was non-empty but no stored fields matched the current fields list.
      // Mark so the sync effect does not wipe the original config value on mount.
      parseFailed.current = true;
    }
    setInitialized(true);
  }, [config, fields, initialized]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const dataSources = {};
    filters.forEach(f => {
      dataSources[f.field.ds] = [...(dataSources[f.field.ds] || []), f];
    });
    const res = Object.entries(dataSources)
      .map(([d, fields]: [string, any[]]) => {
        return `${d}:${fields.map(f => `${f.sorting}${f.field.field}`).join(',')}`;
      })
      .join(';');

    if (filters.length === 0) {
      // Only clear the stored config when the user explicitly removed all sorts.
      // If parseFailed, the empty state is from init failing to match field names —
      // the original config value should be preserved.
      if (!parseFailed.current) {
        config.set(undefined);
      }
    } else {
      parseFailed.current = false;
      config.set(res);
    }
  }, [filters, config, initialized]);

  const handleFieldChange = (index, newField) => {
    setFilters(prev => prev.map((f, i) => (i === index ? { ...f, field: newField } : f)));
  };

  const handleSortingChange = index => {
    setFilters(prev =>
      prev.map((f, i) => (i === index ? { ...f, sorting: f.sorting === '' ? '-' : '' } : f))
    );
  };

  const handleDelete = index => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const addFilter = () => {
    if (fields.length === 0) return;
    setFilters(prev => [...prev, { sorting: '', field: fields[0] }]);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1} mb={2}>
      <Box width="33%">
        <Title param={param} />
      </Box>
      <Box display="flex" flexDirection="column" gap={1}>
        {filters.map((filter, idx) => (
          <Box key={idx} display="flex" flexDirection="row" alignItems="center" gap={1}>
            <Select
              value={filter.field}
              onChange={e => handleFieldChange(idx, e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {fields.map(field => (
                <MenuItem key={field.display} value={field}>
                  {field.display}
                </MenuItem>
              ))}
            </Select>
            <IconButton
              onClick={() => handleSortingChange(idx)}
              title={operations[filter.sorting].title}
              size="large"
            >
              <Icon icon={operations[filter.sorting].icon} />
            </IconButton>
            <IconButton onClick={() => handleDelete(idx)} color="error">
              <Icon icon={'mdi:delete'} />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="contained"
          onClick={addFilter}
          disabled={fields.length === 0}
          startIcon={<Typography>+</Typography>}
        >
          Add Sorting
        </Button>
      </Box>
    </Box>
  );
};

export default SortingFilter;
