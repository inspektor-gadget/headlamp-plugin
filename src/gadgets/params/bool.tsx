import { Box, Checkbox, FormControlLabel } from '@mui/material';
import React from 'react';
import Title from './title'; // Assuming you've converted the Title component to React

const CheckboxFilter = ({ param, config }) => {
  const [checked, setChecked] = React.useState(config.get?.() === 'true');

  const handleChange = event => {
    setChecked(event.target.checked);
    config.set(event.target.checked.toString());
  };
  return (
    <Box display="flex" flexDirection="row" gap={2}>
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={handleChange} />}
        label={<Title param={param} />}
      />
    </Box>
  );
};

export default CheckboxFilter;
