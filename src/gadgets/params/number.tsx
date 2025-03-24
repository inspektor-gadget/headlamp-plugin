import { Box, TextField } from '@mui/material';
import React from 'react';
import Title from './title'; // Assuming you've converted the Title component to React

const NumberFilter = ({ param, config }) => {
  const handleChange = event => {
    config.set(param, event.target.value);
  };

  return (
    <Box display="flex" flexDirection="column" width="100%" m={2}>
      <Box width="33%">
        <Title param={param} />
      </Box>
      <TextField
        type="number"
        fullWidth
        variant="outlined"
        placeholder={param.defaultValue}
        value={config.get(param) || ''}
        onChange={handleChange}
        InputProps={{
          style: {
            color: 'white',
            borderRadius: '0.25rem', // This is equivalent to rounded
          },
        }}
      />
    </Box>
  );
};

export default NumberFilter;
