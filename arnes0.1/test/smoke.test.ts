import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTranscript } from '../src/api/types.ts';

test('smoke: type stripping runs .ts tests', () => {
  assert.equal(typeof renderTranscript, 'function');
});
