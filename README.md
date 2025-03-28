# headlamp-ig

## About

This Headlamp plugin allows you to interact with [Inspektor Gadget](https://inspektor-gadget.io/) directly from your Headlamp dashboard. Inspektor Gadget is a collection of tools (gadgets) for debugging and inspecting Kubernetes resources.

### What is Inspektor Gadget?

Inspektor Gadget is a powerful tool that leverages eBPF to provide deep insights into your Kubernetes cluster, including networking, security, and performance monitoring capabilities.

### Installing Inspektor Gadget

Before using this plugin, you need to have Inspektor Gadget installed on your Kubernetes cluster. Follow the [official installation guide](https://inspektor-gadget.io/docs/latest/quick-start#kubernetes) for detailed instructions.

## Development

To test this plugin:

1. Make sure you have Headlamp running first. Follow the [Headlamp Quickstart Guide](https://github.com/headlamp-k8s/headlamp?tab=readme-ov-file#quickstart) to set up Headlamp.

2. Once Headlamp is running, install and start this plugin:

```bash
npm i && npm start
```

This will build the plugin and make it available in your local Headlamp instance.
