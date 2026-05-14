import type { ArchetypeDefinition } from '../types';

export const aiBuiltApp: ArchetypeDefinition = {
  slug: 'ai_built_app',
  name: 'App Built with AI Builders',
  category: 'software',
  scriptVersion: 1,
  expertPersona:
    'You are a product designer who transitioned into AI-assisted development. You have shipped 6 apps using Lowable, Cursor, and Claude Code. You understand the gap between "I got a demo working" and "I have a product people pay for." You help people think before they prompt.',
  estimatedMinutes: 35,
  iconName: 'wand-sparkles',
  description:
    'For people building web or mobile apps using AI coding tools like Lovable, Cursor, Claude Code, Bolt, Replit, or v0. This script helps you go from idea to a real product plan before you start prompting.',
  questions: [
    // ---------------------------------------------------------------
    // Stage 1 — The Spark (Questions 1-3)
    // ---------------------------------------------------------------
    {
      key: 'idea_pitch',
      type: 'open_text',
      question:
        'In one or two sentences, what is the app you want to build? Pretend you are explaining it to a friend over coffee.',
      helper:
        'Keep it simple. "It is a tool that lets freelancers track unpaid invoices and send reminders automatically" is better than a feature list.',
      voiceEnabled: true,
      followUpPrompt:
        'That is a clear starting point. Before we go further, let me confirm we are on the right track with the kind of project this is.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'archetype_confirm',
      type: 'archetype_confirm',
      question:
        'It sounds like you want to build a software application using AI-powered coding tools. Is that right?',
      helper:
        'If this is more of a website, content project, or physical product, we should switch to a different discovery path.',
      voiceEnabled: true,
      options: [
        {
          value: 'yes',
          label: 'Yes, that is correct',
          description: 'I am building an app with AI tools.',
        },
        {
          value: 'no',
          label: 'Not quite',
          description: 'This might be a different kind of project.',
        },
      ],
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'what_it_does',
      type: 'open_text',
      question:
        'Walk me through what happens when someone opens your app for the first time. What do they see, and what is the first thing they do?',
      helper:
        'Think about the first 60 seconds of the user experience. What is on the screen? What action do they take?',
      voiceEnabled: true,
      followUpPrompt:
        'Good. That gives me a picture of the experience you are after. Now let me understand your background as a builder.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 2 — The Builder (Questions 4-7)
    // ---------------------------------------------------------------
    {
      key: 'technical_comfort',
      type: 'single_select',
      question:
        'How would you describe your technical skill level right now?',
      helper:
        'Be honest here. The plan we build together depends on knowing what you can realistically do today.',
      voiceEnabled: true,
      options: [
        {
          value: 'non_technical',
          label: 'Non-technical',
          description:
            'I have never written code. I will rely entirely on AI tools and no-code platforms.',
        },
        {
          value: 'beginner',
          label: 'Beginner',
          description:
            'I can read code and make small edits, but I cannot build from scratch.',
        },
        {
          value: 'intermediate',
          label: 'Intermediate',
          description:
            'I can build simple projects on my own and use AI tools to move faster.',
        },
        {
          value: 'advanced',
          label: 'Advanced',
          description:
            'I am a working developer using AI tools to accelerate my workflow.',
        },
      ],
      followUpPrompt:
        'That helps me calibrate the advice I give. Let us talk about your toolbox.',
      stage: { number: 2, label: 'The Builder' },
      required: true,
    },
    {
      key: 'ai_tools_planned',
      type: 'multi_select',
      question:
        'Which AI coding tools are you planning to use for this project?',
      helper:
        'Pick everything you expect to touch. Many people combine multiple tools for different stages.',
      voiceEnabled: true,
      options: [
        {
          value: 'lovable',
          label: 'Lovable',
          description:
            'Full-stack app generation from prompts with built-in hosting.',
        },
        {
          value: 'cursor',
          label: 'Cursor',
          description:
            'AI-powered code editor for writing and editing code with context.',
        },
        {
          value: 'claude_code',
          label: 'Claude Code',
          description:
            'Terminal-based AI coding agent for building and modifying projects.',
        },
        {
          value: 'bolt',
          label: 'Bolt',
          description:
            'Browser-based AI builder for full-stack web apps.',
        },
        {
          value: 'replit',
          label: 'Replit',
          description:
            'Cloud IDE with an AI agent that can build and deploy apps.',
        },
        {
          value: 'v0',
          label: 'v0 by Vercel',
          description:
            'AI tool for generating React UI components and pages from descriptions.',
        },
      ],
      followUpPrompt:
        'Good choices. Each of those has strengths and blind spots we will account for in your plan.',
      stage: { number: 2, label: 'The Builder' },
      required: true,
    },
    {
      key: 'past_experience',
      type: 'single_select',
      question:
        'Have you tried building something with AI coding tools before?',
      helper:
        'Prior attempts, even failed ones, are valuable information. They tell us what traps to avoid this time.',
      voiceEnabled: true,
      options: [
        {
          value: 'first_time',
          label: 'This is my first time',
          description: 'I have not used AI builders for a project yet.',
        },
        {
          value: 'prototyped',
          label: 'I have prototyped but never shipped',
          description:
            'I got something working but it never reached real users.',
        },
        {
          value: 'shipped_small',
          label: 'I shipped something small',
          description:
            'I launched a small project, maybe to friends or a limited audience.',
        },
        {
          value: 'shipped_real',
          label: 'I have shipped a real product',
          description:
            'I launched something that real users or paying customers used.',
        },
      ],
      stage: { number: 2, label: 'The Builder' },
      required: true,
    },
    {
      key: 'design_ability',
      type: 'single_select',
      question: 'How do you plan to handle the visual design of your app?',
      helper:
        'Design is the part that AI tools handle unevenly. Some produce great UI out of the box, others need serious help.',
      voiceEnabled: true,
      options: [
        {
          value: 'ai_default',
          label: 'Use whatever the AI tool generates',
          description: 'I will accept the default styling and layouts.',
        },
        {
          value: 'templates',
          label: 'Start from templates or component libraries',
          description:
            'I will use shadcn, Tailwind UI, or similar kits as a foundation.',
        },
        {
          value: 'design_tool',
          label: 'I will design screens in Figma or similar',
          description:
            'I have design skills and will create mockups before building.',
        },
        {
          value: 'hire_designer',
          label: 'I plan to hire a designer',
          description:
            'Someone else will handle the visual design work.',
        },
      ],
      followUpPrompt:
        'Understood. Now let us make sure this app solves a real problem for real people.',
      stage: { number: 2, label: 'The Builder' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 3 — The Problem (Questions 8-11)
    // ---------------------------------------------------------------
    {
      key: 'target_user',
      type: 'open_text',
      question:
        'Describe the specific person who will use this app. Who are they, what is their day like, and when would they reach for your app?',
      helper:
        'Avoid saying "everyone." The best apps start by serving one type of person extremely well. Give me a job title, a situation, or a daily frustration.',
      voiceEnabled: true,
      followUpPrompt:
        'I can picture that person. Now let us dig into what is actually painful for them.',
      stage: { number: 3, label: 'The Problem' },
      required: true,
    },
    {
      key: 'pain_point',
      type: 'open_text',
      question:
        'What specific problem does this person face today that your app will fix? How often does it happen, and what does it cost them in time, money, or frustration?',
      helper:
        'The more concrete you can be, the better. "They spend 2 hours every Friday manually copying data between spreadsheets" is stronger than "They waste time on tedious work."',
      voiceEnabled: true,
      stage: { number: 3, label: 'The Problem' },
      required: true,
    },
    {
      key: 'current_alternatives',
      type: 'single_select',
      question:
        'What are these people doing right now to deal with this problem?',
      helper:
        'Your real competition is almost never another app. It is the spreadsheet, the sticky note, the manual process, or doing nothing at all.',
      voiceEnabled: true,
      options: [
        {
          value: 'spreadsheets',
          label: 'Spreadsheets or documents',
          description:
            'They manage it in Google Sheets, Excel, Notion, or similar.',
        },
        {
          value: 'manual_process',
          label: 'Manual effort or pen-and-paper',
          description:
            'They handle it by hand, with physical tools or memory.',
        },
        {
          value: 'existing_software',
          label: 'Existing software that does not fit well',
          description:
            'They use a tool that kind of works but is too complex, too expensive, or missing features.',
        },
        {
          value: 'cobbled_tools',
          label: 'A patchwork of multiple tools',
          description:
            'They stitch together several apps, browser tabs, and workarounds.',
        },
        {
          value: 'nothing',
          label: 'They just live with it',
          description:
            'There is no current solution. They tolerate the problem.',
        },
      ],
      stage: { number: 3, label: 'The Problem' },
      required: true,
    },
    {
      key: 'why_this_matters',
      type: 'open_text',
      question:
        'Why are you the right person to build this? What do you know about this problem that most people do not?',
      helper:
        'Maybe you lived this problem yourself, or you work in the industry, or you have been researching it obsessively. Unfair advantages matter.',
      voiceEnabled: true,
      followUpPrompt:
        'That context is important. Let us now design the actual product.',
      stage: { number: 3, label: 'The Problem' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 4 — The Product (Questions 12-16)
    // ---------------------------------------------------------------
    {
      key: 'core_features',
      type: 'open_text',
      question:
        'List the three to five most important things your app must do. Not nice-to-haves. The features without which there is no product.',
      helper:
        'Force yourself to pick only the essentials. If everything is a priority, nothing is. What breaks if you remove it?',
      voiceEnabled: true,
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'user_flow',
      type: 'open_text',
      question:
        'Describe the main user journey. A user signs up, then what? Walk me through the five to eight steps they take to get value from your app.',
      helper:
        'Think about this as a storyboard. Step 1: they land on the page. Step 2: they sign up. Step 3: they configure their first X. Keep going until they hit the "aha" moment.',
      voiceEnabled: true,
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'data_backend',
      type: 'single_select',
      question:
        'What kind of data storage and backend does your app need?',
      helper:
        'This is one of the areas where AI-built apps often hit walls. The choice here affects which tools will work well for you.',
      voiceEnabled: true,
      options: [
        {
          value: 'simple_db',
          label: 'Simple database with user accounts',
          description:
            'Basic CRUD operations. Users create, read, update, and delete records. Supabase or Firebase would handle this.',
        },
        {
          value: 'complex_db',
          label: 'Complex relational data',
          description:
            'Multiple related tables, roles, permissions, and business logic. Needs a proper backend.',
        },
        {
          value: 'ai_processing',
          label: 'AI or machine learning processing',
          description:
            'The app calls AI APIs, processes text, images, or audio as a core feature.',
        },
        {
          value: 'realtime',
          label: 'Real-time or collaborative data',
          description:
            'Users see live updates, collaborate simultaneously, or need push notifications.',
        },
        {
          value: 'minimal',
          label: 'Minimal or no backend',
          description:
            'It is mostly a frontend tool. Local storage or a simple API call is enough.',
        },
      ],
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'integrations',
      type: 'multi_select',
      question:
        'Does your app need to connect to any external services or APIs?',
      helper:
        'Integrations add complexity fast, especially in AI-generated code. Be selective about what is truly needed for version one.',
      voiceEnabled: true,
      options: [
        {
          value: 'auth_provider',
          label: 'Authentication (Google, GitHub, email login)',
          description: 'Users need to sign in with existing accounts.',
        },
        {
          value: 'payments',
          label: 'Payments (Stripe, Lemon Squeezy)',
          description: 'You need to charge users or process transactions.',
        },
        {
          value: 'ai_apis',
          label: 'AI APIs (OpenAI, Anthropic, Replicate)',
          description: 'Your app sends data to AI models for processing.',
        },
        {
          value: 'email_notifications',
          label: 'Email or notifications (Resend, SendGrid, Twilio)',
          description: 'The app sends emails, SMS, or push notifications.',
        },
        {
          value: 'storage',
          label: 'File storage (S3, Cloudflare R2, Supabase Storage)',
          description: 'Users upload or download files, images, or documents.',
        },
        {
          value: 'none',
          label: 'No external integrations needed',
          description: 'The app is self-contained for version one.',
        },
      ],
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'platform_target',
      type: 'single_select',
      question: 'What platform are you building for?',
      helper:
        'Most AI coding tools are strongest at web apps. Mobile adds significant complexity. Be realistic about what you can ship first.',
      voiceEnabled: true,
      options: [
        {
          value: 'web_only',
          label: 'Web app only',
          description:
            'A browser-based application. This is the fastest path to launch with AI tools.',
        },
        {
          value: 'web_responsive',
          label: 'Web app that works well on mobile browsers',
          description:
            'A responsive web app. No app store, but feels good on phones.',
        },
        {
          value: 'pwa',
          label: 'Progressive Web App (PWA)',
          description:
            'A web app that can be installed on devices and works offline.',
        },
        {
          value: 'native_mobile',
          label: 'Native mobile app (iOS, Android, or both)',
          description:
            'A real app store listing. Significantly more work and review processes.',
        },
        {
          value: 'desktop',
          label: 'Desktop application',
          description:
            'A downloadable app for Mac, Windows, or Linux using Electron or Tauri.',
        },
      ],
      followUpPrompt:
        'We have a solid picture of the product. Let us talk about how it makes money.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 5 — Monetization (Questions 17-19)
    // ---------------------------------------------------------------
    {
      key: 'revenue_model',
      type: 'single_select',
      question: 'How do you plan to make money from this app?',
      helper:
        'Pick the model that fits your user and problem best. You can always adjust later, but starting with a clear intent shapes the product.',
      voiceEnabled: true,
      options: [
        {
          value: 'subscription',
          label: 'Monthly or annual subscription',
          description:
            'Users pay a recurring fee for access. SaaS model.',
        },
        {
          value: 'one_time',
          label: 'One-time purchase',
          description:
            'Users pay once for lifetime access. Common for tools and utilities.',
        },
        {
          value: 'freemium',
          label: 'Freemium with paid upgrades',
          description:
            'Free tier with limits. Pay to unlock more features, storage, or usage.',
        },
        {
          value: 'usage_based',
          label: 'Usage-based or pay-per-action',
          description:
            'Users pay based on how much they use. Common for AI-powered tools with API costs.',
        },
        {
          value: 'free_for_now',
          label: 'Free for now, monetize later',
          description:
            'Focus on getting users first. Figure out revenue once there is traction.',
        },
        {
          value: 'no_revenue',
          label: 'No plans to charge',
          description:
            'This is a personal project, portfolio piece, or open-source tool.',
        },
      ],
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'pricing_thoughts',
      type: 'open_text',
      question:
        'What are you thinking for price points? What does your target user already pay for similar tools or services?',
      helper:
        'Research what comparable products charge. If your user pays $50/month for a tool that partially solves this problem, that is a strong pricing signal. If you said "no revenue," describe the value you want to provide instead.',
      voiceEnabled: true,
      stage: { number: 5, label: 'Monetization' },
      required: false,
    },
    {
      key: 'free_tier_strategy',
      type: 'open_text',
      question:
        'If you offer a free tier or trial, what will be included versus what will be locked behind payment?',
      helper:
        'The free tier needs to be useful enough to demonstrate value but limited enough that serious users want to upgrade. Think about limits on usage, features, or data.',
      voiceEnabled: true,
      followUpPrompt:
        'Good thinking on the business side. Now let us scope what actually gets built first.',
      stage: { number: 5, label: 'Monetization' },
      required: false,
    },

    // ---------------------------------------------------------------
    // Stage 6 — Scope (Questions 20-23)
    // ---------------------------------------------------------------
    {
      key: 'v1_scope',
      type: 'open_text',
      question:
        'What is the absolute minimum version of this app that a real user would find useful? Describe version one as if you only had two weeks to build it.',
      helper:
        'This is the hardest question for most builders. Strip away everything that is not essential. What is the one workflow that must work perfectly?',
      voiceEnabled: true,
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'explicitly_out',
      type: 'open_text',
      question:
        'What features are you intentionally leaving out of version one? Name at least three things you will NOT build yet.',
      helper:
        'Saying "not now" is a skill. AI tools make it tempting to keep adding features. Every feature you cut from v1 doubles your chance of actually shipping.',
      voiceEnabled: true,
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'biggest_technical_risk',
      type: 'single_select',
      question:
        'What is the part of this project you are most worried about technically?',
      helper:
        'Every project has a hard part. Identifying it now means we can plan for it instead of discovering it at 2am the night before launch.',
      voiceEnabled: true,
      options: [
        {
          value: 'auth_and_accounts',
          label: 'User authentication and account management',
          description:
            'Sign-up flows, password resets, roles, and permissions.',
        },
        {
          value: 'data_complexity',
          label: 'Complex data relationships and business logic',
          description:
            'The data model is complicated, with many interrelated tables and edge cases.',
        },
        {
          value: 'third_party_apis',
          label: 'Integrating with external services or APIs',
          description:
            'Connecting to payment processors, AI models, or third-party platforms.',
        },
        {
          value: 'scaling',
          label: 'Handling performance or scale',
          description:
            'Worried about the app breaking under load or with large datasets.',
        },
        {
          value: 'ai_code_quality',
          label: 'Trusting AI-generated code quality',
          description:
            'Concerned that the AI will produce code that is fragile, buggy, or unmaintainable.',
        },
        {
          value: 'deployment',
          label: 'Deployment and production infrastructure',
          description:
            'Getting the app live, handling domains, SSL, databases in production.',
        },
      ],
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'timeline',
      type: 'single_select',
      question: 'When do you want version one in the hands of real users?',
      helper:
        'AI tools accelerate building, but testing, polishing, and fixing edge cases still take time. Be honest about your deadline.',
      voiceEnabled: true,
      options: [
        {
          value: 'one_week',
          label: 'Within one week',
          description:
            'Aggressive. Possible for a simple app with one core feature.',
        },
        {
          value: 'two_to_four_weeks',
          label: 'Two to four weeks',
          description:
            'Realistic for a focused MVP with AI tools and dedicated time.',
        },
        {
          value: 'one_to_two_months',
          label: 'One to two months',
          description:
            'Comfortable pace for a more complete v1 with some polish.',
        },
        {
          value: 'three_plus_months',
          label: 'Three months or more',
          description:
            'Longer runway. Be careful of scope creep and losing momentum.',
        },
        {
          value: 'no_deadline',
          label: 'No specific deadline',
          description:
            'This is a side project without time pressure.',
        },
      ],
      followUpPrompt:
        'We have a clear scope now. Let us figure out what resources you are working with.',
      stage: { number: 6, label: 'Scope' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 7 — Resources (Questions 24-26)
    // ---------------------------------------------------------------
    {
      key: 'budget',
      type: 'single_select',
      question:
        'What is your total budget for tools, hosting, APIs, and any outside help for the first three months?',
      helper:
        'Include AI tool subscriptions (Cursor is $20/month, Lovable has a free tier), hosting costs, domain registration, API usage fees, and any freelancer costs.',
      voiceEnabled: true,
      options: [
        {
          value: 'zero',
          label: '$0 -- Free tools only',
          description:
            'Using free tiers exclusively. Limits your tool and hosting options.',
        },
        {
          value: 'under_100',
          label: 'Under $100',
          description:
            'Enough for one or two paid tool subscriptions and basic hosting.',
        },
        {
          value: '100_to_500',
          label: '$100 to $500',
          description:
            'Comfortable budget for tools, hosting, a domain, and some API usage.',
        },
        {
          value: '500_to_2000',
          label: '$500 to $2,000',
          description:
            'Room for premium tools, professional hosting, and some freelance help.',
        },
        {
          value: 'over_2000',
          label: 'Over $2,000',
          description:
            'Significant investment. Can afford dedicated infrastructure and professional support.',
        },
      ],
      stage: { number: 7, label: 'Resources' },
      required: true,
    },
    {
      key: 'time_per_week',
      type: 'single_select',
      question:
        'How many hours per week can you realistically dedicate to building this?',
      helper:
        'Be honest. Overcommitting leads to burnout and abandoned projects. Factor in your job, family, and other obligations.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_5',
          label: 'Under 5 hours per week',
          description:
            'A few evenings. Progress will be slow but steady.',
        },
        {
          value: '5_to_10',
          label: '5 to 10 hours per week',
          description:
            'Evenings and some weekend time. A realistic side project pace.',
        },
        {
          value: '10_to_20',
          label: '10 to 20 hours per week',
          description:
            'Serious commitment. Equivalent to a significant part-time job.',
        },
        {
          value: '20_to_40',
          label: '20 to 40 hours per week',
          description:
            'Half-time to full-time dedication. Fast progress possible.',
        },
        {
          value: 'full_time_plus',
          label: 'Full time or more',
          description:
            'This is your primary focus. You are going all in.',
        },
      ],
      stage: { number: 7, label: 'Resources' },
      required: true,
    },
    {
      key: 'team_or_solo',
      type: 'single_select',
      question: 'Are you building this alone or with others?',
      helper:
        'Solo builders move fast on decisions but slow on execution. Teams can divide work but need coordination. Both paths work, but the plan is different.',
      voiceEnabled: true,
      options: [
        {
          value: 'solo',
          label: 'Completely solo',
          description:
            'I am the only person working on this. AI tools are my co-pilot.',
        },
        {
          value: 'solo_with_freelancers',
          label: 'Solo with occasional freelance help',
          description:
            'Mostly me, but I will hire help for specific tasks like design or backend work.',
        },
        {
          value: 'co_founder',
          label: 'I have a co-founder or partner',
          description:
            'Two people splitting the work. One might be more technical than the other.',
        },
        {
          value: 'small_team',
          label: 'Small team (3-5 people)',
          description:
            'A dedicated group working together on this project.',
        },
      ],
      followUpPrompt:
        'We know what you are working with. Now let us plan how this gets into the world.',
      stage: { number: 7, label: 'Resources' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 8 — Launch (Questions 27-29)
    // ---------------------------------------------------------------
    {
      key: 'distribution_plan',
      type: 'multi_select',
      question:
        'Where do you plan to put this app so people can find it and use it?',
      helper:
        'Distribution is the part most builders think about last and regret most. The best product nobody knows about still fails.',
      voiceEnabled: true,
      options: [
        {
          value: 'product_hunt',
          label: 'Product Hunt launch',
          description:
            'A public launch on Product Hunt for visibility and early adopters.',
        },
        {
          value: 'social_media',
          label: 'Social media (X/Twitter, LinkedIn, Reddit)',
          description:
            'Posting about it on platforms where your target users hang out.',
        },
        {
          value: 'communities',
          label: 'Online communities and forums',
          description:
            'Sharing in Slack groups, Discord servers, Facebook groups, or niche forums.',
        },
        {
          value: 'seo_content',
          label: 'SEO and content marketing',
          description:
            'Writing blog posts, tutorials, or guides that rank in search and drive organic traffic.',
        },
        {
          value: 'direct_outreach',
          label: 'Direct outreach to potential users',
          description:
            'Personally reaching out to people who have the problem your app solves.',
        },
        {
          value: 'app_store',
          label: 'App store listing',
          description:
            'Publishing on the Apple App Store, Google Play, or a browser extension store.',
        },
      ],
      stage: { number: 8, label: 'Launch' },
      required: true,
    },
    {
      key: 'first_100_users',
      type: 'open_text',
      question:
        'Forget scale. How will you personally get your first 100 users? Be specific about where you will find them and what you will say.',
      helper:
        'The first 100 users almost never come from marketing. They come from personal networks, specific communities, or one-on-one conversations. Who are the first 10 people you would message?',
      voiceEnabled: true,
      stage: { number: 8, label: 'Launch' },
      required: true,
    },
    {
      key: 'marketing_approach',
      type: 'open_text',
      question:
        'Beyond launch day, how will people keep discovering your app week after week? What is your repeatable channel?',
      helper:
        'A launch spike is not a business. Think about what brings a steady stream of new users over months. Content? Word of mouth? Partnerships? Paid ads?',
      voiceEnabled: true,
      followUpPrompt:
        'Almost done. One last question to tie everything together.',
      stage: { number: 8, label: 'Launch' },
      required: true,
    },

    // ---------------------------------------------------------------
    // Stage 9 — Success (Question 30)
    // ---------------------------------------------------------------
    {
      key: 'success_definition',
      type: 'open_text',
      question:
        'Six months from now, what would need to be true for you to say this project was a success? Give me a number, a milestone, or a concrete outcome.',
      helper:
        'Be specific. "100 paying users at $10/month" is actionable. "A successful app" is not. Maybe success is a portfolio piece, maybe it is revenue, maybe it is proving a concept. Whatever it is, name it.',
      voiceEnabled: true,
      followUpPrompt:
        'That is a clear target to aim for. I have everything I need to build your project plan. Let me put it all together.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
  ],
  artifactTypes: [
    'vision',
    'scope',
    'personas',
    'competitive_analysis',
    'user_journey',
    'roadmap',
    'tech_stack',
    'architecture_overview',
    'wireframes',
    'raci_matrix',
    'risk_register',
    'success_metrics',
    'budget',
    'go_to_market',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ],
  artifactGenerationOrder: [
    'vision',
    'personas',
    'competitive_analysis',
    'scope',
    'user_journey',
    'tech_stack',
    'architecture_overview',
    'wireframes',
    'roadmap',
    'raci_matrix',
    'success_metrics',
    'budget',
    'go_to_market',
    'risk_register',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ],
};
