export const IG_CONTAINER_KEY = 'k8s-app';
export const IG_CONTAINER_VALUE = 'gadget';

export function isIGPod(podResource) {
  if (!podResource.metadata.labels) {
    return false;
  }
  return podResource?.metadata?.labels[IG_CONTAINER_KEY] === IG_CONTAINER_VALUE;
}

export function removeDuplicates(array) {
  const uniqueObjects = array.reduce((acc, obj) => {
    const existingObj = acc.find(item => item.key === obj.key);
    if (!existingObj) {
      acc.push(obj);
    }
    return acc;
  }, []);

  return uniqueObjects;
}

export function getProperty(obj, key) {
  const keys = key.split('.');
  return keys.reduce((acc, curr) => acc && acc[curr], obj);
}

export const createIdentifier = (identifier, value) =>
  `headlamp_${JSON.stringify({ [identifier]: value })}`;

// Parsing the string
export const parseIdentifier = str => {
  const jsonPart = str.replace('headlamp_', '');
  return JSON.parse(jsonPart);
};

export const isIdentifier = str => str.startsWith('headlamp_');

export function isElectron() {
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as any).type === 'renderer'
  ) {
    return true;
  }

  // Main process
  if (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    !!(process.versions as any).electron
  ) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to true
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }

  return false;
}

export function isDockerDesktop(): boolean {
  if (window?.ddClient === undefined) {
    return false;
  }
  return true;
}

export function getServerURL() {
  if (isDockerDesktop()) {
    return 'http://localhost:64446';
  }
  return 'http://localhost:4466';
}
