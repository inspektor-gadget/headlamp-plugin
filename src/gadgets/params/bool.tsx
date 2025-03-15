import React from 'react';
import { Checkbox, FormControlLabel, Box } from '@mui/material';
import Title from './title'; // Assuming you've converted the Title component to React

const CheckboxFilter = ({ param, config }) => {
  const handleChange = (event) => {
    config.set(event.target.checked.toString());
  };
  console.log("params",config.get(param));
  return (
    <Box display="flex" flexDirection="row" gap={2}>
      <FormControlLabel
        control={
          <Checkbox
            onChange={handleChange}
          />
        }
        label={<Title param={param} />}
      />
    </Box>
  );
};

export default CheckboxFilter;