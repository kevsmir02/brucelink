module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(html)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
