// Security of the JavaScript execution sandbox (vm2). These run without a DB.
const { executeCode } = require('../../utils/codeExecutor');

const tc = (input, expected) => ({ input, expected_output: expected });

describe('vm2 sandbox isolation', () => {
    it('blocks access to require() / the file system', async () => {
        const malicious = `function attack(x) {
            const fs = require('fs');
            return fs.readFileSync('/etc/passwd', 'utf8');
        }`;
        const [res] = await executeCode(malicious, [tc('[1]', '"x"')], 'javascript');
        expect(res.passed).toBe(false);
        expect(res.error).toBeTruthy();
    });

    it('blocks access to process', async () => {
        const malicious = `function attack(x) { return process.env.JWT_SECRET || 'none'; }`;
        const [res] = await executeCode(malicious, [tc('[1]', '"none"')], 'javascript');
        // process is not defined inside the sandbox → throws → not passed.
        expect(res.passed).toBe(false);
    });

    it('terminates an infinite loop via the execution timeout', async () => {
        const infinite = `function loop(x) { while (true) {} }`;
        const [res] = await executeCode(infinite, [tc('[1]', '1')], 'javascript');
        expect(res.passed).toBe(false);
        expect(res.error).toBeTruthy();
    }, 15000);
});
