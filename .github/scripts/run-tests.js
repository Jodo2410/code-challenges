#!/usr/bin/env node

/**
 * Run tests for challenge submissions
 * This script tests the solution code against test cases
 */

const fs = require('fs');
const yaml = require('js-yaml');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const files = process.argv.slice(2);

console.log('🧪 Running challenge tests...\n');

let allTestsPassed = true;
const testResults = [];

for (const file of files) {
  console.log(`Testing: ${file}`);

  try {
    const content = fs.readFileSync(file, 'utf8');
    const challenge = yaml.load(content);

    for (const lang of challenge.languages) {
      console.log(`  Language: ${lang.languageId}`);

      // Skip if no solution code
      if (!lang.solutionCode) {
        console.log(`    ⚠️  No solution code provided, skipping tests`);
        continue;
      }

      // Create temp directory for testing
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'challenge-test-'));

      try {
        // Write solution code
        const ext = getFileExtension(lang.languageId);
        const solutionFile = path.join(tempDir, `solution${ext}`);
        fs.writeFileSync(solutionFile, lang.solutionCode);

        // Run tests
        let passedTests = 0;
        let failedTests = 0;

        for (const testCase of lang.testCases) {
          try {
            // Create test file
            const testFile = createTestFile(tempDir, lang, testCase);

            // Execute test
            const result = execSync(
              lang.testConfig.runCommand.replace('{{testFile}}', testFile),
              {
                cwd: tempDir,
                timeout: lang.testConfig.timeout || 5000,
                encoding: 'utf8'
              }
            );

            // Parse result (simplified - you may need more sophisticated parsing)
            const output = result.trim();
            const expected = JSON.stringify(testCase.expectedOutput);

            if (output.includes(expected) || output === String(testCase.expectedOutput)) {
              console.log(`    ✅ ${testCase.id}: PASSED`);
              passedTests++;
            } else {
              console.log(`    ❌ ${testCase.id}: FAILED`);
              console.log(`       Expected: ${expected}`);
              console.log(`       Got: ${output}`);
              failedTests++;
              allTestsPassed = false;
            }
          } catch (testError) {
            console.log(`    ❌ ${testCase.id}: ERROR`);
            console.log(`       ${testError.message}`);
            failedTests++;
            allTestsPassed = false;
          }
        }

        console.log(`    Summary: ${passedTests}/${passedTests + failedTests} passed\n`);

        testResults.push({
          file,
          language: lang.languageId,
          passed: passedTests,
          failed: failedTests,
          total: passedTests + failedTests
        });

      } finally {
        // Cleanup temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}\n`);
    allTestsPassed = false;
  }
}

// Update validation results
let validationResults = { valid: true, errors: [], warnings: [] };
if (fs.existsSync('validation-results.json')) {
  validationResults = JSON.parse(fs.readFileSync('validation-results.json', 'utf8'));
}

validationResults.testResults = testResults;
validationResults.valid = validationResults.valid && allTestsPassed;

fs.writeFileSync('validation-results.json', JSON.stringify(validationResults, null, 2));

console.log('\n📊 Test Summary:');
testResults.forEach(result => {
  console.log(`   ${result.language}: ${result.passed}/${result.total} passed`);
});

if (allTestsPassed) {
  console.log('\n✅ All tests PASSED');
  process.exit(0);
} else {
  console.log('\n❌ Some tests FAILED');
  process.exit(1);
}

// Helper functions

function getFileExtension(languageId) {
  const extensions = {
    javascript: '.js',
    python: '.py',
    typescript: '.ts',
    java: '.java',
    cpp: '.cpp',
    go: '.go',
    rust: '.rs',
    ruby: '.rb'
  };
  return extensions[languageId] || '.txt';
}

function createTestFile(dir, lang, testCase) {
  const ext = getFileExtension(lang.languageId);
  const testFile = path.join(dir, `test${ext}`);

  // Simple test file generation (you may need to customize per language)
  let testCode = '';

  if (lang.languageId === 'javascript') {
    testCode = `
${lang.solutionCode}

// Test case: ${testCase.description}
const input = ${JSON.stringify(testCase.input)};
const expected = ${JSON.stringify(testCase.expectedOutput)};

// Assume function name is in solutionCode
const result = eval(\`(\${Object.values(module.exports)[0] || ''})\`)(input);
console.log(JSON.stringify(result));
`;
  } else if (lang.languageId === 'python') {
    testCode = `
${lang.solutionCode}

# Test case: ${testCase.description}
import json
input_val = ${JSON.stringify(testCase.input)}
expected = ${JSON.stringify(testCase.expectedOutput)}

# Run test
result = list(globals().values())[0](input_val) if callable(list(globals().values())[0]) else None
print(json.dumps(result))
`;
  }

  fs.writeFileSync(testFile, testCode);
  return testFile;
}
