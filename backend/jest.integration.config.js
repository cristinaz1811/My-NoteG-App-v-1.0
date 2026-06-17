// Jest config for INTEGRATION tests — spins up a real (test) PostgreSQL database.
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
    globalSetup: '<rootDir>/tests/setup/globalSetup.js',
    globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
    testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
    // Open pg pool / WebSocket server can keep the event loop alive after tests.
    forceExit: true,
    testTimeout: 30000,
};
