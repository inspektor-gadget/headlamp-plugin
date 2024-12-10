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
