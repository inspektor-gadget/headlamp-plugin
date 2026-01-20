import { Icon, InlineIcon } from '@iconify/react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { GadgetContext } from '../GadgetContext';

export function GadgetDescription({
  setEmbedView,
  embedView,
  enableHistoricalData,
  setEnableHistoricalData,
  update,
}) {
  const { t } = useTranslation();
  const { imageName, id } = useParams<{ imageName: string; id: string }>();
  const [gadgetInstance, setGadgetInstance] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { gadgetRunningStatus } = useContext(GadgetContext);

  useEffect(() => {
    findGadgetInstance();
    checkGadgetStatus();
  }, [id, update]);

  function findGadgetInstance() {
    const allInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    const instance = allInstances.find(instance => instance.id === id);
    if (instance) {
      setGadgetInstance(instance);
      setEditedName(instance.name); // Initialize with current name
      setEmbedView(instance.kind || 'None');
    }
  }

  const checkGadgetStatus = () => {
    if (!id) return;

    const allInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    const instance = allInstances.find(instance => instance.id === id);
    if (instance) {
      // this would happen when you come to details page for the first time
      setEnableHistoricalData(instance.isHeadless ?? true);
    }
  };

  const saveEditedName = () => {
    if (!id || !editedName.trim()) return;

    const allInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');

    const index = allInstances.findIndex(instance => instance.id === id);
    if (index !== -1) {
      allInstances[index].name = editedName;
      localStorage.setItem('headlamp_embeded_resources', JSON.stringify(allInstances));
      setGadgetInstance({ ...gadgetInstance, name: editedName });
      setIsEditingName(false);
    }
  };

  const cancelEditing = () => {
    setEditedName(gadgetInstance?.name || '');
    setIsEditingName(false);
  };

  if (!gadgetInstance) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">{t('Loading gadget details...')}</Typography>
      </Box>
    );
  }

  console.log('enableHistoricalData', enableHistoricalData);
  return (
    <Card elevation={2} sx={{ mx: 'auto', mt: 2, mb: 2 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            {isEditingName ? (
              <Box display="flex" alignItems="center">
                <TextField
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                  size="small"
                  variant="outlined"
                  fullWidth
                  placeholder={t('Enter gadget name')}
                  sx={{ mr: 1 }}
                />
                <IconButton onClick={saveEditedName} color="primary" size="small">
                  <Icon icon="mdi:check" />
                </IconButton>
                <IconButton onClick={cancelEditing} color="error" size="small">
                  <Icon icon="mdi:close" />
                </IconButton>
              </Box>
            ) : (
              <Box display="flex" alignItems="center">
                <Typography variant="h6" sx={{ mr: 1 }}>
                  {gadgetInstance.name}
                </Typography>
                <Tooltip title={t('Edit name')}>
                  <IconButton onClick={() => setIsEditingName(true)} size="small">
                    <Icon icon="mdi:pencil" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        }
      />

      <Divider />

      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2 }} style={{ height: '150px' }}>
              <InlineIcon icon="mdi:information-outline" style={{ marginRight: 8 }} />
              <Typography
                variant="subtitle1"
                color="textSecondary"
                gutterBottom
                sx={{ display: 'inline' }}
              >
                {t('Details')}
              </Typography>

              <Box sx={{ mb: 2, ml: 2 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <strong>{t('Image')}:</strong>
                  <Box component="span" sx={{ ml: 1 }}>
                    {imageName}
                  </Box>
                </Typography>

                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <strong>{t('ID')}:</strong>
                  <Box component="span" sx={{ ml: 1 }}>
                    {id}
                  </Box>
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2 }} style={{ height: '150px' }}>
              <InlineIcon icon="mdi:cog-outline" style={{ marginRight: 8 }} />
              <Typography
                variant="subtitle1"
                color="textSecondary"
                gutterBottom
                sx={{ display: 'inline' }}
              >
                {t('Configuration')}
              </Typography>

              <Box sx={{ mb: 1 }}>
                <Box sx={{ width: 'fit-content' }}>
                  <FormControlLabel
                    labelPlacement="start"
                    control={
                      <Select
                        labelId="embed-type-label"
                        value={embedView}
                        label={t('Embed Type')}
                        onChange={e => {
                          setEmbedView(e.target.value);
                          const allInstances = JSON.parse(
                            localStorage.getItem('headlamp_embeded_resources') || '[]'
                          );
                          const index = allInstances.findIndex(instance => instance.id === id);
                          if (index !== -1) {
                            if (e.target.value !== 'None') {
                              allInstances[index].isEmbedded = true;
                            } else {
                              allInstances[index].isEmbedded = false;
                            }
                            allInstances[index].kind = e.target.value;
                            localStorage.setItem(
                              'headlamp_embeded_resources',
                              JSON.stringify(allInstances)
                            );
                            setGadgetInstance({ ...gadgetInstance, kind: e.target.value });
                          }
                        }}
                      >
                        <MenuItem value="None">{t('None')}</MenuItem>
                        <MenuItem value="Pod">{t('Pod')}</MenuItem>
                        <MenuItem value="Node">{t('Node')}</MenuItem>
                      </Select>
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        <Tooltip title={t('Adds this gadget to details view of a Pod or Node, allowing to see the gadget\'s data in context.')}>
                          <Icon icon="mdi:cube-outline" style={{ marginRight: 4 }} />
                        </Tooltip>
                        <Typography variant="body2">{t('Embed')}</Typography>
                      </Box>
                    }
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={!enableHistoricalData}
                      onChange={e => setEnableHistoricalData(!e.target.checked)}
                      color="primary"
                      disabled={gadgetRunningStatus}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Tooltip title={t('When activated, the gadget will only run when requested and while the page is open.')}>
                        <Icon icon="mdi:lightning-bolt-circle" style={{ marginRight: 4 }} />
                      </Tooltip>
                      <Typography variant="body2">{t('Run on demand')}</Typography>
                    </Box>
                  }
                  labelPlacement="start"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
