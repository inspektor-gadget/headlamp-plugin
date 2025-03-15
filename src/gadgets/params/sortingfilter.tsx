import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, IconButton, Button } from '@mui/material';
import { Icon } from '@iconify/react';
import Title from './title'; // Assuming you've converted the Title component to React


const SortingFilter = ({ param, config, gadgetConfig }) => {
  const operations = {
    '-': { icon: 'mdi:arrow-up', title: 'Descending' },
    '': { icon: 'mdi:arrow-down', title: 'Ascending' },
  };

  const [filters, setFilters] = useState([]);

  const fields = React.useMemo(() => {
    const gadgetInfo = gadgetConfig.dataSources;
    if (!gadgetInfo) return [];

    let tmpFields = [];
    Object.values(gadgetInfo).forEach((ds) => {
      ds.fields.forEach(f => {
        tmpFields.push({ ds: ds.name, field: f.fullName, display: `${ds.name}.${f.fullName}` });
      });
    });
    return tmpFields;
  }, []);

  useEffect(() => {
    const dataSources = {};
    filters.forEach(f => {
      dataSources[f.field.ds] = [...(dataSources[f.field.ds] || []), f];
    });
    const res = Object.entries(dataSources).map(([d, fields]) => {
      return `${d}:${fields.map(f => `${f.sorting}${f.field.field}`).join(',')}`;
    }).join(';');
    
    if (filters.length === 0) {
      config.set(undefined);
    } else {
      config.set(res);
    }
  }, [filters, param, config]);

  const handleFieldChange = (index, newField) => {
    setFilters(prev => prev.map((f, i) => i === index ? { ...f, field: newField } : f));
  };

  const handleSortingChange = (index) => {
    setFilters(prev => prev.map((f, i) => i === index ? { ...f, sorting: f.sorting === '' ? '-' : '' } : f));
  };

  const handleDelete = (index) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const addFilter = () => {
    setFilters(prev => [...prev, { sorting: '', field: fields[0] }]);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box width="33%">
        <Title param={param} />
      </Box>
      <Box display="flex" flexDirection="column" gap={1}>
        {filters.map((filter, idx) => (
          <Box key={idx} display="flex" flexDirection="row" alignItems="center" gap={1}>
            <Select
              value={filter.field}
              onChange={(e) => handleFieldChange(idx, e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {fields.map((field) => (
                <MenuItem key={field.display} value={field}>
                  {field.display}
                </MenuItem>
              ))}
            </Select>
            <IconButton
              onClick={() => handleSortingChange(idx)}
              title={operations[filter.sorting].title}
            >
              <Icon icon={operations[filter.sorting].icon} />
            </IconButton>
            <IconButton onClick={() => handleDelete(idx)} color="error">
              <Icon icon={'mdi:trash'} />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="contained"
          onClick={addFilter}
          startIcon={<Typography>+</Typography>}
        >
          Add Sorting
        </Button>
      </Box>
    </Box>
  );
};

export default SortingFilter;
