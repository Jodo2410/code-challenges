#!/usr/bin/env node

/**
 * Validate challenge YAML schema
 */

const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats').default;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Challenge schema
const challengeSchema = {
  type: 'object',
  required: ['id', 'title', 'description', 'difficulty', 'category', 'languages', 'author'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 5 },
    description: { type: 'string', minLength: 20 },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'easy', 'medium', 'hard', 'expert']
    },
    category: { type: 'string', minLength: 1 },
    tags: {
      type: 'array',
      items: { type: 'string' }
    },
    languages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['languageId', 'starterCode', 'testCases', 'testConfig'],
        properties: {
          languageId: { type: 'string' },
          starterCode: { type: 'string', minLength: 1 },
          solutionCode: { type: 'string' },
          testCases: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['id', 'description', 'expectedOutput'],
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                input: {},
                expectedOutput: {},
                hidden: { type: 'boolean' }
              }
            }
          },
          testConfig: {
            type: 'object',
            required: ['runCommand'],
            properties: {
              runCommand: { type: 'string' },
              timeout: { type: 'number' },
              testFileTemplate: { type: 'string' }
            }
          }
        }
      }
    },
    author: { type: 'string', minLength: 1 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    version: { type: 'string' },
    status: { type: 'string' }
  }
};

const validate = ajv.compile(challengeSchema);

const files = process.argv.slice(2);
const errors = [];
const warnings = [];
let totalTests = 0;
const languages = new Set();

console.log('🔍 Validating challenge schema...\n');

for (const file of files) {
  console.log(`Validating: ${file}`);

  try {
    const content = fs.readFileSync(file, 'utf8');
    const challenge = yaml.load(content);

    // Schema validation
    const valid = validate(challenge);

    if (!valid) {
      console.log(`❌ Schema validation failed for ${file}`);
      validate.errors.forEach(err => {
        errors.push({
          file,
          field: err.instancePath || err.params.missingProperty || 'unknown',
          message: err.message
        });
        console.log(`   - ${err.instancePath}: ${err.message}`);
      });
    } else {
      console.log(`✅ Schema valid`);

      // Additional business rules
      challenge.languages.forEach(lang => {
        languages.add(lang.languageId);
        totalTests += lang.testCases.length;

        // Check for minimum test cases
        if (lang.testCases.length < 3) {
          warnings.push({
            file,
            field: `languages.${lang.languageId}.testCases`,
            message: `Only ${lang.testCases.length} test cases (recommended: 3+)`
          });
        }

        // Check for hidden test cases
        const hiddenTests = lang.testCases.filter(tc => tc.hidden);
        if (hiddenTests.length === 0) {
          warnings.push({
            file,
            field: `languages.${lang.languageId}.testCases`,
            message: 'No hidden test cases found'
          });
        }
      });

      // Check for tags
      if (!challenge.tags || challenge.tags.length === 0) {
        warnings.push({
          file,
          field: 'tags',
          message: 'No tags provided'
        });
      }
    }
  } catch (err) {
    console.log(`❌ Failed to parse ${file}`);
    errors.push({
      file,
      field: 'file',
      message: `Parse error: ${err.message}`
    });
  }

  console.log('');
}

// Write results
const results = {
  valid: errors.length === 0,
  errors,
  warnings,
  totalTests,
  languages: Array.from(languages)
};

fs.writeFileSync('validation-results.json', JSON.stringify(results, null, 2));

console.log('\n📊 Validation Summary:');
console.log(`   Total Errors: ${errors.length}`);
console.log(`   Total Warnings: ${warnings.length}`);
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Languages: ${Array.from(languages).join(', ')}`);

if (errors.length > 0) {
  console.log('\n❌ Validation FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Validation PASSED');
  process.exit(0);
}
