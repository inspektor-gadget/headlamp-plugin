import { Icon } from '@iconify/react';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import { Box, Button, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { generateRandomString } from '../common/helpers';

export function GadgetInput({ resource, onAddGadget }) {
  const [imageURL, setImageURL] = useState('');
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const encodedImageURL = encodeURIComponent(imageURL);

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
      id: encodedImageURL + '-custom-' + generateRandomString(),
      isHeadless: undefined,
      gadgetConfig: {
        imageName: encodedImageURL,
        version: 1,
        paramValues: {},
      },
      name: 'gadget-custom-' + generateRandomString(),
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
        pathname: `/c/${getCluster()}/gadgets/${encodedImageURL}/${row.id}`,
      });
    }
  };

  return (
    <Box mt={2} display="flex" alignItems="center">
        
      <TextField
        label="Gadget Image URL"
        placeholder='ghcr.io/inspektor-gadget/gadget/trace_open:latest'
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

export default GadgetInput;
