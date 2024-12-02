import { Box, Link, useTheme } from '@mui/material';

export function IGNotFound() {
  const theme = useTheme();
  return (
    <Box
      // center this box and also wrap it in a white background with some box shadow
      style={{
        padding: '1rem',
        alignItems: 'center',
        margin: '2rem auto',
        height: '20vh',
        width: '50%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <h1>Inspektor Gadget is not installed</h1>
      <p>
        Follow the{' '}
        <Link target="_blank" href="https://inspektor-gadget.io/docs/latest/quick-start">
          installation guide
        </Link>{' '}
        to install Inspektor Gadget on your cluster
      </p>
    </Box>
  );
}
