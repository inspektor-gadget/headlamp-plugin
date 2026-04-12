import './wasm.js';
import { Icon } from '@iconify/react';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Button, IconButton, Link, Modal, Paper, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { BackgroundRunning } from './backgroundgadgets';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';
import GadgetInput from './gadgetInput';

function GadgetRendererWithTabs() {
  const gadgetState = useGadgetState();
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [gadgets, setGadgets] = useState([]);
  const [selectedGadget, setSelectedGadget] = useState(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data])); // Wrap single item in array if needed
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { dynamicTabs, activeTabIndex, setActiveTabIndex } = gadgetState;

  // Ensure we default to the "Running Instances" tab (index 0) when there are no dynamic tabs
  useEffect(() => {
    if (dynamicTabs.length === 0 && activeTabIndex > 0) {
      setActiveTabIndex(0);
    }
  }, [dynamicTabs, activeTabIndex, setActiveTabIndex]);

  // Filter gadgets based on search query
  const filteredGadgets = gadgets.filter(gadget => {
    if (!debouncedQuery) return true;
    const query = debouncedQuery.toLowerCase();

    return (
      gadget.display_name?.toLowerCase().includes(query) ||
      gadget.description?.toLowerCase().includes(query)
    );
  });

  return (
    <GadgetContext.Provider value={{ ...gadgetState }}>
      <SectionBox title="Gadgets (beta)">
        <Box sx={{ width: '100%', typography: 'body1', my: 2 }}>
          <Box>
            <Box sx={{ mb: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '1rem' }}>
                Enter a gadget image URL or discover gadgets from ArtifactHub
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  color="secondary"
                  variant="contained"
                  size="medium"
                  sx={{ marginTop: '1rem' }}
                  startIcon={<Icon icon="mdi:apps" />}
                  onClick={() => setOpenConfirmDialog(true)}
                >
                  Discover
                </Button>

                <Box sx={{ flexGrow: 1 }}>
                  <GadgetInput resource={''} onAddGadget={() => {}} />
                </Box>
              </Box>
            </Box>
            <Modal open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    mb: 1,
                    gap: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Gadget Gallery
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search gadgets..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    sx={{ width: '300px' }}
                    InputProps={{
                      startAdornment: <Icon icon="mdi:magnify" style={{ marginRight: 8 }} />,
                    }}
                  />
                  <IconButton onClick={() => setOpenConfirmDialog(false)} size="small">
                    <Icon icon="mdi:close" />
                  </IconButton>
                </Box>

                <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                  <GadgetGrid
                    gadgets={filteredGadgets}
                    onEmbedClick={row => {
                      setSelectedGadget(row);
                      setEmbedDialogOpen(true);
                    }}
                  />
                  {embedDialogOpen && (
                    <GadgetCardEmbedWrapper
                      gadget={selectedGadget}
                      embedDialogOpen={embedDialogOpen}
                      onClose={() => setEmbedDialogOpen(false)}
                    />
                  )}
                </Box>
              </Paper>
            </Modal>
            <BackgroundRunning embedDialogOpen={embedDialogOpen} />
          </Box>
        </Box>
        <Box textAlign="right">
          <Link href="https://inspektor-gadget.io/" target="_blank">
            Powered by Inspektor Gadget
          </Link>
        </Box>
      </SectionBox>
    </GadgetContext.Provider>
  );
}

export default function Gadget() {
  return <GadgetRendererWithTabs />;
}
