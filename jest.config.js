module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '/test/.*\\.(test|spec)?\\.(ts|tsx)$',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
};
