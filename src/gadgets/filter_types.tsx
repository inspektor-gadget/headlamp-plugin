export const FILTERS_TYPE = {
  uint64: {
    type: 'number',
    max: 18446744073709551615,
    min: 0,
  },
  int64: {
    type: 'number',
    max: 9223372036854775807,
    min: -9223372036854775808,
  },
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
  uint16: {
    type: 'number',
    max: 65535,
    min: 0,
  },
  int16: {
    type: 'number',
    max: 32767,
    min: -32768,
  },
  uint: {
    type: 'number',
    max: 4294967295,
    min: 0,
  },
  int: {
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
