// ============================================================
// Jetdale — Discovery Questions (shared between marketing & portal)
// ============================================================

export type QType = 'open_text' | 'single_select' | 'multi_select';

export interface DiscoveryQuestion {
  key: string;
  stage: string;
  stageNum: string;
  title: string;
  helper: string;
  type: QType;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export const QUESTIONS: DiscoveryQuestion[] = [
  {
    key: 'spark',
    stage: 'The Spark',
    stageNum: '01',
    title: 'In one sentence, what are you building?',
    helper: "Don\u2019t overthink it. Just describe the thing. You can speak it instead of typing \u2014 we\u2019ll handle the rest.",
    type: 'open_text',
    placeholder: 'I want to build an app that helps dog owners find sitters in their neighborhood...',
  },
  {
    key: 'audience',
    stage: 'Target Audience',
    stageNum: '02',
    title: 'Who is this for?',
    helper: 'Describe your ideal user. Be specific \u2014 age, role, situation, pain level.',
    type: 'open_text',
    placeholder: 'Busy professionals aged 25-40 who travel frequently and need reliable pet care...',
  },
  {
    key: 'problem',
    stage: 'The Problem',
    stageNum: '03',
    title: 'What problem does it solve?',
    helper: 'Why does this matter? What happens if this problem stays unsolved?',
    type: 'open_text',
    placeholder: 'Finding a trustworthy pet sitter takes hours of research and phone calls...',
  },
  {
    key: 'competition',
    stage: 'Competition',
    stageNum: '04',
    title: 'What similar products or solutions exist?',
    helper: "Competitors, workarounds, or the way people solve this today. It\u2019s OK to say \u201cI don\u2019t know.\u201d",
    type: 'open_text',
    placeholder: 'Rover, Wag, asking neighbors, Facebook groups...',
  },
  {
    key: 'differentiator',
    stage: 'Differentiator',
    stageNum: '05',
    title: "What\u2019s the ONE thing that makes yours different?",
    helper: 'If you could only say one thing at a dinner party, what makes this worth building?',
    type: 'open_text',
    placeholder: 'Neighborhood-first matching \u2014 sitters within walking distance, verified by your own community...',
  },
  {
    key: 'platform',
    stage: 'Platform',
    stageNum: '06',
    title: 'What platform(s) will this run on?',
    helper: 'Pick all that apply.',
    type: 'multi_select',
    options: [
      { value: 'web', label: 'Web app' },
      { value: 'ios', label: 'iOS' },
      { value: 'android', label: 'Android' },
      { value: 'desktop', label: 'Desktop' },
      { value: 'all', label: 'All of the above' },
    ],
  },
  {
    key: 'monetization',
    stage: 'Business Model',
    stageNum: '07',
    title: 'How will you make money?',
    helper: 'Pick the closest model. You can refine later.',
    type: 'single_select',
    options: [
      { value: 'subscription', label: 'Subscription (monthly/annual)' },
      { value: 'one_time', label: 'One-time purchase' },
      { value: 'freemium', label: 'Freemium (free + paid tier)' },
      { value: 'ads', label: 'Advertising' },
      { value: 'commission', label: 'Marketplace commission' },
      { value: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    key: 'budget',
    stage: 'Budget',
    stageNum: '08',
    title: "What\u2019s your budget range?",
    helper: 'Total budget for building the first version.',
    type: 'single_select',
    options: [
      { value: 'under_1k', label: 'Under $1,000' },
      { value: '1k_5k', label: '$1,000 \u2013 $5,000' },
      { value: '5k_20k', label: '$5,000 \u2013 $20,000' },
      { value: '20k_50k', label: '$20,000 \u2013 $50,000' },
      { value: '50k_plus', label: '$50,000+' },
      { value: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    key: 'timeline',
    stage: 'Timeline',
    stageNum: '09',
    title: 'When do you need this ready?',
    helper: 'A realistic launch timeline for a first version.',
    type: 'single_select',
    options: [
      { value: '1_month', label: '1 month' },
      { value: '3_months', label: '3 months' },
      { value: '6_months', label: '6 months' },
      { value: '12_months', label: '12 months' },
      { value: 'no_rush', label: 'No rush' },
    ],
  },
  {
    key: 'technical',
    stage: 'Technical Background',
    stageNum: '10',
    title: "What\u2019s your technical background?",
    helper: 'This shapes the tools and approach we recommend.',
    type: 'single_select',
    options: [
      { value: 'non_technical', label: 'Non-technical' },
      { value: 'some_coding', label: 'Some coding experience' },
      { value: 'developer', label: 'Developer' },
      { value: 'tech_lead', label: 'Technical lead / architect' },
    ],
  },
  {
    key: 'team',
    stage: 'Team',
    stageNum: '11',
    title: "Who\u2019s building this?",
    helper: 'Your current team situation.',
    type: 'single_select',
    options: [
      { value: 'solo', label: 'Just me' },
      { value: 'small_team', label: 'Small team (2\u20135)' },
      { value: 'team', label: 'Team (5\u201320)' },
      { value: 'looking', label: 'Looking for co-founder' },
    ],
  },
  {
    key: 'concern',
    stage: 'Risks',
    stageNum: '12',
    title: "What\u2019s your biggest concern about this project?",
    helper: 'Be honest. This is where the reality check starts.',
    type: 'open_text',
    placeholder: "I\u2019m worried I\u2019ll run out of money before getting traction...",
  },
];

export const TOTAL = QUESTIONS.length;

/** Derive a project archetype label from the discovery answers. */
export function inferArchetype(answers: Record<string, string>): string {
  const platform = (answers.platform || '').toLowerCase();
  const monetization = (answers.monetization || '').toLowerCase();
  const team = (answers.team || '').toLowerCase();
  const budget = (answers.budget || '').toLowerCase();

  // Marketplace
  if (monetization.includes('commission') || monetization.includes('marketplace')) {
    return 'Marketplace platform';
  }

  // SaaS
  if (monetization.includes('subscription') && platform.includes('web')) {
    return 'SaaS product';
  }

  // Mobile app
  const isMobile = platform.includes('ios') || platform.includes('android');
  const isWebOnly = platform.includes('web') && !isMobile;

  if (isMobile && !platform.includes('web')) {
    return 'Mobile app';
  }

  if (platform.includes('all')) {
    return 'Cross-platform product';
  }

  // Enterprise
  if (
    (team.includes('5–20') || team.includes('team')) &&
    (budget.includes('$50,000') || budget.includes('$20,000'))
  ) {
    return 'Enterprise software';
  }

  // Consumer app (freemium or ads)
  if (monetization.includes('freemium') || monetization.includes('advertising')) {
    return isMobile ? 'Consumer mobile app' : 'Consumer web app';
  }

  // Desktop
  if (platform.includes('desktop') && !isMobile && !platform.includes('web')) {
    return 'Desktop application';
  }

  // Web + mobile combo
  if (isMobile && platform.includes('web')) {
    return 'Web & mobile product';
  }

  // Solo / indie
  if (team.includes('just me') || team.includes('co-founder')) {
    return isWebOnly ? 'Indie web product' : 'Indie software product';
  }

  return 'Software product';
}
