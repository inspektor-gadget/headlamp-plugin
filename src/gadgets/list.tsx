import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/k8s';
import { Box } from '@mui/material';
import { IGNotFound } from '../common/NotFound';
import Gadget from '.';
import { isIGInstalled } from './conn';

export default function GadgetList() {
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const isIGInstallationFound = isIGInstalled(pods);

  if (pods === null) {
    return <Loader title="" />;
  }
  if (isIGInstallationFound === null) {
    return <Loader title="" />;
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
