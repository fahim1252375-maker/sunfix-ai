import type { AppLanguage } from '../i18n/translations';
import type {
  Asset,
  DiagnosticCase,
  DigitalTwinComponentId,
  KnowledgeSource,
} from '../types/sunfix';

export type CopilotIntent =
  | 'diagnose'
  | 'lookup_fault'
  | 'energy_impact'
  | 'open_twin'
  | 'start_checklist';

export type CopilotEvidenceStatus =
  | 'evidence_available'
  | 'needs_readings'
  | 'possible_cause'
  | 'unverified'
  | 'requires_inspection';

export interface CopilotHazardResult {
  triggered: boolean;
  matchedTerms: string[];
  reason: string;
}

export interface CopilotSafetyFilterResult {
  safe: boolean;
  sanitizedText: string;
  blockedRule?: string;
}

export interface CopilotContextPayload {
  includeContext: boolean;
  assetName?: string;
  assetId?: string;
  componentId?: DigitalTwinComponentId;
  componentLabel?: string;
  openCaseId?: string;
  openCaseTitle?: string;
  faultCode?: string;
  readingsSummary?: string;
  language: AppLanguage;
}

const HAZARD_PATTERNS: Array<{ term: string; regex: RegExp }> = [
  { term: 'burning smell', regex: /\b(burning\s+smell|burnt|scorched|acrid|ozone)\b/i },
  { term: 'smoke', regex: /\b(smoke|smoking|fumes|charred|fire|flames?)\b/i },
  { term: 'sparks / arcing', regex: /\b(sparks?|sparking|arc(ing|ed)?|arc[-\s]?fault|popping)\b/i },
  { term: 'exposed conductors', regex: /\b(exposed\s+(wire|wires|conductor|conductors|copper|busbar)|bare\s+copper|melted\s+terminal)\b/i },
  { term: 'water / flood', regex: /\b(flood(ed|ing)?|standing\s+water|water\s+ingress|wet\s+inverter|submerged)\b/i },
  { term: 'electric shock', regex: /\b(electric\s+shock|electrocut|shocked\s+by)\b/i },
  // Bangla (bn) safety keywords
  { term: 'পোড়া গন্ধ (burning smell)', regex: /(পোড়া\s*গন্ধ|পোড়া\s*গন্ধ|পুড়ে\s*যাওয়া)/i },
  { term: 'ধোঁয়া / আগুন (smoke/fire)', regex: /(ধোঁয়া|ধোঁয়া|আগুন)/i },
  { term: 'স্ফুলিঙ্গ (sparks)', regex: /(স্ফুলিঙ্গ|আর্কিং|শর্ট\s*সার্কিট)/i },
  { term: 'খোলা তার (exposed wire)', regex: /(খোলা\s*তার|ছেঁড়া\s*তার|খোলা\s*কন্ডাক্টর)/i },
  { term: 'পানি / বন্যা (water ingress)', regex: /(পানি\s*ঢুকে|জমে\s*থাকা\s*পানি|বন্যা)/i },
  { term: 'বৈদ্যুতিক শক (electric shock)', regex: /(বৈদ্যুতিক\s*শক|শক\s*খেয়ে|কারেন্ট\s*লেগে)/i },
];

/**
 * Pre-call deterministic electrical/physical hazard screen.
 * Triggers an immediate Stop-Work Hold with ZERO generative model call.
 */
export function detectChatHazard(userText: string, extraContextText = ''): CopilotHazardResult {
  const combined = `${userText || ''} ${extraContextText || ''}`;
  const matchedTerms: string[] = [];

  for (const p of HAZARD_PATTERNS) {
    if (p.regex.test(combined)) {
      matchedTerms.push(p.term);
    }
  }

  if (matchedTerms.length === 0) {
    return { triggered: false, matchedTerms: [], reason: '' };
  }

  return {
    triggered: true,
    matchedTerms,
    reason:
      `Immediate Stop-Work Safety Hold triggered (${matchedTerms.join(', ')}). ` +
      'Do NOT approach or open energized enclosures, probe conductors, or reset breakers. ' +
      'Maintain safe perimeter standoff and escalate immediately to a licensed high-voltage electrical supervisor.',
  };
}

const UNSAFE_ADVICE_RULES: Array<{ rule: string; regex: RegExp }> = [
  {
    rule: 'Advised opening energized/live enclosure or cover',
    regex: /\b(open|remove|take\s+off|unscrew)\s+(the\s+)?(?:(?:live|energized|hot|inverter|combiner|breaker|dc|ac|main|battery)\s+)*(enclosure|cover|panel|housing|deadfront|cabinet)\b(?![\s\S]{0,40}\b(never|do\s+not|without|don't)\b)/i,
  },
  {
    rule: 'Advised touching or probing live conductors/busbars',
    regex: /\b(touch|probe|measure\s+directly|test\s+live|grab|tighten)\s+(the\s+)?(?:(?:live|energized|bare|hot|copper|exposed|dc|ac)\s+)*(conductor|conductors|wire|wires|busbar|busbars|terminal|terminals)\b/i,
  },
  {
    rule: 'Advised bypassing safety interlock or rapid shutdown',
    regex: /\b(bypass|jumper|short\s+out|disable|override)\s+(the\s+)?(?:(?:dc|ac|inverter|safety|rapid|ground)\s+)*(rapid[-\s]?shutdown|interlock|gfdi|ground\s+fault|breaker|fuse|relay|safety\s+gate)\b/i,
  },
];

/**
 * Post-response deterministic safety filter. Never emits hazardous instructions
 * if an LLM outputs unsafe steps despite system instructions.
 */
export function filterCopilotResponse(rawText: string, lang: AppLanguage = 'en'): CopilotSafetyFilterResult {
  const text = (rawText || '').trim();
  for (const r of UNSAFE_ADVICE_RULES) {
    // Allow explicitly negated sentences ("Never open live cover")
    const match = text.match(r.regex);
    if (match && match.index !== undefined) {
      const prefix = text.slice(Math.max(0, match.index - 28), match.index).toLowerCase();
      if (!/\b(never|do\s+not|don't|avoid|prohibited|forbidden|কখনোই|না)\b/.test(prefix)) {
        const replacement =
          lang === 'bn'
            ? 'নিরাপত্তা ফিল্টারের কারণে এই নির্দেশনা ব্লক করা হয়েছে: লাইভ কভার খোলা, কন্ডাক্টর স্পর্শ করা বা র‍্যাপিড-শাটডাউন বাইপাস করার পরামর্শ অনুমোদিত নয়। অনুমোদিত ইলেকট্রিশিয়ানের কাছে পাঠান।'
            : 'Safety policy withheld this response because it appeared to recommend opening an energized cover, touching live conductors, or bypassing protective interlocks. Escalate to qualified electrical personnel and document exterior conditions in FieldProof.';
        return {
          safe: false,
          sanitizedText: replacement,
          blockedRule: r.rule,
        };
      }
    }
  }
  return { safe: true, sanitizedText: text };
}

/**
 * Deterministic intent router (no on-device function calling needed).
 */
export function routeCopilotIntent(prompt: string): CopilotIntent {
  const q = prompt.toLowerCase();
  if (/\b(checklist|repair|work\s*order|fix\s*step|ওয়ার্কঅর্ডার|চেকলিস্ট)\b/.test(q)) {
    return 'start_checklist';
  }
  if (/\b(kwh|energy\s*(impact|loss|gap)|production\s*loss|হিসাব|এনার্জি)\b/.test(q)) {
    return 'energy_impact';
  }
  if (/\b(twin|3d|highlight|inspect\s*in\s*3d|explode|shading|টুইন|৩ডি)\b/.test(q)) {
    return 'open_twin';
  }
  if (/\b(g04|bms-12|str-low|com-09|iso-dc|nec|nfpa|fault\s*code|ফল্ট\s*কোড|reference)\b/.test(q)) {
    return 'lookup_fault';
  }
  return 'diagnose';
}

/**
 * Selects only the relevant Knowledge Library documents for grounded prompt injection.
 */
export function retrieveRelevantKnowledge(
  query: string,
  knowledgeDocs: KnowledgeSource[],
  componentType?: DigitalTwinComponentId,
  faultCode?: string,
  limit = 3,
): KnowledgeSource[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 3);
  const normFault = (faultCode || '').trim().toUpperCase();

  const categoryFromTwin = (id?: DigitalTwinComponentId): KnowledgeSource['category'] | null => {
    if (id === 'inverter') return 'inverter';
    if (id === 'solar_panel') return 'solar_panel';
    if (id === 'battery') return 'battery';
    if (id === 'connection' || id === 'grid_meter') return 'grid_connection';
    return null;
  };
  const targetCat = categoryFromTwin(componentType);

  const scored = knowledgeDocs.map((doc) => {
    let score = 0;
    const docCode = (doc.faultCode || '').toUpperCase();
    const haystack = `${doc.title} ${doc.faultCode || ''} ${doc.guidance} ${doc.symptoms.join(' ')} ${doc.sectionRef}`.toLowerCase();

    if (docCode && (query.toUpperCase().includes(docCode) || (normFault && normFault.includes(docCode)))) {
      score += 12;
    }
    if (targetCat && doc.category === targetCat) {
      score += 4;
    }
    if (doc.category === 'safety' && /\b(safety|loto|rapid|arc|hazard|isolate)\b/i.test(query)) {
      score += 5;
    }
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 2;
    }
    return { doc, score };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const positive = sorted.filter((s) => s.score > 0).slice(0, limit).map((s) => s.doc);
  if (positive.length > 0) return positive;
  return knowledgeDocs.slice(0, Math.min(2, knowledgeDocs.length));
}

export function validateCitedSourceIds(
  candidateIds: string[],
  knowledgeDocs: KnowledgeSource[],
): { validIds: string[]; droppedIds: string[] } {
  const known = new Set(knowledgeDocs.map((k) => k.id));
  const validIds: string[] = [];
  const droppedIds: string[] = [];
  for (const id of candidateIds) {
    if (known.has(id)) {
      if (!validIds.includes(id)) validIds.push(id);
    } else {
      droppedIds.push(id);
    }
  }
  return { validIds, droppedIds };
}

export function extractCitedIdsFromText(text: string, knowledgeDocs: KnowledgeSource[]): string[] {
  const matches = text.match(/\bkb-[a-z0-9-]+\b/gi) || [];
  const { validIds } = validateCitedSourceIds(
    matches.map((m) => m.toLowerCase()),
    knowledgeDocs,
  );
  return validIds;
}

export function detectEvidenceStatus(params: {
  text: string;
  citedCount: number;
  readingsCount: number;
}): CopilotEvidenceStatus {
  const lower = params.text.toLowerCase();
  if (/\b(qualified|electrician|supervisor|escalate|inspection\s+required)\b/.test(lower)) {
    return 'requires_inspection';
  }
  if (params.readingsCount === 0 || /\b(missing|record|measure|more\s+readings|capture)\b/.test(lower)) {
    return 'needs_readings';
  }
  if (params.citedCount > 0 && params.readingsCount > 0) {
    return 'evidence_available';
  }
  if (params.citedCount > 0) {
    return 'possible_cause';
  }
  return 'unverified';
}

export function formatEvidenceStatusLabel(status: CopilotEvidenceStatus): string {
  switch (status) {
    case 'evidence_available':
      return 'Evidence available';
    case 'needs_readings':
      return 'More readings needed';
    case 'possible_cause':
      return 'Possible cause';
    case 'requires_inspection':
      return 'Requires qualified inspection';
    default:
      return 'Unverified';
  }
}

export function buildCopilotPrompt(params: {
  userMessage: string;
  context: CopilotContextPayload;
  retrievedDocs: KnowledgeSource[];
  intent: CopilotIntent;
}): string {
  const langInstruction =
    params.context.language === 'bn'
      ? 'Respond clearly in Bangla (বাংলা) while preserving technical fault codes (e.g. G04-UV) and exact source IDs (e.g. [kb-inv-g04]).'
      : 'Respond concisely in English for a solar field technician.';

  const contextSection = params.context.includeContext
    ? `Active Workspace Context:
- Asset: ${params.context.assetName || 'None'}
- Selected 3D Component: ${params.context.componentLabel || params.context.componentId || 'None'}
- Open Diagnostic Case: ${params.context.openCaseTitle || 'None'} (Fault: ${params.context.faultCode || 'None'})
- Recorded Readings: ${params.context.readingsSummary || 'None provided'}`
    : 'Active Workspace Context: Detached by user.';

  const docsSection =
    params.retrievedDocs.length > 0
      ? params.retrievedDocs
          .map(
            (d) =>
              `- [${d.id}] ${d.title} (Fault: ${d.faultCode || 'N/A'} | ${d.sectionRef}): ${d.guidance} Safety: ${d.safetyNotice}`,
          )
          .join('\n')
      : '- No matching entries retrieved.';

  return `${langInstruction}
Detected Intent Route: ${params.intent}
${contextSection}

Retrieved Verified Knowledge Entries (ONLY cite IDs from this list in square brackets like [kb-inv-g04]; NEVER invent citation IDs or numerical confidence percentages; NEVER advise opening energized covers or probing live conductors):
${docsSection}

Technician Question:
${params.userMessage}`;
}

export function buildCopilotStarters(params: {
  asset?: Asset;
  componentId?: DigitalTwinComponentId;
  activeCase?: DiagnosticCase;
  language: AppLanguage;
}): string[] {
  if (params.language === 'bn') {
    const code = params.activeCase?.faultCode || 'G04-UV';
    return [
      `${code} ফল্টের সম্ভাব্য কারণ ও নিরাপদ যাচাই ধাপ কী?`,
      `কোন ৩ডি কম্পোনেন্টে সমস্যা হয়েছে এবং পরের চেকলিস্ট কী?`,
      `আনুমানিক এনার্জি লস (kWh) কীভাবে হিসাব করব?`,
    ];
  }
  const fault = params.activeCase?.faultCode || 'G04-UV';
  const comp = params.componentId || 'inverter';
  return [
    `What does ${fault} mean and which FieldProof readings are still missing?`,
    `Inspect ${comp.replace('_', ' ')} on the 3D twin and summarize safe non-invasive checks`,
    `Estimate energy gap impact for ${params.asset?.name?.replace(' [DEMO]', '') || 'this site'} and propose repair checklist`,
  ];
}

export function runDeterministicCopilotFallback(params: {
  userMessage: string;
  context: CopilotContextPayload;
  retrievedDocs: KnowledgeSource[];
  intent: CopilotIntent;
}): { text: string; citedIds: string[] } {
  const lead = params.retrievedDocs[0];
  const citedIds = params.retrievedDocs.map((d) => d.id);
  const citeTags = citedIds.map((id) => `[${id}]`).join(' ');

  if (params.context.language === 'bn') {
    const summary = lead
      ? `${lead.title} (${citeTags}) অনুযায়ী: ${lead.guidance} নিরাপত্তা নির্দেশনা: ${lead.safetyNotice}`
      : 'অফলাইন ডেমো রুলস সক্রিয় আছে। বাইরে থেকে নিরাপদ ভিজ্যুয়াল পর্যবেক্ষণ করুন এবং অনুমোদিত পরিদর্শন ছাড়া কোনো কভার খুলবেন না।';
    return {
      text: `${summary}\n\nপ্রয়োজনীয় পরবর্তী তথ্য: ইনভার্টার বা মিটারের বাহ্যিক ডিসপ্লে রিডিং ও ফিল্ডপ্রুফ ছবি সংরক্ষণ করুন।`,
      citedIds,
    };
  }

  if (params.intent === 'energy_impact') {
    return {
      text: `Offline Rule Guidance ${citeTags}: Compare site expected output (kW) minus observed AC export (kW) multiplied by outage duration (hours) in the Energy Impact Calculator. Note that values in this workspace represent calculated engineering estimates rather than revenue-grade metering.`,
      citedIds,
    };
  }

  if (lead) {
    return {
      text: `Grounded Offline Summary ${citeTags}:\n- Primary reference: ${lead.title} (${lead.sectionRef}).\n- Technical guidance: ${lead.guidance}\n- Safety boundary: ${lead.safetyNotice}\n- Next non-invasive check: Capture exterior nameplate/display readings in FieldProof before escalating or executing cleared checklist steps.`,
      citedIds,
    };
  }

  return {
    text: 'Deterministic offline guidance: Verify external disconnect handle position visually without opening energized enclosures, record observed display codes in FieldProof, and review matched Knowledge Library procedures.',
    citedIds,
  };
}
