import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Icon } from '@iconify/react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Paper,
  Chip,
  Grid,
  Tooltip,
} from '@mui/material';

export function GadgetDescription({
  setEmbedView,
  embedView,
  enableHistoricalData,
  setEnableHistoricalData,
  update,
}) {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const { imageName, id } = useParams<{ imageName: string; id: string }>();
  const [gadgetInstance, setGadgetInstance] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

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
      setIsEmbedded(instance.isEmbedded);
      setEnableHistoricalData(!!instance.isHeadless);
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
        <Typography variant="body1">Loading gadget details...</Typography>
      </Box>
    );
  }

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
                  autoFocus
                  placeholder="Enter gadget name"
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
                <Tooltip title="Edit name">
                  <IconButton onClick={() => setIsEditingName(true)} size="small">
                    <Icon icon="mdi:pencil" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        }
        action={
          <Chip
            label={isEmbedded ? 'Embedded Resource' : 'Non-Embedded Resource'}
            color={isEmbedded ? 'success' : 'warning'}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
            icon={<Icon icon={isEmbedded ? 'mdi:link-variant' : 'mdi:play-circle'} />}
          />
        }
      />

      <Divider />

      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }} style={{ height: '150px' }}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <Icon icon="mdi:information-outline" style={{ marginRight: 8 }} />
                Details
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <strong>Image:</strong>
                  <Box component="span" sx={{ ml: 1 }}>
                    {imageName}
                  </Box>
                </Typography>

                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <strong>ID:</strong>
                  <Box component="span" sx={{ ml: 1 }}>
                    {id}
                  </Box>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }} style={{ height: '150px' }}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <Icon icon="mdi:cog-outline" style={{ marginRight: 8 }} />
                Configuration
              </Typography>

              <Box sx={{ mb: 1 }}>
                {isEmbedded ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      <strong>Type:</strong>
                    </Typography>
                    <Chip
                      label={gadgetInstance.kind || 'None'}
                      size="small"
                      color="primary"
                      icon={<Icon icon="mdi:cube-outline" />}
                    />
                  </Box>
                ) : (
                  <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="embed-type-label">Embed Type</InputLabel>
                    <Select
                      labelId="embed-type-label"
                      value={embedView}
                      label="Embed Type"
                      onChange={e => setEmbedView(e.target.value)}
                      startAdornment={<Icon icon="mdi:cube-outline" style={{ marginRight: 8 }} />}
                    >
                      <MenuItem value="None">None</MenuItem>
                      <MenuItem value="Pod">Pod</MenuItem>
                      <MenuItem value="Node">Node</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={enableHistoricalData}
                      onChange={e => setEnableHistoricalData(e.target.checked)}
                      color="primary"
                      disabled={gadgetInstance?.isHeadless}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Icon icon="mdi:history" style={{ marginRight: 4 }} />
                      <Typography variant="body2">
                        <strong>Historical Data</strong>
                        {gadgetInstance?.isHeadless && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            (Locked by headless mode)
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
