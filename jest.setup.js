jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => React.createElement('Icon', props),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    type: 'wifi',
    isConnected: true,
    details: { ssid: 'BruceLinkAP' },
  }),
}));
