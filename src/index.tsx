import { registerRoute, registerSidebarEntry } from "@kinvolk/headlamp-plugin/lib";
import GadgetList from "./gadgets/list";
import Gadget from "./gadgets";
//import Gadget from "./gadget";

registerSidebarEntry({
    name: "gadgets",
    icon: "mdi:usb",
    url: "/gadgets",
    parent: null,
    label: "Gadgets",
})


registerRoute({
    path: "/gadgets",
    component: GadgetList,
    exact: true,
    sidebar: 'gadgets',
    name: "gadgets",
})

registerRoute({
    path: "/gadgets/:gadget",
    component: Gadget,
    exact: true,
    sidebar: 'gadgets',
    name: "gadgets",
})

registerRoute({
    path: "/gadgets/:gadget/:category",
    component: Gadget,
    exact: true,
    sidebar: 'gadgets',
    name: "gadgets",
})