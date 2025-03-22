import { Icon } from '@iconify/react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import React from 'react';
import Title from './title'; // Assuming you've converted the Title component to React

const SelectFilter = ({ param, config }) => {
  const handleChange = event => {
    config.set(event.target.value);
  };

  return (
    <Box>
      <Box width="33%">
        <Title param={param} />
      </Box>
      <FormControl fullWidth variant="outlined">
        <InputLabel id={`select-label-${param.key}`}>{param.title || param.key}</InputLabel>
        <Select
          variant="outlined"
          labelId={`select-label-${param.key}`}
          value={config.get()}
          onChange={handleChange}
          label={param.title || param.key}
          IconComponent={() => (
            <Icon
              icon="mdi:chevron-down"
              style={{
                position: 'absolute',
                right: 7,
                top: 'calc(50% - 12px)',
                pointerEvents: 'none',
                color: 'currentColor',
              }}
            />
          )}
        >
          {param.possibleValues.map(value => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default SelectFilter;
