import React from 'react';
import { useState } from 'react';
import { SectionBox, Table, Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DefaultGadgets } from './default_gadgets';

export default function GadgetList() {
  const [gadgets, setGadgets] = useState(null);
  
  React.useEffect(() => {
    setGadgets(DefaultGadgets);
  },[])

  return (
    <>
      <SectionBox title="Gadgets">
        <Table
          columns={[
            {
              header: 'Name',
              accessorFn: gadget =>
                gadget.category == '' ? (
                  <Link
                    routeName="/gadgets/:gadget"
                    params={{
                      gadget: gadget.name,
                    }}
                    state={gadget}
                  >
                    {gadget.name}
                  </Link>
                ) : (
                  <Link
                    routeName="/gadgets/:gadget/:category"
                    params={{
                      gadget: gadget.name,
                      category: gadget.category,
                    }}
                    state={gadget}
                  >
                    {gadget.name}
                  </Link>
                ),
            },
            {
              header: 'Type',
              accessorFn: gadget => gadget.type,
            },
            {
              header: 'Category',
              accessorFn: gadget => gadget.category,
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
          data={
            gadgets
          }
        />
      </SectionBox>
    </>
  );
}
