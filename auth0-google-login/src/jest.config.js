module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // This tells Jest to use ts-jest to process TypeScript files
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'], // Add .ts and .tsx extensions
  transformIgnorePatterns: ['<rootDir>/node_modules/'], // Ignore transformation for node_modules
};
