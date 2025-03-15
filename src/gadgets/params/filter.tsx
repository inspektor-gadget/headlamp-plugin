import React, { useState, useEffect, useMemo } from 'react';
import { Box, Select, MenuItem, IconButton, Button, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import Title from './title'; // Assuming you've converted the Title component to React

// Assuming you have a context for currentGadget
const CurrentGadgetContext = React.createContext(null);

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
  const maxDescriptionLength = 100; // Characters before collapsing
  const shouldCollapse = param.description && param.description.length > maxDescriptionLength;

  const fields = useMemo(() => {
    const gadgetInfo = gadgetConfig.dataSources;
    if (!gadgetInfo) return [];
     let tmpFields = [];
    Object.values(gadgetInfo).forEach((ds) => {
      ds.fields.forEach(f => {
        tmpFields.push({ ds: ds.name, ...f });
      });
    });
    return tmpFields;
  }, []);

  useEffect(() => {
    const res = filters.map(f => {
      return `${f.key}${f.op}${f.value?.replace(/\\/g, '\\\\').replace(/,/g, '\\,') || ''}`;
    }).join(',');
    if (filters.length === 0) {
        // dont' set this
      config.set(undefined);
    } else {
      config.set(res);
    }
  }, [filters, param, config]);

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

  const removeFilter = (index) => {
    setFilters(prevFilters => prevFilters.filter((_, i) => i !== index));
  };

  const toggleDescription = () => {
    setExpanded(!expanded);
  };

  const renderDescription = () => {
    if (!param.description) return null;
    
    if (shouldCollapse) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', marginBottom: 1 }}>
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
              mt: 0.5
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

  return (
    <Box>
      <Box>
        <Typography variant="body1">
          {param.title || param.key}
        </Typography>
        {renderDescription()}
      </Box>

      <Box display="flex" flexDirection="column" gap={1}>
        {filters.map((filter, idx) => (
          <Box key={idx} display="flex" flexDirection="row" alignItems="center" gap={1}>
            <Select
              value={filter.key || ''}
              onChange={(e) => handleFilterChange(idx, 'key', e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {fields.map((field) => (
                <MenuItem key={`${field.ds}.${field.fullName}`} value={`${field.ds}.${field.fullName}`}>
                  {`${field.ds}.${field.fullName}`}
                </MenuItem>
              ))}
            </Select>
            <Select
              value={filter.op || ''}
              onChange={(e) => handleFilterChange(idx, 'op', e.target.value)}
              sx={{ minWidth: 100 }}
            >
              {operations.map((op) => (
                <MenuItem key={op.key} value={op.key}>
                  {op.key}
                </MenuItem>
              ))}
            </Select>
            <TextField
              fullWidth
              placeholder={param.defaultValue}
              value={filter.value || ''}
              onChange={(e) => handleFilterChange(idx, 'value', e.target.value)}
            />
            <IconButton onClick={() => removeFilter(idx)} color="error">
              <Icon icon="mdi:delete" />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="contained"
          onClick={addFilter}
          startIcon={<Icon icon="mdi:add" />}
        >
          Add Filter
        </Button>
      </Box>
    </Box>
  );
};

export default FilterComponent;