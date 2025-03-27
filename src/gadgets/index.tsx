import './wasm.js';
import { Icon } from '@iconify/react';
import { ActionButton, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link, Box, IconButton, Modal, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchInspektorGadgetFromArtifactHub } from '../api/artifacthub';
import { GadgetContext, useGadgetState } from '../common/GadgetContext';
import { BackgroundRunning } from './backgroundgadgets';
import { GadgetCardEmbedWrapper, GadgetGrid } from './gadgetGrid';

function GadgetRendererWithTabs() {
  const gadgetState = useGadgetState();
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [gadgets, setGadgets] = useState([]);
  const [selectedGadget, setSelectedGadget] = useState(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);

  useEffect(() => {
    fetchInspektorGadgetFromArtifactHub().then(data => setGadgets([...data])); // Wrap single item in array if needed
  }, []);

  const { dynamicTabs, activeTabIndex, setActiveTabIndex, addDynamicTab } = gadgetState;

  // Ensure we default to the "Running Instances" tab (index 0) when there are no dynamic tabs
  useEffect(() => {
    if (dynamicTabs.length === 0 && activeTabIndex > 0) {
      setActiveTabIndex(0);
    }
  }, [dynamicTabs, activeTabIndex, setActiveTabIndex]);

  return (
    <GadgetContext.Provider value={{ ...gadgetState }}>
      <SectionBox
        title="Gadgets (beta)"
        headerProps={{
          titleSideActions: [
            <ActionButton
              color="primary"
              description={'Add Gadget'}
              icon={'mdi:plus-circle'}
              onClick={() => {
                setOpenConfirmDialog(true);
              }}
            />
          ]}
        }
      >
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <Box mt={2}>
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
                  sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}
                >
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
                    onEmbedClick={row => {
                      setSelectedGadget(row);
                      setEmbedDialogOpen(true);
                    }}
                    onAddGadget={gadget => {
                      addDynamicTab(gadget);
                      setOpenConfirmDialog(false);
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
