import { Icon } from '@iconify/react';
import { Box, IconButton, Modal, Paper, Typography } from '@mui/material';
import React from 'react';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';
import GadgetInput from './gadgetInput';

export function GadgetCreation({ resource, open, setOpen }) {
  const [gadgets, setGadgets] = React.useState([]);
  React.useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data]));
  }, []);
  const [embedDialogOpen, setEmbedDialogOpen] = React.useState(false);
  const [selectedGadget, setSelectedGadget] = React.useState(null);
  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)}>
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
            p: 3, // Add padding for the content
            borderRadius: 1, // Optional: add rounded corners
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Gadget Gallery
            </Typography>
            <IconButton onClick={() => setOpen(false)} size="small">
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
            <Box sx={{ mb:8, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '1rem' }}>
                Enter a gadget image URL or discover gadgets from ArtifactHub
              </Typography>
              <GadgetInput resource={''} onAddGadget={() => {}} />
            </Box>
          <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
            <GadgetGrid
              resource={resource}
              gadgets={gadgets}
              onEmbedClick={gadget => {
                setSelectedGadget(gadget);
                setEmbedDialogOpen(true);
              }}
            />
            {embedDialogOpen && (
              <GadgetCardEmbedWrapper
                gadget={selectedGadget}
                embedDialogOpen={embedDialogOpen}
                onClose={() => setEmbedDialogOpen(false)}
                resource={resource}
              />
            )}
          </Box>
        </Paper>
      </Modal>
    </>
  );
}
