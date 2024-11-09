import { Link,SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import { useState } from 'react';
import { DefaultGadgets } from './default_gadgets';

export default function GadgetList() {
  const [gadgets, setGadgets] = useState(null);

  React.useEffect(() => {
    setGadgets(DefaultGadgets);
  }, []);

  return (
    <>
      <SectionBox title="Gadgets">
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
          ]}
          loading={gadgets === null}
          data={gadgets}
        />
      </SectionBox>
    </>
  );
}
