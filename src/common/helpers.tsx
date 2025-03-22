import _ from 'lodash';

export const IS_METRIC = 'isMetric';
export const HEADLAMP_KEY = 'headlamp_key';
export const HEADLAMP_VALUE = 'headlamp_value';
export const HEADLAMP_METRIC_UNIT = 'headlamp_metric_unit';

export function generateRandomString(length: number = 6): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function updateInstanceFromStorage(id, embedView = 'None', isHeadless = false) {
  const embeddedInstances = JSON.parse(localStorage.getItem('headlamp_embeded_resources') || '[]');
  const instance = embeddedInstances.find(instance => instance.id === id);

  if (instance) {
    const updatedInstances = embeddedInstances.filter(instance => instance.id !== id);
    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedInstances));

    instance.isHeadless = isHeadless; // Update isHeadless property
    if (embedView !== 'None') {
      instance.kind = embedView; // Update kind with embedView
      instance.isEmbedded = true; // Mark as embedded
    } else {
      delete instance.kind; // Remove kind if embedView is 'None'
      instance.isEmbedded = false; // Mark as non-embedded
    }

    const updatedEmbeddedInstances = [...updatedInstances, instance];
    localStorage.setItem('headlamp_embeded_resources', JSON.stringify(updatedEmbeddedInstances));
    return instance;
  }

  return null;
}
