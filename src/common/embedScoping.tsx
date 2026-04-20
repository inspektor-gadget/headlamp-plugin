// Helpers for resource-scoped gadget embedding.

// Reference to a specific K8s resource.
export interface EmbeddedResourceRef {
  kind: string;
  name: string;
  // Namespace (absent for cluster-scoped resources like Nodes).
  namespace?: string;
  cluster: string;
}

// Stored gadget instance shape.
export interface GadgetInstance {
  id: string;
  cluster: string;
  kind?: string;
  isEmbedded?: boolean;
  isHeadless?: boolean;
  // Present when bound to a specific resource.
  embeddedResource?: EmbeddedResourceRef;
  gadgetConfig?: {
    imageName: string;
    version: number;
    paramValues?: Record<string, any>;
  };
  name?: string;
  tags?: string[];
}

// Build an EmbeddedResourceRef from resource jsonData.
export function deriveResourceRef(
  resourceJson: any,
  cluster: string
): EmbeddedResourceRef {
  const kind: string = resourceJson?.kind ?? '';
  const name: string = resourceJson?.metadata?.name ?? '';
  const namespace: string | undefined =
    resourceJson?.metadata?.namespace ?? undefined;

  return {
    kind,
    name,
    ...(namespace ? { namespace } : {}),
    cluster,
  };
}

// Returns true if the instance matches the resource and cluster.
export function doesInstanceMatchResource(
  instance: GadgetInstance,
  resourceJson: any,
  cluster: string
): boolean {
  if (!instance.isEmbedded) return false;
  if (!resourceJson) return false;

  const ref = instance.embeddedResource;
  if (!ref) return false;

  if (ref.cluster !== cluster) return false;
  if (ref.kind !== resourceJson.kind) return false;
  if (ref.name !== resourceJson?.metadata?.name) return false;

  const instanceNs = ref.namespace;
  const resourceNs: string | undefined = resourceJson?.metadata?.namespace;

  if (instanceNs !== undefined || resourceNs !== undefined) {
    if (instanceNs !== resourceNs) return false;
  }

  return true;
}

// Quick existence check: does **any** stored instance match this resource?
// Used by the section gate in `src/index.tsx` to decide whether to render
// the Inspektor Gadget section at all.
export function hasEmbeddedInstancesForResource(
  instances: GadgetInstance[],
  resourceJson: any,
  cluster: string
): boolean {
  if (!Array.isArray(instances) || !resourceJson) return false;
  return instances.some(i => doesInstanceMatchResource(i, resourceJson, cluster));
}
