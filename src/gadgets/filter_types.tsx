export const FILTERS_TYPE = {
  uint32: {
    type: 'number',
    max: 4294967295,
    min: 0,
  },
  int32: {
    type: 'number',
    max: 2147483647,
    min: -2147483648,
  },
  string: {
    type: 'string',
  },
  bool: {
    type: 'checkbox',
  },
  '[]string': {
    type: 'string',
  },
};
