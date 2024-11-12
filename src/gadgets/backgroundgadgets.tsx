import { Link, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import K8s from '@kinvolk/headlamp-plugin/lib/K8s';
import { Box } from '@mui/material';
import React from 'react';
import { GadgetConnectionForBackgroundRunningProcess } from './conn';

export function BackgroundRunning() {
  const [gadgetConn, setGadgetConn] = React.useState(null);
  const [nodes] = K8s.ResourceClasses.Node.useList();
  const [pods] = K8s.ResourceClasses.Pod.useList();
  const [runningInstances, setRunningInstances] = React.useState(null);

  React.useEffect(() => {
    if (gadgetConn) {
      gadgetConn.listGadgetInstances(instances => {
        if (!instances) {
          setRunningInstances([]);
          return;
        }
        setRunningInstances([...instances]);
      });
    }
  }, [gadgetConn]);

  return (
    <>
      {nodes && pods && (
        <GadgetConnectionForBackgroundRunningProcess
          nodes={nodes}
          pods={pods}
          callback={setGadgetConn}
        />
      )}
      <SectionBox title="Running Instances">
        <Table
          data={runningInstances}
          columns={[
            {
              header: 'ID',
              accessorFn: instance => instance.id,
            },
            {
              header: 'ImageName',
              accessorFn: instance => instance.gadgetConfig.imageName,
            },
            {
              header: 'Version',
              accessorFn: instance => instance.gadgetConfig.version,
            },
            {
              header: 'Action',
              accessorFn: instance => (
                <Box display={'flex'}>
                  <Box mr={1}>
                    <Link
                      routeName={`/gadgets/background/:instance/:version/:imageName`}
                      params={{
                        instance: instance.id,
                        version: instance.gadgetConfig.version,
                        imageName: instance.gadgetConfig.imageName,
                      }}
                    >
                      Observe
                    </Link>
                  </Box>
                  <Box>
                    <Link
                      routeName={''}
                      onClick={e => {
                        e.preventDefault();
                        gadgetConn.deleteGadgetInstance(instance.id, succ => {
                          console.log('Deleted', succ);
                        });
                        setRunningInstances(runningInstances.filter(i => i.id !== instance.id));
                      }}
                    >
                      Delete
                    </Link>
                  </Box>
                </Box>
              ),
            },
          ]}
          loading={runningInstances === null}
        />
      </SectionBox>
    </>
  );
}
