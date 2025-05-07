# headlamp-ig

## About

This Headlamp plugin allows you to interact with [Inspektor Gadget](https://inspektor-gadget.io/) directly from your Headlamp dashboard. Inspektor Gadget is a collection of tools (gadgets) for debugging and inspecting Kubernetes resources.

### What is Inspektor Gadget?

Inspektor Gadget is a powerful tool that leverages eBPF to provide deep insights into your Kubernetes cluster, including networking, security, and performance monitoring capabilities.

### Installing Inspektor Gadget

Before using this plugin, you need to have Inspektor Gadget installed on your Kubernetes cluster. Follow the [official installation guide](https://inspektor-gadget.io/docs/latest/quick-start#kubernetes) for detailed instructions.

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

---

## Running the Plugin with a Headlamp Helm Deployment

To use this plugin in a **deployed Headlamp instance** via **Helm**, follow the steps below:

### Step 1: Add the Headlamp Helm Repository

```bash
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update
```

## Create a values.yaml with headlamp-ig plugin
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
