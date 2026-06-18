// Code-execution system tests across all supported languages.
// Languages whose toolchain is not installed are skipped (not failed), so the
// suite stays green on machines/CI without every compiler. See thesis §4.4.
const { execSync } = require('child_process');
const { executeCode } = require('../../utils/codeExecutor');

// Returns true only if the command actually runs (macOS ships a `java` shim that
// resolves on PATH but has no JRE, so we invoke the real version command).
function commandWorks(cmd) {
    try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const tc = (input, expected) => ({ input, expected_output: expected });

// { language, available, correct, wrong, cases }
const SUITES = [
    {
        language: 'javascript',
        available: true,
        correct: 'function add(a, b) { return a + b; }',
        wrong: 'function add(a, b) { return a - b; }',
        cases: [tc('[2, 3]', '5'), tc('[10, -4]', '6')],
    },
    {
        language: 'python',
        available: commandWorks('python3 --version'),
        correct: 'def add(a, b):\n    return a + b',
        wrong: 'def add(a, b):\n    return a - b',
        cases: [tc('[2, 3]', '5'), tc('[10, -4]', '6')],
    },
    {
        language: 'java',
        available: commandWorks('java -version') && commandWorks('javac -version'),
        correct: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(sc.nextInt() + sc.nextInt());
    }
}`,
        wrong: `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(sc.nextInt() - sc.nextInt());
    }
}`,
        cases: [tc('2 3', '5')],
    },
    {
        language: 'cpp',
        available: commandWorks('g++ --version'),
        correct: '#include <iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b<<endl;return 0;}',
        wrong: '#include <iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a-b<<endl;return 0;}',
        cases: [tc('2 3', '5')],
    },
    {
        language: 'csharp',
        available: commandWorks('mcs --version') || commandWorks('csc -version'),
        correct: `using System;
class Solution {
    static void Main() {
        var p = Console.ReadLine().Split(' ');
        Console.WriteLine(int.Parse(p[0]) + int.Parse(p[1]));
    }
}`,
        wrong: `using System;
class Solution {
    static void Main() {
        var p = Console.ReadLine().Split(' ');
        Console.WriteLine(int.Parse(p[0]) - int.Parse(p[1]));
    }
}`,
        cases: [tc('2 3', '5')],
    },
];

for (const suite of SUITES) {
    const block = suite.available ? describe : describe.skip;
    block(`executeCode — ${suite.language}`, () => {
        it('passes every test for a correct solution', async () => {
            const results = await executeCode(suite.correct, suite.cases, suite.language);
            expect(results.every((r) => r.passed)).toBe(true);
        }, 20000);

        it('fails when the output is wrong', async () => {
            const results = await executeCode(suite.wrong, suite.cases, suite.language);
            expect(results.some((r) => !r.passed)).toBe(true);
        }, 20000);
    });
}

describe('executeCode — error handling', () => {
    it('does not throw on a compile/parse error (returns failed results)', async () => {
        const results = await executeCode('this is not valid code', [tc('[1]', '1')], 'javascript');
        expect(results[0].passed).toBe(false);
        expect(results[0].error).toBeTruthy();
    });

    it('returns a failed result for an unsupported language', async () => {
        const results = await executeCode('print(1)', [tc('[1]', '1')], 'rust');
        expect(results[0].passed).toBe(false);
    });
});
