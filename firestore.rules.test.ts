import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const BLUEPRINT_PATH = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules enforces deny-by-default and owner-scoped authorization', () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /allow read, write:\s*if false/);
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /isOwnerId\(/);
  assert.match(rules, /resource\.data\.ownerId\s*==\s*request\.auth\.uid/);
  assert.match(rules, /createdAt\s*==\s*existing\(\)\.createdAt/);
});

test('firestore.rules explicitly validates all blueprint collections', () => {
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8')) as {
    firestore: Record<string, unknown>;
  };
  const rules = fs.readFileSync(RULES_PATH, 'utf8');

  const collections = Object.keys(blueprint.firestore);
  assert.ok(collections.length >= 6, 'Expected at least 6 top-level collections in blueprint');
  for (const colPath of collections) {
    const colName = colPath.split('/')[1];
    assert.ok(
      rules.includes(`match /${colName}/`),
      `firestore.rules is missing match rule for collection ${colName}`,
    );
  }
});

test('firestore.rules forbids unauthenticated writes and role escalation on users collection', () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  assert.match(rules, /match \/users\/\{userId\}/);
  assert.match(rules, /incoming\(\)\.role\s*==\s*'technician'/);
  assert.match(rules, /incoming\(\)\.role\s*==\s*existing\(\)\.role/);
  assert.match(rules, /match \/copilotThreads\/\{threadId\}/);
  assert.match(rules, /isSupervisor\(\)/);
});

test('firestore.rules blocks incomplete or uncleared work-order completion', () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  assert.ok(
    rules.includes("data.status != 'completed' || (data.safetyCleared == true && data.completedSteps == data.totalSteps)"),
    'Completed work orders must be safety-cleared and have every checklist step completed',
  );
});
