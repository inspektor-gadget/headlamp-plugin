import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import Gadget from './gadgets';
import { BackgroundRunning } from './gadgets/backgroundgadgets';
import GadgetList from './gadgets/list';

registerSidebarEntry({
  name: 'gadgets',
  icon: 'mdi:usb',
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

registerSidebarEntry({
  name: 'background',
  url: '/gadgets/background',
  parent: 'gadgets',
  label: 'Background Running',
});

registerRoute({
  path: '/gadgets/background',
  component: BackgroundRunning,
  exact: true,
  sidebar: 'background',
  name: 'background',
});

registerRoute({
  path: '/gadgets/background/:instance/:version/:imageName',
  component: Gadget,
  exact: true,
  sidebar: 'background',
  name: 'background',
});

registerRoute({
  path: '/gadgets/:imageName',
  component: Gadget,
  exact: true,
  sidebar: 'gadgets',
  name: 'gadgets',
});
