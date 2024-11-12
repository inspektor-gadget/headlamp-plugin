import { Loader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';
import { isIGPod } from '../../gadgets/helper';

export function NodeSelection(props: {
  setPodStreamsConnected: any;
  setPodsSelected: any;
  open: boolean;
  setOpen: any;
  nodesSelected: any;
  setNodesSelected: any;
}) {
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const {
    setPodStreamsConnected,
    setPodsSelected,
    open,
    setOpen,
    nodesSelected,
    setNodesSelected,
  } = props;

  if (nodes === null) {
    return <Loader title="" />;
  }
  return (
    <Dialog open={open}>
      <DialogTitle>Select a node you want to run the gadget on</DialogTitle>
      <DialogContent>
        <Box>
          {nodes?.map(node => {
            return (
              <Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox />}
                    label={node.metadata.name}
                    onChange={e => {
                      let selectedNodes;
                      if (e.target.checked) {
                        selectedNodes = [...nodesSelected, node.metadata.name];
                        setNodesSelected(selectedNodes);
                      } else {
                        selectedNodes = nodesSelected.filter(n => n !== node.metadata.name);
                        setNodesSelected(selectedNodes);
                        setPodStreamsConnected(prev => prev - 1);
                      }
                    }}
                    checked={nodesSelected.includes(node.metadata.name)}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpen(false);
            const podsInterestedIn = [];
            nodesSelected.forEach(nodeName => {
              podsInterestedIn.push(
                ...[...pods.filter(pod => pod.spec.nodeName === nodeName && isIGPod(pod))]
              );
            });
            setPodsSelected(...[podsInterestedIn]);
          }}
          disabled={nodesSelected.length === 0}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
