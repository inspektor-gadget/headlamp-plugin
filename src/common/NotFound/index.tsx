import { Box, Link, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function IGNotFound() {
  const theme = useTheme();
  const { t } = useTranslation();
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
      <h1>{t('Inspektor Gadget is not installed')}</h1>
      <p>
        {t('Follow the')}{' '}
        <Link target="_blank" href="https://inspektor-gadget.io/docs/latest/quick-start">
          {t('installation guide')}
        </Link>{' '}
        {t('to install Inspektor Gadget on your cluster')}
      </p>
    </Box>
  );
}
