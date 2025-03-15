import { IconButton, Tooltip, Modal, Typography, Paper, Box } from '@mui/material';
import { Icon } from '@iconify/react';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';
import React from 'react';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';

export function GadgetCreation({ resource, open, setOpen }) {
  const [gadgets, setGadgets] = React.useState([]);
  React.useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data]));
  }, []);
  const [embedDialogOpen, setEmbedDialogOpen] = React.useState(false);
  const [selectedGadget, setSelectedGadget] = React.useState(null);
  return (
    <>
      <Modal 
                open={open} 
                onClose={() => setOpen(false)}
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
                    <IconButton onClick={() => setOpen(false)} size="small">
                      <Icon icon="mdi:close" />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                    <GadgetGrid
                     resource={resource}
                      gadgets={gadgets} 
                      enableEmbed={false} 
                      onViewSelect={() => {
                        // setOpen(true);
                      }}
                      onEmbedClick={(gadget) => {
                        setSelectedGadget(gadget);
                        setEmbedDialogOpen(true);
                      }}
                      callbackRunGadget={() => {}}
                    />
                    {embedDialogOpen && <GadgetCardEmbedWrapper gadget={selectedGadget} embedDialogOpen={embedDialogOpen} onClose={() => setEmbedDialogOpen(false)} resource={resource}/>}
  
                  </Box>
                </Paper>
              </Modal>
    </>
  );
}
