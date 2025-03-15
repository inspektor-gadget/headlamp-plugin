import { Icon } from '@iconify/react';
import { ConfirmDialog } from '@kinvolk/headlamp-plugin/lib/components/common';
import { useSnackbar } from 'notistack';
import { getCluster, getClusterPrefixedPath } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, IconButton, Button, Tooltip, Typography, Checkbox, FormControlLabel, TextField, Radio, RadioGroup, FormControl, Dialog, DialogTitle, DialogContent, FormLabel, DialogActions } from '@mui/material';
import { useContext, useState, useEffect } from 'react';
import { generatePath, useHistory, useParams } from 'react-router';
import { GadgetContext } from '../GadgetContext';

export function GadgetDescription({ onInstanceDelete, ig }) {
  const {filters} = useContext(GadgetContext);
  console.log('filters are', filters);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [enableHistoricalData, setEnableHistoricalData] = useState(false);
  const { imageName, id } = useParams<{imageName: string, id: string}>();
  const history = useHistory();
  const cluster = getCluster();
  const [gadgetInstance, setGadgetInstance] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedView, setEmbedView] = useState("Pod");
  const [historicalData, setHistoricalData] = useState(false);
  const { enqueueSnackbar } = useSnackbar();


  function findGadgetInstance() {
    const runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');
    const embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    const allInstances = [...runningInstances, ...embeddedResources];
    const instance = allInstances.find(instance => instance.id === id);
    if (instance) {
      setGadgetInstance(instance);
      setEditedName(instance.name); // Initialize with current name
    }
  }

  useEffect(() => {
    findGadgetInstance();
    checkGadgetStatus();
  }, [id]);

  const checkGadgetStatus = () => {
    if (!id) return;
  
    const embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    const embeddedInstance = embeddedResources.find(instance => instance.id === id);
    if (embeddedInstance) {
      setIsEmbedded(true);
      setEnableHistoricalData(!!embeddedInstance.isHeadless);
      return;
    }
  
    const runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');
    const runningInstance = runningInstances.find(instance => instance.id === id);
    if (runningInstance) {
      setIsEmbedded(false);
      setEnableHistoricalData(!!runningInstance.isHeadless);}
  };

  const saveEditedName = () => {
    if (!id) return;
  
    let embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    let runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');
    
    let updated = false;

    const updateName = (instances) => {
      const index = instances.findIndex(instance => instance.id === id);
      if (index !== -1) {
        instances[index].name = editedName;
        updated = true;
      }
    };

    if (isEmbedded) {
      updateName(embeddedResources);
      if (updated) localStorage.setItem('headlamp_embeded_resources', JSON.stringify(embeddedResources));
    } else {
      updateName(runningInstances);
      if (updated) localStorage.setItem('headlamp_gadget_foreground_running_instances', JSON.stringify(runningInstances));
    }

    setGadgetInstance({ ...gadgetInstance, name: editedName });
    setIsEditingName(false);
  };

  const cancelEditing = () => {
    setEditedName(gadgetInstance?.name || "");
    setIsEditingName(false);
  };


  const handleEmbed = () => {
    if(!gadgetInstance) return;
    // check if enableHistoricalData is true
    console.log('enableHistoricalData', enableHistoricalData);
    if(historicalData) {
      ig.createGadgetInstance({
        name: gadgetInstance.name,
        tags: gadgetInstance.tags,
        nodes: gadgetInstance.nodes,
        gadgetConfig: {
          imageName: gadgetInstance.gadgetConfig.imageName,
          version: 1,
          paramValues: {
            ...filters
          }
        }
      }, (success) => {
        
        const updatedInstance = { ...gadgetInstance, id: success.gadgetInstance.id, isHeadless: true, kind: embedView };
        // update the gadgetConfig paramValues as well
        updatedInstance.gadgetConfig.paramValues = { ...filters };
        let embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
        embeddedResources = embeddedResources.filter(instance => instance.id !== gadgetInstance.id);
        embeddedResources.push(updatedInstance);
        localStorage.setItem('headlamp_embeded_resources', JSON.stringify(embeddedResources));
        // also remove from running instances
        let runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');
        runningInstances = runningInstances.filter(instance => instance.id !== gadgetInstance.id);
        localStorage.setItem('headlamp_gadget_foreground_running_instances', JSON.stringify(runningInstances));
        setEmbedModalOpen(false);
        checkGadgetStatus();
        history.replace(
          `${generatePath(getClusterPrefixedPath(), { cluster: cluster })}/gadgets/${gadgetInstance.gadgetConfig.imageName}/${success.gadgetInstance.id}`
        );
      }, (error) => {
        console.error('Error creating gadget instance:', error);
        // Handle error case
        setEmbedModalOpen(false);
        // Optionally show a notification or alert to the user      
        enqueueSnackbar('Failed to Enable Historical Data', { variant: 'error' });
      });
    }
    let embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    
    const updatedInstance = { ...gadgetInstance, kind: embedView};
    embeddedResources = embeddedResources.filter(instance => instance.id !== gadgetInstance.id);
    embeddedResources.push(updatedInstance);
    // also remove from running instances
    let runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');
    runningInstances = runningInstances.filter(instance => instance.id !== gadgetInstance.id);
    localStorage.setItem('headlamp_gadget_foreground_running_instances', JSON.stringify(runningInstances));
    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(embeddedResources));
    setEmbedModalOpen(false);
    checkGadgetStatus();
  };
  return (
    <>
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Instance"
        description="Are you sure you want to delete this gadget instance?"
        onConfirm={() => {
          if (!id) return;

          let embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
          let runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');

          embeddedResources = embeddedResources.filter(instance => instance.id !== id);
          runningInstances = runningInstances.filter(instance => instance.id !== id);

          localStorage.setItem('headlamp_embeded_resources', JSON.stringify(embeddedResources));
          localStorage.setItem('headlamp_gadget_foreground_running_instances', JSON.stringify(runningInstances));

          if (id && ig) {
            ig.deleteGadgetInstance(id, () => {
              history.replace(
                `${generatePath(getClusterPrefixedPath(), { cluster: cluster })}/gadgets/`
              );
              if (onInstanceDelete) {
                onInstanceDelete();
              }
            });
          }
          setDeleteDialog(false);
        }}
        handleClose={() => setDeleteDialog(false)}
      />
       <Dialog open={embedModalOpen} onClose={() => setEmbedModalOpen(false)}>
        <DialogTitle>Embed Gadget</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">Which view do you want to embed to?</FormLabel>
            <RadioGroup value={embedView} onChange={(e) => setEmbedView(e.target.value)}>
              <FormControlLabel value="Pod" control={<Radio />} label="Pod" />
              <FormControlLabel value="Node" control={<Radio />} label="Node" />
            </RadioGroup>
          </FormControl>
          {!gadgetInstance?.isHeadless && (
            <FormControlLabel
              control={<Checkbox checked={historicalData} onChange={(e) => setHistoricalData(e.target.checked)} />}
              label="Enable historical data for this gadget"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmbedModalOpen(false)}>Close</Button>
          <Button onClick={handleEmbed} color="primary">Done</Button>
        </DialogActions>
      </Dialog>
      <Box display="flex" flexDirection="column" width="100%">
        {/* Name Section */}
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" p={2}>
          <Box display="flex" alignItems="center">
            {isEditingName ? (
              <TextField
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                size="small"
                variant="outlined"
              />
            ) : (
              <Typography variant="h5">{gadgetInstance?.name}</Typography>
            )}
            <IconButton 
              onClick={isEditingName ? saveEditedName : () => setIsEditingName(true)}
              color="primary"
              sx={{ ml: 1 }}
            >
              <Icon icon={isEditingName ? "mdi:check" : "mdi:pencil"} />
            </IconButton>
            {isEditingName && (
              <IconButton onClick={cancelEditing} color="error">
                <Icon icon="mdi:close" />
              </IconButton>
            )}
          </Box>
          {/* <IconButton color="error" onClick={() => setDeleteDialog(true)}>
            <Icon icon="mdi:delete" />
          </IconButton> */}
        </Box>

        {/* Additional Details */}
        <Box p={2} borderTop={1} borderColor="grey.300">
          <Typography variant="body2"><strong>Image:</strong> {imageName}</Typography>
          <Typography variant="body2"><strong>Status:</strong> {isEmbedded ? "Embedded Resource" : "Running Instance"}</Typography>
          <Typography variant="body2"><strong>
            Historical Data:</strong> {enableHistoricalData ? "Enabled" : "Disabled"}
          </Typography>
        </Box>
        
        {/* Action Buttons */}
        <Box display="flex" alignItems="center" p={2}>
          <Tooltip title={isEmbedded ? "Remove from embedded resources" : "Add to embedded resources"}>
            <Button 
              variant="outlined" 
              color={isEmbedded ? "secondary" : "primary"}
              onClick={() => {
                if(!isEmbedded) {
                  setEmbedModalOpen(true);
                  return;
                }
               
                let embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
                let runningInstances = JSON.parse(localStorage.getItem('headlamp_gadget_foreground_running_instances') || '[]');

                if (isEmbedded) {
                  embeddedResources = embeddedResources.filter(instance => instance.id !== id);
                  runningInstances.push(gadgetInstance);
                  setIsEmbedded(false);
                } 

                localStorage.setItem('headlamp_embeded_resources', JSON.stringify(embeddedResources));
                localStorage.setItem('headlamp_gadget_foreground_running_instances', JSON.stringify(runningInstances));
              }}
            >
              {isEmbedded ? "Remove from Embedded" : "Add to Embedded"}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </>
  );
}
