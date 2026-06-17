// Default Jest config — unit and code-execution tests (no database required).
// Integration tests use jest.integration.config.js (adds DB global setup).
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
    testMatch: [
        '<rootDir>/tests/unit/**/*.test.js',
        '<rootDir>/tests/exec/**/*.test.js',
    ],
    collectCoverageFrom: [
        'utils/**/*.js',
        'controllers/**/*.js',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        // Conservative global floor; the pure utils are covered well above this.
        global: { lines: 25 },
    },
    // Spawned compilers/sandbox can leave short-lived handles after assertions pass.
    forceExit: true,
    testTimeout: 25000,
};
