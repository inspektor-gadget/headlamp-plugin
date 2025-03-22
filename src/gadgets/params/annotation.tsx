import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useCallback, useEffect, useState } from 'react';

const DeleteButton = styled(Button)(({}) => ({
  backgroundColor: '#7f1d1d', // bg-red-900
  '&:hover': {
    backgroundColor: '#991b1b', // bg-red-800
  },
  padding: '4px 8px',
  minWidth: 'unset',
}));

const AddButton = styled(Button)(({}) => ({
  padding: '4px 8px',
}));

interface FilterItem {
  field?: string;
  key?: string;
  value?: string;
}

interface AnnotationFilterProps {
  param: {
    key: string;
    title?: string;
    prefix: string;
    defaultValue?: string;
    description?: string;
  };
  setFilters: (func: (prev: Record<string, string>) => Record<string, string>) => void;
  filters: Record<string, string>;
  dataSources?: Record<string, any>;
}

export const AnnotationFilter: React.FC<AnnotationFilterProps> = ({
  param,
  setFilters,
  filters,
  dataSources = {},
}) => {
  const [filterItems, setFilterItems] = useState<FilterItem[]>([]);

  // Parse existing filter string when component mounts or filters change
  useEffect(() => {
    const currentFilter = filters[param.prefix + param.key];
    if (currentFilter) {
      try {
        // Handle escaped commas and backslashes
        const parseFilter = (filterStr: string) => {
          const filters: FilterItem[] = [];
          let currentItem: FilterItem = {};
          let buffer = '';
          let field = true; // true if parsing field, false if parsing value
          let key = false; // true if parsing key
          let escaped = false;

          for (let i = 0; i < filterStr.length; i++) {
            const char = filterStr[i];

            if (escaped) {
              buffer += char;
              escaped = false;
            } else if (char === '\\') {
              escaped = true;
            } else if (char === ':' && field) {
              currentItem.field = buffer;
              buffer = '';
              field = false;
              key = true;
            } else if (char === '=' && !field && key) {
              currentItem.key = buffer;
              buffer = '';
              key = false;
            } else if (char === ',' && !escaped) {
              if (field) {
                currentItem.field = buffer;
              } else if (key) {
                currentItem.key = buffer;
              } else {
                currentItem.value = buffer;
              }

              filters.push(currentItem);
              currentItem = {};
              buffer = '';
              field = true;
              key = false;
            } else {
              buffer += char;
            }
          }

          // Handle the last item
          if (buffer || Object.keys(currentItem).length) {
            if (field) {
              currentItem.field = buffer;
            } else if (key) {
              currentItem.key = buffer;
            } else {
              currentItem.value = buffer;
            }
            filters.push(currentItem);
          }

          return filters;
        };

        setFilterItems(parseFilter(currentFilter));
      } catch (e) {
        console.error('Error parsing annotation filter:', e);
        setFilterItems([]);
      }
    }
  }, [filters, param.key, param.prefix]);

  // Generate fields from data sources
  const fields = React.useMemo(() => {
    const tmpFields = [];

    Object.values(dataSources).forEach((ds: any) => {
      if (!ds) return;

      tmpFields.push({ key: ds.name, display: ds.name });
      if (ds.fields) {
        ds.fields.forEach((f: any) => {
          tmpFields.push({
            key: ds.name + '.' + f.fullName,
            display: '- ' + ds.name + '.' + f.fullName,
          });
        });
      }
    });

    return tmpFields;
  }, [dataSources]);

  // Update parent filters when filterItems change
  useEffect(() => {
    if (!filterItems.length) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[param.prefix + param.key];
        return newFilters;
      });
    } else {
      const filterString = filterItems
        .filter(f => f.field) // Only include items with at least a field
        .map(f => {
          return `${f.field || ''}:${f.key || ''}=${(f.value || '')
            .replace(/\\/g, '\\\\')
            .replace(/,/g, '\\,')}`;
        })
        .join(',');

      setFilters(prev => ({
        ...prev,
        [param.prefix + param.key]: filterString,
      }));
    }
  }, [filterItems, param.key, param.prefix, setFilters]);

  const handleAddFilter = useCallback(() => {
    setFilterItems(prev => [...prev, {}]);
  }, []);

  const handleDeleteFilter = useCallback((index: number) => {
    setFilterItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleFieldChange = useCallback((index: number, field: string) => {
    setFilterItems(prev => prev.map((item, i) => (i === index ? { ...item, field } : item)));
  }, []);

  const handleKeyChange = useCallback((index: number, key: string) => {
    setFilterItems(prev => prev.map((item, i) => (i === index ? { ...item, key } : item)));
  }, []);

  const handleValueChange = useCallback((index: number, value: string) => {
    setFilterItems(prev => prev.map((item, i) => (i === index ? { ...item, value } : item)));
  }, []);

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2">{param.title || param.key}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filterItems.map((filter, idx) => (
              <Box
                key={idx}
                sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}
              >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={filter.field || ''}
                    onChange={e => handleFieldChange(idx, e.target.value)}
                    displayEmpty
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="">
                      <em>Select field</em>
                    </MenuItem>
                    {fields.map(field => (
                      <MenuItem key={field.key} value={field.key}>
                        {field.display}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Key"
                  value={filter.key || ''}
                  onChange={e => handleKeyChange(idx, e.target.value)}
                  fullWidth
                />

                <TextField
                  size="small"
                  placeholder="Value"
                  value={filter.value || ''}
                  onChange={e => handleValueChange(idx, e.target.value)}
                  fullWidth
                />

                <DeleteButton
                  variant="contained"
                  color="error"
                  onClick={() => handleDeleteFilter(idx)}
                  startIcon={<Icon icon="mdi:trash" />}
                ></DeleteButton>
              </Box>
            ))}
          </Box>
          <Box mt={1}>
            <AddButton variant="contained" onClick={handleAddFilter}>
              Add Annotation
            </AddButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnnotationFilter;
