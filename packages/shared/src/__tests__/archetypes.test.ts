import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES,
  ARCHETYPE_SLUGS,
  getArchetype,
  getQuestion,
  getNextStep,
  getQuestionCount,
} from '../archetypes';
import type { ArchetypeQuestion } from '../types';

// ============================================================
// Registry completeness
// ============================================================

describe('Archetype registry', () => {
  it('has exactly 5 archetypes registered', () => {
    expect(Object.keys(ARCHETYPES).length).toBe(5);
  });

  it('ARCHETYPE_SLUGS has exactly 5 slugs', () => {
    expect(ARCHETYPE_SLUGS.length).toBe(5);
  });

  it('all slug entries match ARCHETYPES keys', () => {
    for (const slug of ARCHETYPE_SLUGS) {
      expect(ARCHETYPES).toHaveProperty(slug);
    }
  });

  it('contains all expected archetypes', () => {
    const expected = [
      'indie_software',
      'ai_built_app',
      'mobile_game',
      'wedding_event',
      'home_renovation',
    ];
    for (const slug of expected) {
      expect(ARCHETYPES).toHaveProperty(slug);
    }
  });
});

// ============================================================
// Each archetype has >25 questions
// ============================================================

describe('Each archetype has >25 questions', () => {
  for (const slug of ARCHETYPE_SLUGS) {
    it(`${slug} has more than 25 questions`, () => {
      const archetype = ARCHETYPES[slug];
      expect(archetype.questions.length).toBeGreaterThan(25);
    });
  }
});

// ============================================================
// Question structure validation
// ============================================================

describe('Question structure — required fields', () => {
  const requiredQuestionFields: (keyof ArchetypeQuestion)[] = [
    'key',
    'type',
    'question',
    'stage',
    'required',
  ];

  for (const slug of ARCHETYPE_SLUGS) {
    describe(`${slug}`, () => {
      const archetype = ARCHETYPES[slug];

      it('every question has required fields', () => {
        for (let i = 0; i < archetype.questions.length; i++) {
          const q = archetype.questions[i];
          for (const field of requiredQuestionFields) {
            expect(
              q,
              `Question ${i} ("${q.key}") is missing field "${field}"`,
            ).toHaveProperty(field);
          }
        }
      });

      it('every question key is a non-empty string', () => {
        for (const q of archetype.questions) {
          expect(typeof q.key).toBe('string');
          expect(q.key.length).toBeGreaterThan(0);
        }
      });

      it('every question has a valid QuestionType', () => {
        const validTypes = [
          'open_text',
          'single_select',
          'multi_select',
          'numeric',
          'range',
          'archetype_confirm',
          'reality_check_response',
        ];
        for (const q of archetype.questions) {
          expect(
            validTypes,
            `Question "${q.key}" has invalid type "${q.type}"`,
          ).toContain(q.type);
        }
      });

      it('every question has a stage with number and label', () => {
        for (const q of archetype.questions) {
          expect(typeof q.stage.number).toBe('number');
          expect(q.stage.number).toBeGreaterThan(0);
          expect(typeof q.stage.label).toBe('string');
          expect(q.stage.label.length).toBeGreaterThan(0);
        }
      });

      it('every question has a boolean "required" field', () => {
        for (const q of archetype.questions) {
          expect(typeof q.required).toBe('boolean');
        }
      });

      it('question keys are unique within the archetype', () => {
        const keys = archetype.questions.map((q) => q.key);
        const unique = new Set(keys);
        expect(unique.size).toBe(keys.length);
      });

      it('select-type questions have options array', () => {
        const selectTypes = ['single_select', 'multi_select', 'archetype_confirm'];
        for (const q of archetype.questions) {
          if (selectTypes.includes(q.type)) {
            expect(
              Array.isArray(q.options),
              `Question "${q.key}" of type "${q.type}" should have options`,
            ).toBe(true);
            expect(
              q.options!.length,
              `Question "${q.key}" should have at least 2 options`,
            ).toBeGreaterThanOrEqual(2);

            // Each option should have value and label
            for (const opt of q.options!) {
              expect(typeof opt.value).toBe('string');
              expect(opt.value.length).toBeGreaterThan(0);
              expect(typeof opt.label).toBe('string');
              expect(opt.label.length).toBeGreaterThan(0);
            }
          }
        }
      });
    });
  }
});

// ============================================================
// Archetype definition structure
// ============================================================

describe('Archetype definition structure', () => {
  for (const slug of ARCHETYPE_SLUGS) {
    describe(`${slug}`, () => {
      const archetype = ARCHETYPES[slug];

      it('slug matches registry key', () => {
        expect(archetype.slug).toBe(slug);
      });

      it('has a non-empty name', () => {
        expect(typeof archetype.name).toBe('string');
        expect(archetype.name.length).toBeGreaterThan(0);
      });

      it('has a valid category', () => {
        const validCategories = ['software', 'creator', 'physical', 'event', 'service'];
        expect(validCategories).toContain(archetype.category);
      });

      it('has a positive scriptVersion', () => {
        expect(archetype.scriptVersion).toBeGreaterThanOrEqual(1);
      });

      it('has a non-empty expertPersona', () => {
        expect(archetype.expertPersona.length).toBeGreaterThan(50);
      });

      it('has a positive estimatedMinutes', () => {
        expect(archetype.estimatedMinutes).toBeGreaterThan(0);
      });

      it('has a non-empty iconName', () => {
        expect(archetype.iconName.length).toBeGreaterThan(0);
      });

      it('has a non-empty description', () => {
        expect(archetype.description.length).toBeGreaterThan(20);
      });

      it('has non-empty artifactTypes array', () => {
        expect(archetype.artifactTypes.length).toBeGreaterThan(0);
      });

      it('has non-empty artifactGenerationOrder array', () => {
        expect(archetype.artifactGenerationOrder.length).toBeGreaterThan(0);
      });

      it('artifactGenerationOrder contains the same items as artifactTypes', () => {
        const types = new Set(archetype.artifactTypes);
        const order = new Set(archetype.artifactGenerationOrder);
        expect(types.size).toBe(order.size);
        for (const t of types) {
          expect(order.has(t)).toBe(true);
        }
      });
    });
  }
});

// ============================================================
// Helper functions
// ============================================================

describe('getArchetype()', () => {
  it('returns the archetype for a valid slug', () => {
    const result = getArchetype('indie_software');
    expect(result.slug).toBe('indie_software');
  });

  it('throws for an unknown slug', () => {
    expect(() => getArchetype('nonexistent')).toThrow('Unknown archetype slug');
  });
});

describe('getQuestion()', () => {
  it('returns the first question for step 0', () => {
    const q = getQuestion('indie_software', 0);
    expect(q.key).toBeDefined();
    expect(q.question).toBeDefined();
  });

  it('throws for an out-of-range step index', () => {
    expect(() => getQuestion('indie_software', 9999)).toThrow('out of range');
  });
});

describe('getQuestionCount()', () => {
  it('returns the correct count for each archetype', () => {
    for (const slug of ARCHETYPE_SLUGS) {
      const count = getQuestionCount(slug);
      expect(count).toBe(ARCHETYPES[slug].questions.length);
    }
  });
});

describe('getNextStep()', () => {
  it('returns the next sequential step when no branching', () => {
    const next = getNextStep('indie_software', 0, {});
    expect(next).toBe(1);
  });

  it('returns -1 when at the last question', () => {
    const archetype = ARCHETYPES['indie_software'];
    const lastIndex = archetype.questions.length - 1;
    const next = getNextStep('indie_software', lastIndex, {});
    expect(next).toBe(-1);
  });

  it('returns a valid index (>= -1) for every step in every archetype', () => {
    for (const slug of ARCHETYPE_SLUGS) {
      const archetype = ARCHETYPES[slug];
      for (let i = 0; i < archetype.questions.length; i++) {
        const next = getNextStep(slug, i, {});
        expect(next).toBeGreaterThanOrEqual(-1);
        if (next !== -1) {
          expect(next).toBeLessThan(archetype.questions.length);
        }
      }
    }
  });

  it('handles branching logic when branchOn returns a question key', () => {
    // Find a question with branchOn in any archetype
    let foundBranch = false;
    for (const slug of ARCHETYPE_SLUGS) {
      const archetype = ARCHETYPES[slug];
      for (let i = 0; i < archetype.questions.length; i++) {
        const q = archetype.questions[i];
        if (q.branchOn) {
          foundBranch = true;
          // branchOn should return a string (question key) or 'end'
          const result = q.branchOn({});
          expect(
            typeof result === 'string',
            `branchOn for "${slug}/${q.key}" should return a string`,
          ).toBe(true);
        }
      }
    }
    // This test is informational — it is OK if no archetypes use branching
    if (!foundBranch) {
      expect(true).toBe(true); // no-op pass
    }
  });
});
