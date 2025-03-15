import './wasm.js';
import { Icon } from '@iconify/react';
import { ActionButton, Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box, IconButton, Tab, Tabs, Modal, Paper, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { BackgroundRunning } from './backgroundgadgets';
import {  useGadgetConn } from './conn';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';

function GadgetRendererWithTabs() {
  let { version, instance, imageName } = useParams<{
    version: string;
    instance: string;
    imageName: string;
  }>();
  imageName = decodeURIComponent(imageName);
  const gadgetState = useGadgetState();
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [gadgets, setGadgets] = useState([]);
  const [selectedGadget, setSelectedGadget] = useState(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);

  useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data])); // Wrap single item in array if needed
  }, []);

  const { dynamicTabs, activeTabIndex, setActiveTabIndex, addDynamicTab, removeDynamicTab } =
    gadgetState;
    
  // Ensure we default to the "Running Instances" tab (index 0) when there are no dynamic tabs
  useEffect(() => {
    if (dynamicTabs.length === 0 && activeTabIndex > 0) {
      setActiveTabIndex(0);
    }
  }, [dynamicTabs, activeTabIndex, setActiveTabIndex]);

  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
    gadgetState.setIsGadgetInfoFetched(false);
    // reset gadget data on tab change
    gadgetState.setGadgetData({});
    gadgetState.setBufferedGadgetData({});
  };

  const handleRemoveTab = (index) => {
    removeDynamicTab(index);
    
    // If we're removing the currently active tab,
    // we need to set activeTabIndex to a valid tab
    if (activeTabIndex === index + 1) {
      // If there are tabs to the left, go there
      if (index > 0) {
        setActiveTabIndex(index);
      } else if (dynamicTabs.length > 1) {
        // If there are tabs to the right, go there
        setActiveTabIndex(1);
      } else {
        // Otherwise go to "Running Instances" tab
        setActiveTabIndex(0);
      }
    } else if (activeTabIndex > index + 1) {
      // If the removed tab is to the left of active tab,
      // we need to adjust the active index
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  console.log("dynamicTabs", dynamicTabs);
  return (
    <GadgetContext.Provider value={{ ...gadgetState }}>
      <SectionBox title={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
          <Typography variant="h5" sx={{ ml: 4 }}>
            Gadgets
          </Typography>
          </Box>
          <Box>
         
          <ActionButton
        color="primary"
        description={'Add Gadget'}
        icon={'mdi:plus-circle'}
        onClick={() => {
          setOpenConfirmDialog(true)
        }}
      />
          </Box>
        </Box>
      }>
        <Box sx={{ width: '100%', typography: 'body1' }}>
            <Box mt={2}>
              <Modal 
                open={openConfirmDialog} 
                onClose={() => setOpenConfirmDialog(false)}
              >
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '95%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    overflow: 'hidden', // Change to hidden to prevent double scrollbars
                    p: 3,  // Add padding for the content
                    borderRadius: 1, // Optional: add rounded corners
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      Add Gadget
                    </Typography>
                    <IconButton onClick={() => setOpenConfirmDialog(false)} size="small">
                      <Icon icon="mdi:close" />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                    <GadgetGrid 
                      gadgets={gadgets} 
                      enableEmbed={true} 
                      onViewSelect={() => {
                        // setOpen(true);
                      }}
                      callbackRunGadget={(row) => {
                        console.log("row", row);
                        // if this row.id exist in dynamicTabs, then setActiveTabIndex to that index
                        const index = dynamicTabs.findIndex(tab => tab.id === row.id);
                        if (index !== -1) {
                          setActiveTabIndex(index + 1);
                          return;
                        }
                        addDynamicTab(row);
                        setActiveTabIndex(dynamicTabs.length + 1);
                        setOpenConfirmDialog(false);
                      }}
                      onEmbedClick={(row) => {
                        setSelectedGadget(row);
                        setEmbedDialogOpen(true);
                      }}
                    />
                    {embedDialogOpen && <GadgetCardEmbedWrapper gadget={selectedGadget} embedDialogOpen={embedDialogOpen} onClose={() => setEmbedDialogOpen(false)} />}
  
                  </Box>
                </Paper>
              </Modal>
              <BackgroundRunning
                imageName={imageName}
                embedDialogOpen={embedDialogOpen}
                callback={row => {
                  // // if this row.id exist in dynamicTabs, then setActiveTabIndex to that index
                  // const index = dynamicTabs.findIndex(tab => tab.id === row.id);
                  // if (index !== -1) {
                  //   setActiveTabIndex(index + 1);
                  //   return;
                  // }
                  // addDynamicTab(row);
                  // setActiveTabIndex(dynamicTabs.length + 1);
                }}
                hideTitle
                callbackAddGadget={() => setOpenConfirmDialog(true)}
              />
            </Box>
         
        </Box>
      </SectionBox>
    </GadgetContext.Provider>
  );
}



export default function Gadget() {
  return <GadgetRendererWithTabs />;
}