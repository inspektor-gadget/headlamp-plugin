export const IG_CONTAINER_KEY = 'k8s-app';
export const IG_CONTAINER_VALUE = 'gadget';

export function isIGPod(podResource) {
  return podResource.metadata.labels[IG_CONTAINER_KEY] === IG_CONTAINER_VALUE;
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
