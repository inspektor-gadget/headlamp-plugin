import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box } from '@mui/material';
import { useState } from 'react';
import { IGNotFound } from '../common/NotFound';
import { isIGInstalled } from './conn';
import Gadget from '.';

export default function GadgetList() {
  const [gadgets, setGadgets] = useState([]);
  // const [open, setOpen] = React.useState(false);
  const [pods] = K8s.ResourceClasses.Pod.useList();
  // const [nodes] = K8s.ResourceClasses.Node.useList();
  // const [gadgetConn, setGadgetConn] = useState(null);
  const isIGInstallationFound = isIGInstalled(pods);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);


  if (isIGInstallationFound === null) {
    return <Loader />;
  }

  if (!isIGInstallationFound) {
    return <IGNotFound />;
  }
  return (
    <Box sx={{ p: 3 }}>
      {/* Render all the running instances */}
      <Gadget />

    </Box>
  );
}

// React.useEffect(() => {
//   const gadgetsFromLocalStorage = localStorage.getItem('headlamp_ig_gadgets');
//   const gadgetsArray = JSON.parse(gadgetsFromLocalStorage) || [];
//   setGadgets(DefaultGadgets.concat(gadgetsArray));
// }, []);

// React.useEffect(() => {
//   if (gadgetConn) {
//     gadgetConn.listGadgetInstances(instances => {
//       if (!instances) {
//         return;
//       }
//       const instanceCountMap = instances.reduce((acc, instance) => {
//         acc[instance.gadgetConfig.imageName] = (acc[instance.gadgetConfig.imageName] || 0) + 1;
//         return acc;
//       }, {});

//       setGadgets(prevGadgets =>
//         prevGadgets.map(gadget => ({
//           ...gadget,
//           instanceCount: instanceCountMap[gadget.name] || 0,
//         }))
//       );
//     });
//   }
// }, [gadgetConn]);

// function GadgetForm() {
//   const [customGadgetConfig, setCustomGadgetConfig] = React.useState({});
//   return (
//     <Dialog open={open} onClose={() => setOpen(false)}>
//       <DialogTitle>Add Gadget</DialogTitle>
//       <DialogContent>
//         <Box display="flex" flexDirection="column" width="20vw">
//           <TextField
//             required
//             label="ImageName Or URL"
//             variant="outlined"
//             margin="normal"
//             fullWidth
//             onChange={e => {
//               setCustomGadgetConfig({ ...customGadgetConfig, name: e.target.value });
//             }}
//           />
//           <TextField
//             label="Description"
//             variant="outlined"
//             margin="normal"
//             fullWidth
//             onChange={e => {
//               setCustomGadgetConfig({ ...customGadgetConfig, description: e.target.value });
//             }}
//             required
//           />
//           <TextField
//             required
//             label="Origin"
//             variant="outlined"
//             margin="normal"
//             fullWidth
//             onChange={e => {
//               setCustomGadgetConfig({ ...customGadgetConfig, origin: e.target.value });
//             }}
//           />
//         </Box>
//         {(!customGadgetConfig.name ||
//           !customGadgetConfig.description ||
//           !customGadgetConfig.origin) && (
//           <Alert severity="error">Please Fill all the required fields</Alert>
//         )}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={() => setOpen(false)}>Cancel</Button>
//         <Button
//           disabled={
//             !customGadgetConfig.name ||
//             !customGadgetConfig.description ||
//             !customGadgetConfig.origin
//           }
//           onClick={() => {
//             const gadgetsFromLocalStorage = localStorage.getItem('headlamp_ig_gadgets');
//             const gadgetsArray = gadgetsFromLocalStorage
//               ? JSON.parse(gadgetsFromLocalStorage)
//               : [];
//             customGadgetConfig.allowDelete = true;
//             gadgetsArray.push(customGadgetConfig);
//             localStorage.setItem('headlamp_ig_gadgets', JSON.stringify(gadgetsArray));
//             setGadgets([...gadgets].concat(customGadgetConfig));
//             setOpen(false);
//           }}
//         >
//           Add
//         </Button>
//         <Button disabled={!customGadgetConfig.name}>
//           {!customGadgetConfig.name ? (
//             'Run'
//           ) : (
//             <Link
//               routeName="/gadgets/:imageName"
//               params={{
//                 imageName: customGadgetConfig.name,
//               }}
//             >
//               Run
//             </Link>
//           )}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
