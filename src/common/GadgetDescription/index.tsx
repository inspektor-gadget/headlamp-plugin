import { Icon } from '@iconify/react';
import { ConfirmDialog } from '@kinvolk/headlamp-plugin/lib/components/common';
import { getCluster, getClusterPrefixedPath } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, IconButton } from '@mui/material';
import { useContext, useState } from 'react';
import { generatePath, useHistory, useParams } from 'react-router';
import { GadgetContext } from '../GadgetContext';
import { prepareGadgetInstance } from '../helpers';



export function GadgetDescription({ onInstanceDelete, instance: gInstance }) {
  const { gadgetConn } = useContext(GadgetContext);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const history = useHistory();
  const cluster = getCluster();
  const { imageName, instance, version } = useParams<{
    imageName: string;
    instance: string;
    version: string;
  }>();
  const decodedImageName = decodeURIComponent(imageName || '');
  const gadgetInstance = prepareGadgetInstance(version, instance, imageName);
  return (
    <>
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Instances"
        description="Are you sure you want to delete the selected instances?"
        onConfirm={() => {
          const id = gadgetInstance?.id || gInstance?.id;
          if (id) {
            gadgetConn.deleteGadgetInstance(id, () => {
              if (instance) {
                history.replace(
                  `${generatePath(getClusterPrefixedPath(), {
                    cluster: cluster,
                  })}/gadgets/background`
                );
                return;
              }
              onInstanceDelete(gadgetInstance || gInstance);
            });
          }
        }}
        handleClose={() => {
          setDeleteDialog(false);
        }}
      />
      <Box display="flex" alignItems="center">
        <Box ml={2} height="3.5rem">
          <h2>{decodedImageName}</h2>
        </Box>
      </Box>
    </>
  );
}
