import { Link, Loader, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import React from 'react';
import { useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { GadgetConnectionForBackgroundRunningProcess, isIGInstalled } from './conn';
import { DefaultGadgets } from './default_gadgets';

export default function GadgetList() {
  const [gadgets, setGadgets] = useState([]);
  const [open, setOpen] = React.useState(false);
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [gadgetConn, setGadgetConn] = useState(null);
  const isIGInstallationFound = isIGInstalled(pods);

  React.useEffect(() => {
    const gadgetsFromLocalStorage = localStorage.getItem('headlamp_ig_gadgets');
    const gadgetsArray = JSON.parse(gadgetsFromLocalStorage) || [];
    setGadgets(DefaultGadgets.concat(gadgetsArray));
  }, []);

  React.useEffect(() => {
    if (gadgetConn) {
      gadgetConn.listGadgetInstances(instances => {
        if (!instances) {
          return;
        }
        const instanceCountMap = instances.reduce((acc, instance) => {
          acc[instance.gadgetConfig.imageName] = (acc[instance.gadgetConfig.imageName] || 0) + 1;
          return acc;
        }, {});

        setGadgets(prevGadgets =>
          prevGadgets.map(gadget => ({
            ...gadget,
            instanceCount: instanceCountMap[gadget.name] || 0,
          }))
        );
      });
    }
  }, [gadgetConn]);

  function GadgetForm() {
    const [customGadgetConfig, setCustomGadgetConfig] = React.useState({});
    return (
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Gadget</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" width="20vw">
            <TextField
              required
              label="ImageName Or URL"
              variant="outlined"
              margin="normal"
              fullWidth
              onChange={e => {
                setCustomGadgetConfig({ ...customGadgetConfig, name: e.target.value });
              }}
            />
            <TextField
              label="Description"
              variant="outlined"
              margin="normal"
              fullWidth
              onChange={e => {
                setCustomGadgetConfig({ ...customGadgetConfig, description: e.target.value });
              }}
              required
            />
            <TextField
              required
              label="Origin"
              variant="outlined"
              margin="normal"
              fullWidth
              onChange={e => {
                setCustomGadgetConfig({ ...customGadgetConfig, origin: e.target.value });
              }}
            />
          </Box>
          {(!customGadgetConfig.name ||
            !customGadgetConfig.description ||
            !customGadgetConfig.origin) && (
            <Alert severity="error">Please Fill all the required fields</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={
              !customGadgetConfig.name ||
              !customGadgetConfig.description ||
              !customGadgetConfig.origin
            }
            onClick={() => {
              const gadgetsFromLocalStorage = localStorage.getItem('headlamp_ig_gadgets');
              const gadgetsArray = gadgetsFromLocalStorage
                ? JSON.parse(gadgetsFromLocalStorage)
                : [];
              customGadgetConfig.allowDelete = true;
              gadgetsArray.push(customGadgetConfig);
              localStorage.setItem('headlamp_ig_gadgets', JSON.stringify(gadgetsArray));
              setGadgets([...gadgets].concat(customGadgetConfig));
              setOpen(false);
            }}
          >
            Add
          </Button>
          <Button disabled={!customGadgetConfig.name}>
            {!customGadgetConfig.name ? (
              'Run'
            ) : (
              <Link
                routeName="/gadgets/:imageName"
                params={{
                  imageName: customGadgetConfig.name,
                }}
              >
                Run
              </Link>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (isIGInstallationFound === null) {
    return <Loader />;
  }

  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }
  return (
    <>
      {nodes && pods && (
        <GadgetConnectionForBackgroundRunningProcess
          nodes={nodes}
          pods={pods}
          callback={setGadgetConn}
          prepareGadgetInfo={null}
        />
      )}
      <GadgetForm />
      <SectionBox
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <h2>Gadgets </h2>
            <Box mr={2}>
              <Button
                onClick={() => {
                  setOpen(true);
                }}
                sx={theme => ({
                  color: theme.palette.clusterChooser.button.color,
                  background: theme.palette.clusterChooser.button.background,
                  '&:hover': {
                    background: theme.palette.clusterChooser.button.hover.background,
                  },
                  maxWidth: '20em',
                  textTransform: 'none',
                  padding: '6px 22px',
                })}
              >
                Add Gadget
              </Button>
            </Box>
          </Box>
        }
      >
        <Table
          columns={[
            {
              header: 'Name',
              accessorFn: gadget => (
                <Link
                  routeName="/gadgets/:imageName"
                  params={{
                    imageName: gadget.name,
                  }}
                  state={gadget}
                >
                  {gadget.name}
                </Link>
              ),
            },
            {
              header: 'Description',
              accessorFn: gadget => gadget.description,
            },
            {
              header: 'Origin',
              accessorFn: () => 'Inspektor-Gadget',
            },
            {
              header: 'Instances',
              accessorFn: gadget =>
                gadget.instanceCount > 0 ? (
                  <Link routeName={`/gadgets/background`} search={`image=${gadget.name}`}>
                    {gadget.instanceCount}
                  </Link>
                ) : (
                  0
                ),
            },
          ]}
          loading={gadgets === null}
          data={gadgets}
        />
      </SectionBox>
    </>
  );
}
