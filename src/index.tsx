import { addIcon } from '@iconify/react';
import { Icon } from '@iconify/react';
import {
  registerDetailsViewSection,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import {
  ActionButton,
  EmptyContent,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import { DetailsViewSectionProps } from '@kinvolk/headlamp-plugin/lib/components/DetailsViewSection/DetailsViewSection';
import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { IGNotFound } from './common/NotFound';
import { GadgetCreation } from './gadgets/gadgetcreationinresource';
import { GadgetDetails } from './gadgets/gadgetDetails';
import { isIGPod } from './gadgets/helper';
import GadgetList from './gadgets/list';
import RunningGadgetsForResource from './gadgets/resourcegadgets';

addIcon('custom-icon:ig', {
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none"><g transform="scale(0.28) translate(4, 4)"><path d="M69.3951 0L62.0688 2.00111L49.737 5.32113L41.7281 7.50416L32.3085 10.0965L4.45949 17.6007L0 35.1559L11.4218 46.5713L20.0677 55.2579L28.2586 46.9806L28.2131 36.4748L44.4584 20.2385L47.5982 23.3311L46.3241 32.0177L50.9656 36.6567L59.657 35.3833L62.7514 38.5213L46.5061 54.7121L35.949 54.6667L27.758 62.853L34.4018 69.5385L46.8701 82L64.5261 77.7249L66.7103 69.5385L69.3496 59.8059L75.0832 38.3849L77.6315 28.9706L82 12.7343L69.3951 0Z" fill="currentColor"/></g></svg>',
  width: 24,
  height: 24,
});

registerSidebarEntry({
  name: 'gadgets',
  icon: 'custom-icon:ig',
  url: '/gadgets',
  parent: null,
  label: 'Gadgets',
});

registerRoute({
  path: '/gadgets',
  component: GadgetList,
  exact: true,
  sidebar: 'gadgets',
  name: 'gadgets',
});

registerRoute({
  path: '/gadgets/:imageName/:id',
  component: GadgetDetails,
  exact: true,
  sidebar: 'gadgets',
  name: 'gadgets',
});

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
  const embeddedResources = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
  const [open, setOpen] = useState(false);
  const isResourceEmbedded = embeddedResources.find((r: any) => r.kind === resource?.jsonData.kind);
  const [pods] = K8s.ResourceClasses.Pod.useList();

  const isIGInstalled = pods?.find((pod: any) => isIGPod(pod));

  if (pods == null) {
    return null;
  }

  if (!isIGInstalled) {
    <IGNotFound />;
  }
  if (resource && pods && isIGInstalled) {
    return (
      <>
        <GadgetCreation resource={resource} open={open} setOpen={setOpen} />
        <SectionBox
          title={
            <Box display="flex" alignItems="center" ml={2}>
              <Box>
                <Typography variant="h5">Inspektor Gadget</Typography>
              </Box>
              <Box>
                <ActionButton
                  color="primary"
                  description={'Add Gadget'}
                  icon={'mdi:plus-circle'}
                  onClick={() => {
                    setOpen(true);
                  }}
                />
              </Box>
            </Box>
          }
        >
          {isResourceEmbedded ? (
            <RunningGadgetsForResource resource={resource} open={open} />
          ) : (
            <EmptyContent>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Icon icon="mdi:alert-circle-outline" width="2em" height="2em" />
                <Typography variant="body1">No Gadget Instances Added</Typography>
                <Typography variant="body2">Click the plus icon to add a Gadget</Typography>
              </Box>
            </EmptyContent>
          )}
        </SectionBox>
      </>
    );
  }
  return null;
});
