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
