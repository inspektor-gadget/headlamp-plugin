import _ from 'lodash';

export const IS_METRIC = 'isMetric';
export const HEADLAMP_KEY = 'headlamp_key';
export const HEADLAMP_VALUE = 'headlamp_value';
export const HEADLAMP_METRIC_UNIT = 'headlamp_metric_unit';

export function prepareGadgetInstance(version, instance, imageName) {
  if (_.isEmpty(version) || _.isEmpty(instance) || _.isEmpty(imageName)) {
    return null;
  }
  return {
    id: instance,
    gadgetConfig: {
      imageName,
      version,
    },
  };
}


export function generateRandomString(length: number = 6): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}