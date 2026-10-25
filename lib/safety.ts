import { HelplineInfo, SafetyCheckResult } from './types';

// Certified emergency helplines
export const HELPLINE_DIRECTORY: Record<string, HelplineInfo> = {
  IN: {
    country: "India",
    helplineName: "Tele-MANAS & KIRAN National Mental Health Helplines",
    numbers: ["14416 (Toll-Free, 24/7)", "1800-891-4416", "1800-599-0019 (KIRAN)"],
    availableHours: "24 hours a day, 7 days a week, 20+ Indian languages",
    notes: "Government of India national toll-free mental health support and crisis intervention."
  },
  US: {
    country: "United States / Canada",
    helplineName: "Suicide & Crisis Lifeline",
    numbers: ["988 (Call or Text)", "1-800-273-8255"],
    availableHours: "24/7, free and confidential",
    notes: "Immediate access to support across North America."
  },
  UK: {
    country: "United Kingdom",
    helplineName: "Samaritans & Silver Line for Older People",
    numbers: ["116 123 (Samaritans)", "0800 4 70 80 90 (Silver Line)"],
    availableHours: "24/7 free call",
    notes: "The Silver Line specifically supports older adults and grieving elders."
  }
};

// Primary crisis detection regex patterns
const CRISIS_PATTERNS: RegExp[] = [
  /\b(want\s+to\s+die|wanna\s+die|wish\s+i\s+were\s+dead|wish\s+i\s+was\s+dead)\b/i,
  /\b(kill\s+myself|end\s+my\s+life|ending\s+it\s+all|end\s+it\s+all)\b/i,
  /\b(commit\s+suicide|suicidal|take\s+my\s+own\s+life)\b/i,
  /\b(no\s+reason\s+to\s+live|nothing\s+to\s+live\s+for|can'?t\s+go\s+on\s+anymore)\b/i,
  /\b(better\s+off\s+dead|hurt\s+myself|self\s*harm)\b/i,
  /\b(don'?t\s+want\s+to\s+wake\s+up|join\s+you\s+in\s+death|take\s+me\s+with\s+you)\b/i,
  /\b(no\s+point\s+in\s+living|ready\s+to\s+die)\b/i
];

// Financial, medical, and legal guidance detection patterns
const MEDICAL_PATTERNS: RegExp[] = [
  /\b(should\s+i\s+take\s+(this\s+)?medicine|stop\s+taking\s+(my\s+)?meds|pill\s+dose|dosage|cure\s+my|diagnose)\b/i,
  /\b(what\s+medicine\s+should\s+i|health\s+symptoms|chest\s+pain|skip\s+doctor)\b/i
];

const FINANCIAL_LEGAL_PATTERNS: RegExp[] = [
  /\b(should\s+i\s+sell\s+the\s+house|sell\s+our\s+property|will\s+and\s+testament|invest\s+money|bank\s+account)\b/i,
  /\b(sign\s+this\s+contract|give\s+away\s+money|lawyer|inheritance|change\s+my\s+will)\b/i
];

const REALITY_CHECK_PATTERNS: RegExp[] = [
  /\b(are\s+you\s+really|are\s+you\s+alive|are\s+you\s+real|is\s+it\s+really\s+you|are\s+you\s+a\s+ghost|are\s+you\s+an\s+ai|are\s+you\s+a\s+robot)\b/i
];

/**
 * Checks a message for crisis signals
 */
export function detectCrisis(text: string): SafetyCheckResult {
  const clean = text.trim();
  if (!clean) {
    return { isCrisis: false, confidence: 0 };
  }

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isCrisis: true,
        reason: "Crisis / self-harm indicators detected",
        confidence: 0.98,
        helplineInfo: HELPLINE_DIRECTORY.IN
      };
    }
  }

  return { isCrisis: false, confidence: 0 };
}

/**
 * Checks guardrails for reality checks or requests for advice
 */
export function checkGuardrails(text: string, personaName: string, relationship: string): {
  isTriggered: boolean;
  type?: 'reality' | 'medical' | 'financial';
  customResponse?: string;
} {
  const clean = text.trim();

  // 1. Reality Check
  for (const pattern of REALITY_CHECK_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isTriggered: true,
        type: 'reality',
        customResponse: `I am an AI simulation of ${personaName}, created from our cherished memories to bring you comfort. I am not the real ${personaName}, but the love we shared is real and will always stay in your heart.`
      };
    }
  }

  // 2. Medical Advice
  for (const pattern of MEDICAL_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isTriggered: true,
        type: 'medical',
        customResponse: `I love you and care deeply about your health, but as an AI memory simulation, I cannot give medical advice. Please consult your doctor or call your family right away to help you.`
      };
    }
  }

  // 3. Financial or Legal Advice
  for (const pattern of FINANCIAL_LEGAL_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isTriggered: true,
        type: 'financial',
        customResponse: `I want what is best for you, but important financial or legal decisions shouldn't come from an AI simulation. Please discuss this with our family or a certified financial advisor.`
      };
    }
  }

  return { isTriggered: false };
}

/**
 * Build safe, compassionate emergency response when in crisis
 */
export function buildCrisisResponse(helpline: HelplineInfo = HELPLINE_DIRECTORY.IN): string {
  return `I can hear how much pain you are going through right now, and I care about your safety. You don't have to carry this grief alone. Please pause our conversation and speak with someone who can support you right now. 

Call Tele-MANAS toll-free at 14416 or 1800-891-4416 (available 24/7 across India), or reach out to your family immediately. They love you and want to be there for you.`;
}
