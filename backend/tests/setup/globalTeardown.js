// Jest globalTeardown for integration tests. The test database is left in place for
// inspection and is recreated cleanly on the next run by globalSetup.js. Worker DB
// pools are closed via afterAll hooks in the test files (see tests/helpers/db.js).
module.exports = async () => {};
