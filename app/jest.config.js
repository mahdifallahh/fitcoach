/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/server/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    // `server-only` throws when imported outside an RSC bundle → stub it in tests.
    '^server-only$': '<rootDir>/test/server-only.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
