/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Mock automático del cliente Prisma
    '^../prisma/client$': '<rootDir>/src/__mocks__/prisma.ts',
    '^../../prisma/client$': '<rootDir>/src/__mocks__/prisma.ts',
  },
  clearMocks: true,
};
