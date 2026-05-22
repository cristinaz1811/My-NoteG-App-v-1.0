const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
    { ignores: ['node_modules/**'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: { ...globals.jest },
        },
    },
    prettier,
];
