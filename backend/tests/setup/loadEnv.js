// Runs before every test file (jest `setupFiles`). Loads .env.test BEFORE any app
// module is imported, so config/database.js picks up the test database. dotenv does
// not override variables that are already set, so this must run first.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
