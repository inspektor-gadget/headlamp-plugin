import { Box, Typography } from '@mui/material';
import React from 'react';

const Title = ({ param }) => {
  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      <Typography variant="body1">{param.title || param.key}</Typography>
      {param.description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxHeight: '6rem', // Approximately 24px * 4 lines
            marginBottom: 1,
          }}
        >
          {param.description}
        </Typography>
      )}
    </Box>
  );
};

export default Title;
