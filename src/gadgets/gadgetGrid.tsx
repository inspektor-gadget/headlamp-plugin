import { Icon } from '@iconify/react';
import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { getCluster, getClusterPrefixedPath } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  MenuItem,
  Modal,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { generatePath, useHistory } from 'react-router-dom';
import { GadgetBackgroundInstanceForm } from '../common/gadgetbackgroundinstanceform';
import { generateRandomString } from '../common/helpers';
import { useGadgetConn } from './conn';
import GadgetFilters from './gadgetFilters';

// ... (keep existing imports)

const KUBERNETES_VIEWS = [
  { value: 'Pod', label: 'Pod' },
  { value: 'Node', label: 'Node' },
];

export function GadgetCardEmbedWrapper({ gadget, embedDialogOpen, onClose, resource = null }) {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const ig = useGadgetConn(nodes, pods);
  const [open, setOpen] = useState(embedDialogOpen);
  const [gadgetInfo, setGadgetInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOpen(embedDialogOpen);
  }, [embedDialogOpen]);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (ig) {
      ig.getGadgetInfo(
        {
          imageName: gadget.display_name?.split(' ').join('_'),
          version: 1,
        },
        info => {
          setGadgetInfo(info);
          setError(null);
        },
        error => setError(error)
      );
    }
  }, [ig, gadget.display_name]);

  if (error) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: { xs: '100%', sm: '450px', md: '800px' },
          bgcolor: 'background.paper',
          boxShadow: 3,
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton onClick={handleClose} size="small">
            <Icon icon="mdi:close" />
          </IconButton>
        </Box>
        <Box
          sx={{
            p: 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Typography variant="h6" color="error">
            Error fetching gadget info {error}
          </Typography>
        </Box>
      </Box>
    );
  }
  // Render a loading drawer if data isn't ready yet
  if (!ig && open && !gadgetInfo) {
    return (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton onClick={handleClose} size="small">
            <Icon icon="mdi:close" />
          </IconButton>
        </Box>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100%',
            width: { xs: '100%', sm: '450px', md: '800px' },
            bgcolor: 'background.paper',
            boxShadow: 3,
            zIndex: 1300,
            transition: 'transform 0.3s ease-in-out',
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 3,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Loader />
          </Box>
        </Box>
      </>
    );
  }

  if (!open || !ig) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <Box
        onClick={handleClose}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1290,
        }}
      />

      {/* Drawer */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: { xs: '100%', sm: '450px', md: '800px' },
          bgcolor: 'background.paper',
          boxShadow: 3,
          zIndex: 1300,
          transition: 'transform 0.3s ease-in-out',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          display: 'flex',
          flexDirection: 'column',
          // overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">Configure Gadget</Typography>
          <IconButton onClick={handleClose} size="small">
            <Icon icon="mdi:close" />
          </IconButton>
        </Box>

        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {gadgetInfo ? (
            <GadgetCreationStepper
              ig={ig}
              imageName={gadget?.display_name.split(' ').join('_')}
              enableEmbed
              gadgetInfo={gadgetInfo}
              resource={resource}
            />
          ) : (
            <Loader />
          )}
        </Box>
      </Box>
    </>
  );
}

const GadgetCard = ({ gadget, onEmbedClick, resource = null }) => {
  const history = useHistory();
  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="h6" component="h2">
              {/* <RouterLink
              routeName="/gadgets/:imageName"
              params={{ imageName: gadget.display_name.split(' ').join('_') }}
            > */}
              {gadget.display_name}
              {/* </RouterLink> */}
            </Typography>
            {gadget.stars > 0 && (
              <Box display="flex" alignItems="center" gap={1}>
                <Icon icon="mdi:star" style={{ color: 'gold' }} />
                <Typography variant="body2">{gadget.stars}</Typography>
              </Box>
            )}
          </Box>

          <Box flexGrow={1}>
            <Typography variant="body2" color="text.secondary">
              {gadget.description}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 2 }}>
            {gadget.official && (
              <Chip icon={<Icon icon="mdi:verified" />} label="Official" size="small" />
            )}
            {gadget.signed && (
              <Chip icon={<Icon icon="mdi:file-sign" />} label="Signed" size="small" />
            )}
            {gadget.cncf && <Chip label="CNCF" size="small" />}
            <Chip label={`v${gadget.version}`} size="small" variant="outlined" />
          </Stack>

          <Box mt="auto">
            <Box display="flex" justifyContent="justify-center" alignItems="center" gap={2}>
              {!resource ? (
                <>
                  <Button
                    onClick={() => {
                      const runningInstances = JSON.parse(
                        localStorage.getItem('headlamp_embeded_resources') || '[]'
                      );
                      const row = {
                        id:
                          gadget.display_name?.split(' ').join('_') +
                          '-custom-' +
                          generateRandomString(),
                        isHeadless: undefined,
                        isEmbedded: false,
                        name:
                          gadget.display_name?.split(' ').join('_') +
                          '-custom-' +
                          generateRandomString(),
                        gadgetConfig: {
                          imageName: gadget.display_name?.split(' ').join('_'),
                          version: 1,
                          paramValues: {},
                        },
                        description: gadget.description,
                        cluster: getCluster(),
                      };
                      runningInstances.push(row);
                      localStorage.setItem(
                        'headlamp_embeded_resources',
                        JSON.stringify(runningInstances)
                      );
                      history.push({
                        pathname: generatePath(
                          getClusterPrefixedPath(
                            `/gadgets/${gadget.display_name?.split(' ').join('_')}/${row.id}`
                          ),
                          { cluster: getCluster() as string }
                        ),
                      });
                    }}
                    variant="contained"
                    size="small"
                    startIcon={<Icon icon="mdi:plus" />}
                  >
                    Add
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    // if we a resource called this then we know that this is meant to be embedded
                    if (resource) {
                      onEmbedClick(gadget);
                      return;
                    }
                  }}
                  variant="contained"
                  size="small"
                  startIcon={<Icon icon="mdi:plus" />}
                >
                  Add
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </>
  );
};

const StepContent = ({ activeStep, setActiveStep, resource, gadgetInfo, imageName }) => {
  const [currentView, setCurrentView] = useState('');
  const [filters, setFilters] = useState({});
  const commonProps = {
    config: gadgetInfo,
    namespace: resource?.jsonData?.metadata?.namespace,
    pod: resource?.jsonData?.metadata?.name,
  };
  switch (activeStep) {
    case 0:
      return !resource ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select View to Embed Gadget
          </Typography>
          <FormControl fullWidth sx={{ mt: 3, mb: 4 }}>
            <InputLabel>Kubernetes Resource View</InputLabel>
            <Select
              value={currentView}
              onChange={e => setCurrentView(e.target.value)}
              label="Kubernetes Resource View"
            >
              {KUBERNETES_VIEWS.map(view => (
                <MenuItem key={view.value} value={view.value}>
                  {view.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box display="flex" justifyContent="flex-end">
            <Button
              onClick={() => setActiveStep(1)}
              variant="contained"
              color="primary"
              disabled={!currentView}
            >
              Continue
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <GadgetFilters
            filters={filters}
            setFilters={setFilters}
            {...commonProps}
            onApplyFilters={() => setActiveStep(2)}
          />
          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button onClick={() => setActiveStep(1)} variant="contained" color="primary">
              Continue
            </Button>
          </Box>
        </Box>
      );

    case 1:
      return !resource ? (
        <Box sx={{ p: 3 }}>
          <GadgetFilters
            {...commonProps}
            onApplyFilters={() => setActiveStep(2)}
            filters={filters}
            setFilters={setFilters}
          />
          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button onClick={() => setActiveStep(2)} variant="contained" color="primary">
              Continue
            </Button>
          </Box>
        </Box>
      ) : (
        <GadgetBackgroundInstanceForm
          {...commonProps}
          nodesSelected={resource ? [resource.jsonData.spec.nodeName] : []}
          open
          onClose={() => setActiveStep(0)}
          onGadgetInstanceCreation={() => setActiveStep(0)}
          image={imageName}
          showNodesSelector={false}
          selectedView={currentView}
          filters={filters}
          resource={resource}
        />
      );

    case 2:
      return (
        !resource && (
          <GadgetBackgroundInstanceForm
            {...commonProps}
            nodesSelected={resource ? [resource.jsonData.spec.nodeName] : []}
            open
            onClose={() => setActiveStep(0)}
            onGadgetInstanceCreation={() => setActiveStep(0)}
            image={imageName}
            showNodesSelector={false}
            selectedView={currentView}
            filters={filters}
            resource={resource}
          />
        )
      );

    default:
      return null;
  }
};

const GadgetCreationStepper = ({ resource = null, gadgetInfo, imageName, enableEmbed = false }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = enableEmbed
    ? ['Configure View', 'Configure Filters', 'Setup Background Instance']
    : ['Configure Filters', 'Setup Background Instance'];

  return (
    <Box sx={{ width: '100%', p: 4 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <StepContent
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        resource={resource}
        gadgetInfo={gadgetInfo}
        imageName={imageName}
      />
    </Box>
  );
};

// Update CreateGadgetInstance to pass enableEmbed
function CreateGadgetInstance({ gadgetInfo, resource, imageName, enableEmbed = false }) {
  return (
    <GadgetCreationStepper
      resource={resource}
      gadgetInfo={gadgetInfo}
      imageName={imageName}
      enableEmbed={enableEmbed}
    />
  );
}

function GadgetInput({ resource, onAddGadget }) {
  const [imageURL, setImageURL] = useState('');
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const handleRun = () => {
    const row: {
      id: string;
      isHeadless: boolean;
      gadgetConfig: {
        imageName: string;
        version: number;
        paramValues: object;
      };
      name: string;
      cluster: string;
      isEmbedded: boolean;
      kind?: string;
    } = {
      id: imageURL + '-custom-' + generateRandomString(),
      isHeadless: undefined,
      gadgetConfig: {
        imageName: imageURL,
        version: 1,
        paramValues: {},
      },
      name: imageURL + '-custom-' + generateRandomString(),
      cluster: getCluster(),
      isEmbedded: !!resource,
    };
    if (resource) {
      row.kind = resource.jsonData.kind;
    }
    const instances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
    instances.push(row);
    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(instances));
    if (resource) {
      onAddGadget(row);
      enqueueSnackbar(`Added gadget ${imageURL}`, {
        variant: 'success',
      });
      setImageURL('');
    }
    if (!resource) {
      history.push({
        pathname: `/c/${getCluster()}/gadgets/${imageURL}/${row.id}`,
      });
    }
  };

  return (
    <Box mt={2} display="flex" alignItems="center">
      <TextField
        label="Gadget Image URL"
        variant="outlined"
        size="small"
        fullWidth
        value={imageURL}
        onChange={e => setImageURL(e.target.value)}
      />
      <Box ml={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={() => handleRun()}
          sx={{ ml: 2 }}
          disabled={!imageURL}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
}

const GadgetGrid = ({
  gadgets,
  onEmbedClick,
  resource = null,
  onAddGadget = gadget => {
    console.log('Gadget added:', gadget);
  },
}) => {
  if (gadgets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        {!resource && <GadgetInput resource={resource} onAddGadget={() => {}} />}
        <Typography variant="h5" color="textSecondary">
          No gadgets available
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <GadgetInput resource={resource} onAddGadget={onAddGadget} />
      </Grid>
      {gadgets.map(gadget => (
        <Grid item xs={12} sm={6} md={4} key={gadget.package_id}>
          <GadgetCard gadget={gadget} onEmbedClick={onEmbedClick} resource={resource} />
        </Grid>
      ))}
    </Grid>
  );
};

const RunGadgetPanel = ({ gadget, resource }) => {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [nodes] = K8s.ResourceClasses.Node.useList();
  if (!gadget) return null;

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        Run {gadget.display_name}
      </Typography>
      <Typography variant="body2" paragraph>
        {gadget.description}
      </Typography>

      {/* Add your run interface here */}
      <Box sx={{ mt: 3 }}>
        {nodes && pods && <Gadget gadget={gadget} nodes={nodes} pods={pods} resource={resource} />}
        {/* Add configuration options */}
      </Box>
    </Box>
  );
};

function Gadget({ gadget, nodes, pods, resource }) {
  const ig = useGadgetConn(nodes, pods);
  const [gadgetInfo, setGadgetInfo] = useState(null);
  const imageName = gadget.gadgetConfig.imageName;
  const [error, setError] = useState(null);
  useEffect(() => {
    if (ig) {
      ig.getGadgetInfo(
        { version: 1, imageName },
        info => {
          setGadgetInfo(info);
          setError(null);
        },
        err => {
          console.error(err);
          setError(err);
        }
      );
    }
    return () => {
      setError(null);
    };
  }, [ig]);
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Error fetching gadget info: {error.message}
        </Typography>
      </Box>
    );
  }
  return (
    gadgetInfo &&
    ig && (
      <CreateGadgetInstance
        gadgetInfo={gadgetInfo}
        resource={resource}
        ig={ig}
        imageName={imageName}
      />
    )
  );
}

const ModalGadgetList = ({ open, onClose, gadgets, resource }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedGadget, setSelectedGadget] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setSelectedGadget(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="modal-gadget-list">
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" px={2}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ flexGrow: 1 }}>
              <Tab label="Available Gadgets" />
              {selectedGadget && <Tab label="Run Gadget" />}
            </Tabs>
            <IconButton onClick={onClose} size="small">
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ overflow: 'auto', flexGrow: 1, maxHeight: 'calc(90vh - 100px)' }}>
          {activeTab === 0 && (
            <List sx={{ p: 2 }}>
              <GadgetGrid gadgets={gadgets} onEmbedClick={() => {}} />
            </List>
          )}
          {activeTab === 1 && selectedGadget && (
            <RunGadgetPanel gadget={selectedGadget} resource={resource} />
          )}
        </Box>
      </Paper>
    </Modal>
  );
};
export { GadgetCard, GadgetGrid, RunGadgetPanel, ModalGadgetList };
