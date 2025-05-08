# Inspektor Gadget Headlamp Plugin

 This repository contains the official [Headlamp](https://headlamp.dev/) plugin for [Inspektor Gagdet](https://inspektor-gadget.io/), providing an easier interface to run gadgets, better visualize the data, and manage the lifecycle of gadgets.

![Plugin Demo](media/plugin-demo.gif)

## Prerequisites

Before using this plugin, you need to install Inspektor Gadget on your Kubernetes cluster. For Headlamp Desktop users, you can directly install it from App Catalog. For other installation workflows, please refer to the [Inspektor Gadget documentation](https://inspektor-gadget.io/docs/latest/quick-start#kubernetes).

## Installation

### Headlamp Desktop

- Install Headlamp (https://headlamp.dev/docs/latest/installation/desktop/)
- Open Plugin Catalog
- Select the "Inspektor Gadget" and press the install button.
- Restart Headlamp

### In-Cluster Installation

To use the plugin as part of Headlamp in-cluster installation, you can install it using Helm:

#### Step 1: Add the Headlamp Helm Repository

```bash
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update
```

#### Create a values.yaml with headlamp-ig plugin
```bash
initContainers:
  - name: "headlamp-plugins"
    image: ghcr.io/inspektor-gadget/headlamp-plugin:0.1.0-beta.2
    imagePullPolicy: Always
    command:
      [
        "/bin/sh",
        "-c",
        "mkdir -p /build/plugins && cp -r /plugins/* /build/plugins/",
      ]
    volumeMounts:
      - name: "headlamp-plugins"
        mountPath: "/build/plugins"

persistentVolumeClaim:
  enabled: true
  accessModes:
    - ReadWriteMany
  size: 1Gi

volumeMounts:
  - name: "headlamp-plugins"
    mountPath: "/build/plugins"

volumes:
  - name: "headlamp-plugins"
    persistentVolumeClaim:
      claimName: "headlamp"

config:
  pluginsDir: "/build/plugins"
```

```bash
helm install my-headlamp headlamp/headlamp \
  --namespace kube-system \
  -f values.yaml
```

---

## Development (Local Testing)

To test this plugin locally with a development instance of Headlamp:

1. Make sure you have Headlamp running first. Follow the [Headlamp Quickstart Guide](https://github.com/headlamp-k8s/headlamp?tab=readme-ov-file#quickstart).

2. Once Headlamp is running, install and start this plugin:

    ```bash
    npm install
    npm start
    ```

This will build the plugin and make it available in your local Headlamp instance at runtime.
