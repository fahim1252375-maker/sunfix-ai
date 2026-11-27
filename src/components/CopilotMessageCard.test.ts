import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEMO_KNOWLEDGE_LIBRARY } from '../data/demoData';
import type { CopilotMessage } from '../types/sunfix';
import { CopilotMessageCard } from './CopilotMessageCard';

test('CopilotMessageCard renders Stop-Work Hold card with zero fake confidence %', () => {
  const msg: CopilotMessage = {
    id: 'm1',
    role: 'assistant',
    text: 'Immediate Stop-Work Safety Hold triggered (burning smell). Do NOT open enclosures.',
    timestamp: '2026-11-25T10:00:00.000Z',
    inferenceSource: 'demo_rules',
    evidenceStatus: 'requires_inspection',
    stopWorkHold: true,
    citedSourceIds: ['kb-safety-stopwork'],
    actions: [
      { id: 'act-1', label: 'Add FieldProof photo', actionType: 'add_fieldproof' },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(CopilotMessageCard, {
      message: msg,
      knowledgeDocs: DEMO_KNOWLEDGE_LIBRARY,
      language: 'en',
    }),
  );

  assert.match(html, /copilot-stop-work-card/);
  assert.match(html, /Immediate Stop-Work Safety Hold/);
  assert.match(html, /DEMO RULES/);
  assert.match(html, /Requires qualified inspection/);
  assert.match(html, /Add FieldProof photo/);
  assert.doesNotMatch(html, /\d+%\s*confidence/i);
});

test('CopilotMessageCard renders LOCAL / CLOUD badges, citation chips, and action chips', () => {
  const msg: CopilotMessage = {
    id: 'm2',
    role: 'assistant',
    text: 'Check exterior LCD display for G04-UV [kb-inv-g04].',
    timestamp: '2026-11-25T10:01:00.000Z',
    inferenceSource: 'in_cloud',
    modelName: 'gemini-2.5-flash',
    evidenceStatus: 'evidence_available',
    citedSourceIds: ['kb-inv-g04'],
    actions: [
      {
        id: 'act-3d',
        label: 'Highlight component in 3D',
        actionType: 'highlight_3d',
        targetComponentId: 'inverter',
      },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(CopilotMessageCard, {
      message: msg,
      knowledgeDocs: DEMO_KNOWLEDGE_LIBRARY,
      language: 'en',
    }),
  );

  assert.match(html, /CLOUD/);
  assert.match(html, /Evidence available/);
  assert.match(html, /kb-inv-g04/);
  assert.match(html, /Highlight component in 3D/);
});

test('CopilotMessageCard keeps an unreported Firebase inference source distinct from demo rules', () => {
  const msg: CopilotMessage = {
    id: 'm3',
    role: 'assistant',
    text: 'Source attribution is unavailable.',
    timestamp: '2026-11-25T10:02:00.000Z',
    inferenceSource: 'unavailable',
    evidenceStatus: 'needs_readings',
    citedSourceIds: [],
    actions: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(CopilotMessageCard, {
      message: msg,
      knowledgeDocs: DEMO_KNOWLEDGE_LIBRARY,
      language: 'en',
    }),
  );

  assert.match(html, /UNAVAILABLE/);
  assert.doesNotMatch(html, /DEMO RULES/);
});
