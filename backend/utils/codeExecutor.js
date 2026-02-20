const { VM } = require('vm2');

/**
 * Execute user code against test cases
 * This is a simplified version. In production, use Docker containers or sandboxed environments
 */
const executeCode = async (code, testCases, language) => {
    const results = [];

    for (const testCase of testCases) {
        try {
            const result = await runTestCase(code, testCase, language);
            results.push(result);
        } catch (error) {
            results.push({
                passed: false,
                input: testCase.input,
                expected: testCase.expected_output,
                actual: null,
                error: error.message,
            });
        }
    }

    return results;
};

const runTestCase = async (code, testCase, language) => {
    const startTime = Date.now();
    
    try {
        let result;
        
        if (language === 'javascript') {
            result = executeJavaScript(code, testCase);
        } else if (language === 'python') {
            result = await executePython(code, testCase);
        } else if (language === 'java') {
            result = await executeJava(code, testCase);
        } else if (language === 'cpp' || language === 'c++') {
            result = await executeCpp(code, testCase);
        } else if (language === 'csharp' || language === 'c#') {
            result = await executeCSharp(code, testCase);
        } else {
            throw new Error(`Unsupported language: ${language}`);
        }

        const executionTime = Date.now() - startTime;
        const passed = compareOutputs(result, testCase.expected_output);

        return {
            passed,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: result,
            executionTime,
            error: null,
        };
    } catch (error) {
        return {
            passed: false,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: null,
            executionTime: Date.now() - startTime,
            error: error.message,
        };
    }
};

const executeJavaScript = (code, testCase) => {
    // Create a sandboxed VM
    const vm = new VM({
        timeout: 5000,
        sandbox: {},
    });

    // Parse input
    const inputs = JSON.parse(testCase.input);
    
    // Prepare the code to execute
    const fullCode = `
        ${code}
        
        // Extract function name from code
        const functionMatch = code.match(/function\\s+(\\w+)/);
        if (!functionMatch) {
            throw new Error('No function found in code');
        }
        const functionName = functionMatch[1];
        
        // Execute function with inputs
        const inputs = ${testCase.input};
        const result = eval(functionName)(...inputs);
        JSON.stringify(result);
    `;

    const result = vm.run(fullCode);
    return result;
};

const executePython = async (code, testCase) => {
    // For Python execution, you would typically use child_process to run Python
    // This is a placeholder - in production, use proper sandboxing
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        const python = spawn('python3', ['-c', `
import json
import sys

${code}

# Parse input and execute
inputs = json.loads('${testCase.input.replace(/'/g, "\\'")}')
function_name = [name for name in dir() if callable(eval(name)) and not name.startswith('_')][0]
result = eval(function_name)(*inputs)
print(json.dumps(result))
        `]);

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(error || 'Python execution failed'));
            } else {
                resolve(output.trim());
            }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            python.kill();
            reject(new Error('Execution timeout'));
        }, 5000);
    });
};

const executeJava = async (code, testCase) => {
    const { spawn, execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Create temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-'));
    
    // Extract class name from code
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Solution';
    
    const javaFile = path.join(tempDir, `${className}.java`);
    
    // Add main method wrapper if not present
    let fullCode = code;
    if (!code.includes('public static void main')) {
        fullCode = `
import java.util.*;
import com.google.gson.Gson;

${code}

// Main wrapper is expected to be in the code
`;
    }
    
    fs.writeFileSync(javaFile, fullCode);
    
    return new Promise((resolve, reject) => {
        try {
            // Compile
            execSync(`javac ${javaFile}`, { cwd: tempDir, timeout: 10000 });
            
            // Run
            const java = spawn('java', ['-cp', tempDir, className], { cwd: tempDir });
            
            let output = '';
            let error = '';
            
            // Send input
            java.stdin.write(testCase.input);
            java.stdin.end();
            
            java.stdout.on('data', (data) => { output += data.toString(); });
            java.stderr.on('data', (data) => { error += data.toString(); });
            
            java.on('close', (code) => {
                // Cleanup
                fs.rmSync(tempDir, { recursive: true, force: true });
                
                if (code !== 0) {
                    reject(new Error(error || 'Java execution failed'));
                } else {
                    resolve(output.trim());
                }
            });
            
            setTimeout(() => {
                java.kill();
                fs.rmSync(tempDir, { recursive: true, force: true });
                reject(new Error('Execution timeout'));
            }, 10000);
        } catch (err) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            reject(new Error(err.message));
        }
    });
};

const executeCpp = async (code, testCase) => {
    const { spawn, execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-'));
    const cppFile = path.join(tempDir, 'solution.cpp');
    const executable = path.join(tempDir, 'solution');
    
    fs.writeFileSync(cppFile, code);
    
    return new Promise((resolve, reject) => {
        try {
            // Compile with g++
            execSync(`g++ -std=c++17 -o ${executable} ${cppFile}`, { timeout: 10000 });
            
            // Run
            const process = spawn(executable);
            
            let output = '';
            let error = '';
            
            process.stdin.write(testCase.input);
            process.stdin.end();
            
            process.stdout.on('data', (data) => { output += data.toString(); });
            process.stderr.on('data', (data) => { error += data.toString(); });
            
            process.on('close', (code) => {
                fs.rmSync(tempDir, { recursive: true, force: true });
                
                if (code !== 0) {
                    reject(new Error(error || 'C++ execution failed'));
                } else {
                    resolve(output.trim());
                }
            });
            
            setTimeout(() => {
                process.kill();
                fs.rmSync(tempDir, { recursive: true, force: true });
                reject(new Error('Execution timeout'));
            }, 10000);
        } catch (err) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            reject(new Error(err.message));
        }
    });
};

const executeCSharp = async (code, testCase) => {
    const { spawn, execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-'));
    const csFile = path.join(tempDir, 'Solution.cs');
    const executable = path.join(tempDir, 'Solution');
    
    fs.writeFileSync(csFile, code);
    
    return new Promise((resolve, reject) => {
        try {
            // Compile with mcs (Mono) or csc
            try {
                execSync(`mcs -out:${executable} ${csFile}`, { timeout: 10000 });
            } catch {
                // Try dotnet if mcs not available
                execSync(`csc -out:${executable}.exe ${csFile}`, { timeout: 10000 });
            }
            
            // Run - try mono first, then direct execution
            let process;
            try {
                process = spawn('mono', [executable]);
            } catch {
                process = spawn(executable + '.exe');
            }
            
            let output = '';
            let error = '';
            
            process.stdin.write(testCase.input);
            process.stdin.end();
            
            process.stdout.on('data', (data) => { output += data.toString(); });
            process.stderr.on('data', (data) => { error += data.toString(); });
            
            process.on('close', (code) => {
                fs.rmSync(tempDir, { recursive: true, force: true });
                
                if (code !== 0) {
                    reject(new Error(error || 'C# execution failed'));
                } else {
                    resolve(output.trim());
                }
            });
            
            setTimeout(() => {
                process.kill();
                fs.rmSync(tempDir, { recursive: true, force: true });
                reject(new Error('Execution timeout'));
            }, 10000);
        } catch (err) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            reject(new Error(err.message));
        }
    });
};

const compareOutputs = (actual, expected) => {
    try {
        // Normalize both outputs
        const normalizedActual = JSON.stringify(JSON.parse(actual));
        const normalizedExpected = JSON.stringify(JSON.parse(expected));
        return normalizedActual === normalizedExpected;
    } catch {
        // If JSON parsing fails, compare as strings
        return actual.trim() === expected.trim();
    }
};

module.exports = { executeCode };
