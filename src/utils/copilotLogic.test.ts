import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_KNOWLEDGE_LIBRARY } from '../data/demoData';
import {
  buildCopilotPrompt,
  detectChatHazard,
  detectEvidenceStatus,
  filterCopilotResponse,
  retrieveRelevantKnowledge,
  routeCopilotIntent,
  validateCitedSourceIds,
} from './copilotLogic';

test('detectChatHazard triggers Stop-Work Hold immediately on English and Bangla safety keywords', () => {
  const enHazard = detectChatHazard('I notice a strong burning smell and sparks near the combiner');
  assert.equal(enHazard.triggered, true);
  assert.ok(enHazard.matchedTerms.includes('burning smell'));
  assert.ok(enHazard.matchedTerms.includes('sparks / arcing'));

  const bnHazard = detectChatHazard('ইনভার্টারের পাশে পোড়া গন্ধ এবং ধোঁয়া দেখা যাচ্ছে');
  assert.equal(bnHazard.triggered, true);

  const safe = detectChatHazard('What does fault G04-UV indicate on the LCD display?');
  assert.equal(safe.triggered, false);
});

test('filterCopilotResponse blocks advice to open live covers or bypass rapid shutdown', () => {
  const unsafe = filterCopilotResponse('Step 1: Open the live inverter cover and probe the bare copper busbar.');
  assert.equal(unsafe.safe, false);
  assert.match(unsafe.sanitizedText, /Safety policy withheld/i);

  const safeNegation = filterCopilotResponse('Never open the live inverter cover. Inspect the external AC disconnect handle visually.');
  assert.equal(safeNegation.safe, true);
});

test('routeCopilotIntent classifies technician prompts deterministically', () => {
  assert.equal(routeCopilotIntent('Calculate kWh energy loss impact for 4 hours'), 'energy_impact');
  assert.equal(routeCopilotIntent('Highlight inverter component in the 3D twin'), 'open_twin');
  assert.equal(routeCopilotIntent('Start repair checklist for this work order'), 'start_checklist');
  assert.equal(routeCopilotIntent('Look up fault code G04-UV'), 'lookup_fault');
  assert.equal(routeCopilotIntent('Why is output 0 kW today?'), 'diagnose');
});

test('retrieveRelevantKnowledge and validateCitedSourceIds filter unknown citations', () => {
  const retrieved = retrieveRelevantKnowledge('G04-UV grid undervoltage inverter', DEMO_KNOWLEDGE_LIBRARY, 'inverter', 'G04-UV');
  assert.ok(retrieved.some((d) => d.id === 'kb-inv-g04'));

  const check = validateCitedSourceIds(['kb-inv-g04', 'fake-hallucinated-99'], DEMO_KNOWLEDGE_LIBRARY);
  assert.deepEqual(check.validIds, ['kb-inv-g04']);
  assert.deepEqual(check.droppedIds, ['fake-hallucinated-99']);
});

test('buildCopilotPrompt includes context when attached and omits when detached', () => {
  const retrieved = retrieveRelevantKnowledge('G04-UV', DEMO_KNOWLEDGE_LIBRARY, 'inverter', 'G04-UV');
  const attachedPrompt = buildCopilotPrompt({
    userMessage: 'Check inverter fault',
    retrievedDocs: retrieved,
    intent: 'diagnose',
    context: {
      includeContext: true,
      assetName: 'Mesa Ridge 48 kW',
      componentId: 'inverter',
      faultCode: 'G04-UV',
      language: 'en',
    },
  });
  assert.match(attachedPrompt, /Mesa Ridge 48 kW/);
  assert.match(attachedPrompt, /kb-inv-g04/);

  const detachedPrompt = buildCopilotPrompt({
    userMessage: 'Check inverter fault',
    retrievedDocs: retrieved,
    intent: 'diagnose',
    context: {
      includeContext: false,
      assetName: 'Mesa Ridge 48 kW',
      language: 'en',
    },
  });
  assert.doesNotMatch(detachedPrompt, /Mesa Ridge 48 kW/);
});

test('detectEvidenceStatus returns qualitative evidence classifications without confidence percentages', () => {
  assert.equal(detectEvidenceStatus({ text: 'Verified reading matches G04-UV', citedCount: 1, readingsCount: 2 }), 'evidence_available');
  assert.equal(detectEvidenceStatus({ text: 'Escalate to qualified electrician', citedCount: 1, readingsCount: 1 }), 'requires_inspection');
  assert.equal(detectEvidenceStatus({ text: 'General check', citedCount: 0, readingsCount: 0 }), 'needs_readings');
});
