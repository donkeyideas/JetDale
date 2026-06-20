import type { ArchetypeDefinition } from '../types';

export const indieSoftware: ArchetypeDefinition = {
  slug: 'indie_software',
  name: 'Indie software product',
  category: 'software',
  scriptVersion: 1,
  expertPersona:
    'You are a veteran indie hacker and bootstrapped SaaS founder with over 10 years of experience building and selling software products. You have launched 7 products, grown two past $20K MRR without venture capital, and shut down three others when the numbers did not work. You are direct, practical, and allergic to hand-waving. You know the indie software market inside and out -- the distribution playbooks, the pricing psychology, the technical traps, and the emotional rollercoaster of building alone or with a tiny team. You give advice like a trusted friend who also happens to have the spreadsheets to back it up.',
  estimatedMinutes: 25,
  iconName: 'code',
  description:
    'For indie hackers, solo founders, and small teams building software products -- SaaS apps, mobile apps, developer tools, marketplaces, and browser extensions. Covers problem validation, product scoping, monetization, distribution, and everything else you need to plan before you write the first line of code.',
  questions: [
    // ================================================================
    // STAGE 1 -- The Spark (questions 1-3)
    // ================================================================
    {
      key: 'idea_pitch',
      type: 'open_text',
      question:
        'Give me the elevator pitch. In two or three sentences, what is the software product you want to build and why does it matter?',
      helper:
        'Think of how you would explain this to another founder at a meetup. For example: "I am building a tool that helps freelance designers track client feedback in one place instead of digging through email threads, Slack messages, and Figma comments." Short, specific, grounded in a real situation.',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back the core idea in your own words to confirm understanding. Identify what category this falls into -- SaaS, developer tool, mobile app, marketplace, or utility. Name one or two existing products in the same neighborhood so the founder can see where you are placing them in the landscape. If the pitch is too vague or sounds like a feature rather than a product, push back and ask them to sharpen it before moving on.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'archetype_confirm',
      type: 'archetype_confirm',
      question:
        'Based on what you described, it sounds like you are building an indie software product. Which of these best describes it?',
      helper:
        'Pick the closest match. If your idea spans multiple categories, choose the one that represents the primary way users will interact with it.',
      voiceEnabled: true,
      options: [
        {
          value: 'saas',
          label: 'SaaS (Software as a Service)',
          description:
            'A web application users access through a browser, typically with accounts and recurring billing. Examples: Basecamp, ConvertKit, Plausible Analytics.',
        },
        {
          value: 'mobile_app',
          label: 'Mobile app',
          description:
            'A native or cross-platform app distributed through the App Store or Google Play. Examples: Flighty, Carrot Weather, Halide.',
        },
        {
          value: 'dev_tool',
          label: 'Developer tool',
          description:
            'Software built for other developers -- CLIs, libraries, APIs, IDE extensions, or infrastructure tools. Examples: Raycast, Linear, Posthog.',
        },
        {
          value: 'marketplace',
          label: 'Marketplace or platform',
          description:
            'A product that connects two sides -- buyers and sellers, creators and consumers, or service providers and clients. Examples: Gumroad, Lemon Squeezy, Toptal.',
        },
        {
          value: 'browser_extension',
          label: 'Browser extension',
          description:
            'A Chrome, Firefox, or Safari extension that adds functionality to the browser. Examples: Grammarly, Momentum, Wappalyzer.',
        },
        {
          value: 'other',
          label: 'Something else',
          description:
            'Desktop app, CLI tool, API service, WordPress plugin, or another type of software product.',
        },
      ],
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'what_problem',
      type: 'open_text',
      question:
        'What specific problem does this product solve? Describe the pain -- what is frustrating, slow, expensive, or broken for the person who would use this?',
      helper:
        'The best indie products solve a problem the founder has felt personally. "Freelancers lose track of which clients owe them money and spend hours every month chasing invoices" is specific. "People need better productivity tools" is not. Go concrete.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate whether this sounds like a real, felt pain or a theoretical problem. If the founder has personal experience with the problem, acknowledge that as a genuine advantage. If it sounds abstract or hypothetical, ask who they have talked to who actually has this problem. Reference comparable indie products that succeeded by solving similar pains -- for example, how Baremetrics grew by solving the specific pain of SaaS founders not being able to see their Stripe metrics clearly.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },

    // ================================================================
    // STAGE 2 -- The Problem (questions 4-7)
    // ================================================================
    {
      key: 'who_has_problem',
      type: 'open_text',
      question:
        'Who exactly has this problem? Describe the specific person -- their role, their day-to-day, and the moment when this pain hits them hardest.',
      helper:
        'Avoid saying "everyone" or "small businesses." Narrow it down. A great answer looks like: "Marketing managers at B2B startups with 10 to 50 employees who spend every Monday morning manually pulling data from five different analytics dashboards into a slide deck for their weekly standup." The more specific, the easier everything else becomes.',
      voiceEnabled: true,
      followUpPrompt:
        'Assess whether the target user is specific enough to build for. If they said something broad like "marketers" or "developers," push them to narrow down to a particular sub-segment, company size, or workflow. Reference the classic indie SaaS lesson: Drip started by targeting bloggers specifically, not "anyone who sends email." ConvertKit targeted professional bloggers, not all creators. Specificity at this stage is what separates products that get traction from products that drift.',
      stage: { number: 2, label: 'The Problem' },
      required: true,
    },
    {
      key: 'how_solved_today',
      type: 'open_text',
      question:
        'How are these people solving this problem right now? What tools, workarounds, or manual processes do they use today?',
      helper:
        'Your real competition is rarely another software product. It is usually a spreadsheet, a manual process, a pile of browser tabs, or just ignoring the problem entirely. Understanding the current solution tells you what you actually need to beat. For example: "They export CSV files from Stripe, paste them into Google Sheets, and manually build charts every week."',
      voiceEnabled: true,
      followUpPrompt:
        'Identify whether the current solution is good enough that switching costs will be high, or painful enough that people are actively looking for alternatives. If they use spreadsheets or manual processes, note that the switching cost is low but the motivation to change might also be low -- they have learned to live with it. If they use existing software that almost works, ask what specifically falls short. This shapes the positioning: are you replacing a painful process or competing against an established tool?',
      stage: { number: 2, label: 'The Problem' },
      required: true,
    },
    {
      key: 'why_bad',
      type: 'open_text',
      question:
        'Why are the current solutions not good enough? What specifically fails, frustrates, or costs too much about how people handle this today?',
      helper:
        'Be concrete about the gap. "It takes too long" is a start, but "they spend 3 hours every Friday doing something that should take 10 minutes" is much stronger. "The existing tools are too expensive" is okay, but "they pay $200/month for Salesforce when they only use 5% of it" gives us something to work with.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate whether the gap between the current solution and what this product offers is large enough to motivate someone to switch, pay, and change their habits. If the pain seems mild -- "it is a little annoying" -- challenge the founder on whether anyone would actually pay to fix this. Reference the concept of painkillers versus vitamins: painkillers solve urgent, felt pain and sell themselves; vitamins are nice-to-have and require heavy marketing. Ask which one this product is and why.',
      stage: { number: 2, label: 'The Problem' },
      required: true,
    },
    {
      key: 'market_size_guess',
      type: 'single_select',
      question:
        'How big do you think the market for this product is? This does not need to be precise -- just your honest gut feeling.',
      helper:
        'For indie software, a tiny niche can be perfectly profitable. Many successful bootstrapped products serve fewer than 5,000 potential customers worldwide and still generate strong revenue. You do not need a massive market. You need a reachable market where people will pay.',
      voiceEnabled: true,
      options: [
        {
          value: 'tiny_niche',
          label: 'Tiny niche (hundreds of potential users)',
          description:
            'A very specialized audience. Could work if they pay well. Think: compliance software for craft breweries.',
        },
        {
          value: 'small_but_growing',
          label: 'Small but growing (thousands of potential users)',
          description:
            'A focused market with a clear growth trend. Think: tools for Shopify store owners doing over $1M in revenue.',
        },
        {
          value: 'mid_market',
          label: 'Mid-market (tens of thousands of potential users)',
          description:
            'A solid addressable market with room to grow. Think: project management for freelance agencies.',
        },
        {
          value: 'large_market',
          label: 'Large market (hundreds of thousands of potential users)',
          description:
            'A broad market with established competitors. Think: email marketing tools, CRM software.',
        },
        {
          value: 'massive',
          label: 'Massive (millions of potential users)',
          description:
            'Consumer-scale or horizontal software. Think: note-taking apps, to-do lists, password managers.',
        },
      ],
      followUpPrompt:
        'Contextualize their market size choice with indie-specific advice. If they picked tiny niche, validate that it can work but stress that pricing must be high enough -- reference how some indie B2B tools charge $200-500/month to a few hundred customers and do very well. If they picked massive, warn that competing in large markets as an indie means finding a very specific angle or underserved segment within it -- you cannot out-market Notion with a marketing budget of zero. Ask whether they know how to reach these people specifically.',
      stage: { number: 2, label: 'The Problem' },
      required: true,
    },

    // ================================================================
    // STAGE 3 -- Competition (questions 8-10)
    // ================================================================
    {
      key: 'direct_competitors',
      type: 'open_text',
      question:
        'Who are the closest competitors? Name specific products, and for each one, tell me what they do well and where they fall short.',
      helper:
        'If you think you have no competitors, think harder. Even if nobody builds exactly what you plan to build, people are solving this problem some other way. List at least two or three alternatives your potential users might consider, including "doing nothing" or "using a spreadsheet" if that applies.',
      voiceEnabled: true,
      followUpPrompt:
        'Analyze the competitive landscape they described. For any well-known competitors, add context the founder might not know -- pricing tiers, funding status, recent product changes, or known weaknesses. If they listed only indirect competitors like spreadsheets, point out that this could mean either an untapped opportunity or a sign that the market does not want a dedicated tool. Push them to look at Product Hunt, G2, AlternativeTo, or relevant subreddits to validate that they have not missed a direct competitor. Missing a key competitor at this stage leads to painful surprises later.',
      stage: { number: 3, label: 'Competition' },
      required: true,
    },
    {
      key: 'competitive_edge',
      type: 'open_text',
      question:
        'Why would someone choose your product over those alternatives? What is the specific thing you will do better, differently, or more simply?',
      helper:
        'For indie software, your edge is almost never "more features." It is usually one of these: dramatically simpler, much cheaper, built for a specific niche the big players ignore, faster to set up, better customer experience because you actually care, or opinionated in a way that resonates with a specific group. Pick one and own it.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate whether the stated edge is defensible and real, or just wishful thinking. "Better UX" is not a competitive edge unless you can explain exactly why -- the incumbents also think they have good UX. Poke at the edge: would this still be true in 12 months? Could a competitor add this in a weekend? Reference examples of indie products that won on a specific, hard-to-copy edge. Basecamp won on simplicity and opinion. Plausible won on privacy and being the anti-Google Analytics. ConvertKit won on being built specifically for creators rather than being a generic email tool.',
      stage: { number: 3, label: 'Competition' },
      required: true,
    },
    {
      key: 'why_now',
      type: 'open_text',
      question:
        'Why is now the right time to build this? What has changed recently -- in the market, in technology, or in user behavior -- that makes this product possible or necessary today?',
      helper:
        'The best products ride a wave of change. Maybe a new regulation created a compliance gap. Maybe a platform shift opened new distribution. Maybe remote work changed how people collaborate. Maybe AI made something possible that was not possible two years ago. If you cannot name a "why now," that does not kill the idea, but it means you need to work harder on distribution.',
      voiceEnabled: true,
      followUpPrompt:
        'Assess whether their "why now" is a genuine tailwind or just enthusiasm. A real timing advantage might be: a new API that enables something previously impossible, a regulatory change that creates urgent demand, a platform migration that leaves users shopping for alternatives, or a shift in how people work that creates new pain points. If they cannot articulate a clear timing reason, be honest that it makes the path harder -- not impossible, but harder. They will need to create their own urgency through marketing and positioning rather than riding an existing wave.',
      stage: { number: 3, label: 'Competition' },
      required: true,
    },

    // ================================================================
    // STAGE 4 -- The Product (questions 11-15)
    // ================================================================
    {
      key: 'core_features',
      type: 'open_text',
      question:
        'List the three to five features that absolutely must be in version one. Not everything you want to build eventually -- just the features without which this product is not worth using.',
      helper:
        'Force yourself to be ruthless. If your list has more than five items, you are not being honest about what is essential. A good test: if you removed this feature, would your target user still get value from the product? If yes, it is not essential for v1. For reference, Basecamp v1 had message boards, to-do lists, milestones, and file sharing. That was it.',
      voiceEnabled: true,
      followUpPrompt:
        'Review their feature list for scope creep disguised as essentials. If they listed more than five features, push back and ask which ones they could cut and still ship a useful product. For each feature, briefly assess the technical difficulty -- flag anything that sounds simple but is actually hard to build well, like real-time collaboration, search, permissions systems, or file uploads. If any feature sounds like it could be its own product, point that out. Remind them that every feature they commit to in v1 is a feature they must maintain, debug, and support from day one.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'mvp_one_feature',
      type: 'open_text',
      question:
        'If you could only ship one feature -- a single screen or workflow -- what would it be? What is the one thing that delivers the core value?',
      helper:
        'This is the heart of your MVP. Everything else is built around this. Twitter started as a single text box. Dropbox started as a folder that synced. Stripe started as seven lines of code to accept a payment. What is your "one thing"?',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate whether their one feature is truly the nucleus of the product or if they picked something that feels important but does not deliver standalone value. The right answer should be the feature that, by itself, would make someone say "oh, that is useful" even without anything else around it. If their pick is something like "user dashboard" or "settings page," redirect them -- those are infrastructure, not value. Ask them to think about what action the user takes that directly solves the pain they described in Stage 2.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'user_flow',
      type: 'open_text',
      question:
        'Walk me through the main user journey from signup to the moment they get value. What does the user see and do at each step?',
      helper:
        'Think of this as a storyboard. Step 1: user lands on the homepage. Step 2: they sign up. Step 3: they see the onboarding screen. Keep going until they hit the "aha moment" -- the point where they think "this is exactly what I needed." How many steps is that? Fewer is better. The best products deliver value within minutes, not days.',
      voiceEnabled: true,
      followUpPrompt:
        'Count the steps between signup and first value delivery. If it is more than five steps, warn them that every additional step is a point where users drop off. Reference the concept of "time to value" -- indie products that win tend to deliver their core promise within the first session. If the flow requires extensive configuration, data import, or team setup before the user sees any value, suggest ways to shortcut that with templates, demo data, or progressive onboarding. Flag any step that requires another person to participate, as that creates a chicken-and-egg problem.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'tech_stack_preference',
      type: 'multi_select',
      question:
        'Which technologies are you planning to use or already comfortable with?',
      helper:
        'Pick the tools you actually know or plan to learn. There is no perfect stack for indie software -- the best stack is the one you can ship with. If you are unsure, "whatever works" is an honest and valid answer.',
      voiceEnabled: true,
      options: [
        {
          value: 'react',
          label: 'React',
          description:
            'The most popular frontend library. Huge ecosystem, works well with AI coding tools.',
        },
        {
          value: 'react_native',
          label: 'React Native',
          description:
            'Cross-platform mobile development using React. One codebase for iOS and Android.',
        },
        {
          value: 'nextjs',
          label: 'Next.js',
          description:
            'Full-stack React framework with built-in routing, API routes, and server-side rendering.',
        },
        {
          value: 'node',
          label: 'Node.js',
          description:
            'JavaScript runtime for backend services. Familiar if you already write JavaScript.',
        },
        {
          value: 'python',
          label: 'Python',
          description:
            'Popular for backends, data processing, and AI/ML integration. Django and FastAPI are common frameworks.',
        },
        {
          value: 'go',
          label: 'Go',
          description:
            'Fast, compiled language popular for APIs and infrastructure tools. Great for performance-sensitive backends.',
        },
        {
          value: 'rust',
          label: 'Rust',
          description:
            'Systems-level performance with memory safety. Excellent for CLIs, Wasm, and high-performance services.',
        },
        {
          value: 'whatever_works',
          label: 'Whatever works',
          description:
            'No strong preference. Open to recommendations based on the project requirements.',
        },
      ],
      followUpPrompt:
        'Based on their stack choices and the product type they described earlier, assess the fit. If they picked React Native for what sounds like a web-only SaaS, ask why. If they picked Rust but described a straightforward CRUD app, gently suggest that simpler tools might get them to market faster. If they said "whatever works," give a concrete recommendation based on the product type: Next.js plus Supabase for most SaaS products, React Native for mobile apps, Python for anything heavy on data processing or AI. Warn about common indie traps: choosing a stack because it is interesting rather than because it ships faster.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },
    {
      key: 'data_storage',
      type: 'single_select',
      question:
        'What kind of database do you expect to need?',
      helper:
        'For most indie software products, a relational database like PostgreSQL is the right default. NoSQL databases like MongoDB or Firestore are better for specific use cases like real-time data, document storage, or highly variable schemas. If you are not sure, relational is almost always the safe bet.',
      voiceEnabled: true,
      options: [
        {
          value: 'relational_db',
          label: 'Relational database (PostgreSQL, MySQL)',
          description:
            'Structured data with clear relationships between tables. The default for most SaaS products.',
        },
        {
          value: 'nosql',
          label: 'NoSQL (MongoDB, Firestore, DynamoDB)',
          description:
            'Flexible document storage. Good for real-time apps, variable data shapes, or Firebase-based projects.',
        },
        {
          value: 'both',
          label: 'Both relational and NoSQL',
          description:
            'Some data fits tables, other data is better as documents. Common in apps with both structured records and user-generated content.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description:
            'Need guidance based on the product requirements.',
        },
      ],
      followUpPrompt:
        'Give specific, opinionated advice based on their product type and chosen stack. If they said "not sure," recommend PostgreSQL via Supabase or Neon for most SaaS use cases -- it covers 90% of indie software needs and scales well past the point where database choice matters. If they picked NoSQL, make sure they have a good reason; many indie founders pick Firestore because of Firebase familiarity and later regret it when they need complex queries or joins. If they said "both," ask what specifically requires the NoSQL side -- complexity has a cost for small teams. Transition to talking about how this product will make money.',
      stage: { number: 4, label: 'The Product' },
      required: true,
    },

    // ================================================================
    // STAGE 5 -- Monetization (questions 16-19)
    // ================================================================
    {
      key: 'revenue_model',
      type: 'single_select',
      question:
        'How will this product make money?',
      helper:
        'Your revenue model shapes everything -- the product, the pricing page, the onboarding flow, and how you think about growth. Pick the one that best matches how your users naturally expect to pay for software like this.',
      voiceEnabled: true,
      options: [
        {
          value: 'subscription',
          label: 'Recurring subscription (monthly or annual)',
          description:
            'Users pay every month or year for continued access. The standard SaaS model. Predictable revenue.',
        },
        {
          value: 'one_time',
          label: 'One-time purchase',
          description:
            'Users pay once for lifetime access. Common for desktop apps, utilities, and indie tools. No recurring revenue unless you sell upgrades.',
        },
        {
          value: 'freemium',
          label: 'Freemium (free tier plus paid plans)',
          description:
            'A generous free version with paid upgrades for power users. Drives adoption but requires large volume to convert.',
        },
        {
          value: 'usage_based',
          label: 'Usage-based pricing',
          description:
            'Users pay based on how much they use -- API calls, messages sent, records stored, or compute time consumed.',
        },
        {
          value: 'ads',
          label: 'Advertising or sponsorship',
          description:
            'The product is free. Revenue comes from ads or sponsored placements. Requires very high traffic to be meaningful.',
        },
        {
          value: 'marketplace_cut',
          label: 'Marketplace commission',
          description:
            'You take a percentage of each transaction between buyers and sellers on your platform.',
        },
        {
          value: 'open_source_paid_features',
          label: 'Open source with paid features',
          description:
            'The core product is free and open source. Revenue comes from hosted versions, premium features, or support.',
        },
      ],
      followUpPrompt:
        'Give model-specific advice based on their choice. If subscription: remind them that annual plans reduce churn and improve cash flow -- offer a 2-month discount for annual billing from day one. If one-time: warn that they need a constant stream of new customers since there is no recurring revenue, and suggest considering a paid major-version upgrade model. If freemium: stress that the free tier must be genuinely useful but the upgrade trigger must be clear and tied to a specific moment of need. If usage-based: flag that unpredictable bills make users anxious, so they should include base allowances. If ads: be direct that ad-supported indie software almost never works at small scale. If marketplace cut: warn about the cold-start problem of needing both sides.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'pricing_range',
      type: 'single_select',
      question:
        'What price range are you considering for the primary paid plan?',
      helper:
        'Pricing is the most under-thought part of most indie products. As a rule of thumb: charge more than you think you should. Indie founders almost always underprice. A product at $29/month needs 345 customers to hit $10K MRR. A product at $99/month needs only 101.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_10',
          label: 'Under $10/month',
          description:
            'Consumer or micro-SaaS pricing. High volume needed. Think: Todoist, standard tier.',
        },
        {
          value: '10_to_50',
          label: '$10 to $50/month',
          description:
            'The sweet spot for most indie SaaS. Affordable enough to not need approval, expensive enough to build a business.',
        },
        {
          value: '50_to_200',
          label: '$50 to $200/month',
          description:
            'Professional or team pricing. Fewer customers needed, but sales cycles may be longer.',
        },
        {
          value: '200_plus',
          label: 'Over $200/month',
          description:
            'Business or enterprise pricing. Requires direct sales conversations and onboarding. High LTV.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description:
            'Need help figuring out the right price point.',
        },
      ],
      followUpPrompt:
        'Give specific pricing guidance based on their range and product type. If under $10: warn them about the math -- at $5/month they need 2,000 paying customers just to make $10K MRR, and acquiring each customer still costs time and effort. Ask if they can charge more. If $10-50: validate this as the proven indie SaaS sweet spot and suggest starting at the higher end of their range -- they can always add a cheaper plan later, but raising prices on existing customers is painful. If $50-200: great for B2B, but they need to be prepared for buyers who expect more support, onboarding, and polish. If not sure: give them a formula. Look at what the problem costs in time or money today and price at 10-20% of that savings.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'free_tier',
      type: 'single_select',
      question:
        'Will you offer a free tier?',
      helper:
        'Free tiers drive adoption but can also attract users who will never pay. The decision depends on your distribution strategy: if you plan to grow through word-of-mouth and virality, a free tier helps. If you plan to grow through content marketing and direct sales, a free trial might work better than a permanent free plan.',
      voiceEnabled: true,
      options: [
        {
          value: 'yes_generous',
          label: 'Yes, a generous free tier',
          description:
            'Free users get real value. Conversion happens when they outgrow the limits. Think: Notion, Slack, or Figma free plans.',
        },
        {
          value: 'yes_limited',
          label: 'Yes, a limited free tier or trial',
          description:
            'Free access is restricted by time (14-day trial) or severely limited features. Enough to evaluate, not enough to rely on.',
        },
        {
          value: 'no_free_tier',
          label: 'No free tier',
          description:
            'Paid from day one. Every user is a paying customer. Smaller user base but higher quality signal and simpler business.',
        },
        {
          value: 'not_decided',
          label: 'Not decided yet',
          description:
            'Need help thinking through the tradeoffs.',
        },
      ],
      followUpPrompt:
        'Offer specific advice based on their choice and earlier answers about market size and distribution. If generous free tier: stress the importance of having a clear upgrade trigger -- not just "more of the same" but a moment when the free plan genuinely stops being enough. Reference how Loom gates video length, Notion gates team features, and Supabase gates database size. If no free tier: validate this -- it simplifies the business and filters for serious users, but they need to offer a strong demo, screenshots, or case studies so people can evaluate before buying. If undecided: suggest starting with a 14-day trial with full access, then adding a free tier later once they understand which features drive conversion.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'payment_processor',
      type: 'single_select',
      question:
        'Which payment processor are you planning to use?',
      helper:
        'This affects tax handling, subscription management, and how much work you need to do. Some processors handle everything including sales tax and VAT. Others give you more control but more responsibility.',
      voiceEnabled: true,
      options: [
        {
          value: 'stripe',
          label: 'Stripe',
          description:
            'The industry standard. Extremely flexible, great API, but you handle sales tax yourself unless you add Stripe Tax.',
        },
        {
          value: 'lemonsqueezy',
          label: 'Lemon Squeezy',
          description:
            'Merchant of record. Handles global sales tax, VAT, and compliance for you. Popular with indie makers.',
        },
        {
          value: 'paddle',
          label: 'Paddle',
          description:
            'Merchant of record like Lemon Squeezy. Handles tax compliance globally. More enterprise-oriented.',
        },
        {
          value: 'gumroad',
          label: 'Gumroad',
          description:
            'Simple payment processing for digital products. Easy setup, higher fees, limited subscription features.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description:
            'Need guidance on which processor fits best.',
        },
      ],
      followUpPrompt:
        'Give practical advice on their choice. If Stripe: warn them about the tax burden -- they are responsible for calculating and remitting sales tax and VAT in every jurisdiction. Suggest Stripe Tax or a service like Avalara if they plan to sell globally. If Lemon Squeezy or Paddle: validate the convenience of merchant-of-record status, but note the higher transaction fees (typically 5-8% versus Stripe at 2.9%). For indie products under $50K ARR, the convenience usually outweighs the fee difference. If Gumroad: note the 10% fee and limited subscription management -- fine for one-time purchases but expensive for recurring revenue at scale. If not sure: recommend Lemon Squeezy for simplicity or Stripe for maximum control. Transition to distribution.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },

    // ================================================================
    // STAGE 6 -- Audience & Distribution (questions 20-23)
    // ================================================================
    {
      key: 'target_channels',
      type: 'multi_select',
      question:
        'Where will you find and reach your target users? Pick the channels you plan to actively use.',
      helper:
        'Pick two or three channels to start, not all of them. Spreading yourself across eight channels means doing all of them badly. Focus on where your specific target users actually spend time, not where you personally hang out.',
      voiceEnabled: true,
      options: [
        {
          value: 'twitter_x',
          label: 'Twitter / X',
          description:
            'Good for developer tools, SaaS, and building in public. Works best if you already have an audience.',
        },
        {
          value: 'reddit',
          label: 'Reddit',
          description:
            'Subreddits are goldmines for niche products. Great for validation and early users, but self-promotion is punished.',
        },
        {
          value: 'product_hunt',
          label: 'Product Hunt',
          description:
            'A one-time launch spike. Good for awareness and backlinks, but rarely a sustainable channel.',
        },
        {
          value: 'hacker_news',
          label: 'Hacker News',
          description:
            'Technical audience. A front-page post can drive thousands of visits. Show HN is a well-known format for launches.',
        },
        {
          value: 'seo',
          label: 'SEO / organic search',
          description:
            'Content that ranks in Google over time. Slow to start but compounds. The best long-term channel for most SaaS.',
        },
        {
          value: 'youtube',
          label: 'YouTube',
          description:
            'Tutorials, demos, and walkthroughs. Builds trust and drives qualified traffic. Time-intensive to produce.',
        },
        {
          value: 'tiktok',
          label: 'TikTok',
          description:
            'Short-form video. Can drive massive awareness quickly. Best for consumer-facing or visually interesting products.',
        },
        {
          value: 'cold_email',
          label: 'Cold email outreach',
          description:
            'Direct outreach to potential customers. Works well for B2B products with clear buyer personas.',
        },
        {
          value: 'partnerships',
          label: 'Partnerships and integrations',
          description:
            'Getting listed in partner directories, app stores, or integration marketplaces. Slow but high-quality leads.',
        },
        {
          value: 'communities',
          label: 'Online communities (Slack, Discord, forums)',
          description:
            'Niche communities where your target users already gather. Requires genuine participation, not just posting links.',
        },
      ],
      followUpPrompt:
        'Assess whether their channel choices match their target user from Stage 2. If they are building a developer tool but did not pick Hacker News or GitHub, ask why. If they are building B2B SaaS but picked TikTok, challenge that. For each channel they picked, give one specific tactical tip. For Twitter/X: build in public and share progress, not just launch announcements. For Reddit: find the exact subreddits and participate for weeks before mentioning your product. For SEO: target long-tail comparison keywords like "alternative to [competitor]" and "best [category] for [niche]." For Product Hunt: it is a one-day event, not a strategy -- plan what happens the other 364 days.',
      stage: { number: 6, label: 'Audience & Distribution' },
      required: true,
    },
    {
      key: 'launch_strategy',
      type: 'open_text',
      question:
        'What does your launch plan look like? Walk me through how you will announce this product to the world.',
      helper:
        'A launch is not just posting a link somewhere. Think about it in phases: pre-launch (building anticipation, collecting emails, getting beta testers), launch day (coordinated push across your chosen channels), and post-launch (follow-up, iteration, sustained effort). Many successful indie launches involve weeks of preparation.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate the launch plan for common indie mistakes. If they plan a big-bang launch with no pre-launch audience building, flag the risk -- launching to zero followers is launching into a void. Recommend building a waitlist or beta group of at least 50-100 people before the public launch. If they mentioned Product Hunt, give specific tactical advice: launch on a Tuesday or Wednesday, prepare all assets in advance, line up supporters to comment with genuine feedback, and have a maker comment ready. If they plan to just "post it on Twitter," push them to think bigger -- what story are they telling? Why should anyone care?',
      stage: { number: 6, label: 'Audience & Distribution' },
      required: true,
    },
    {
      key: 'first_100_users',
      type: 'open_text',
      question:
        'Forget scale for a moment. How will you personally get your first 100 users? Name specific places, communities, or people you will reach out to.',
      helper:
        'The first 100 users almost never come from marketing at scale. They come from personal networks, specific online communities, one-on-one conversations, or doing things that do not scale -- like manually onboarding each user yourself. Paul Graham called this "doing things that do not scale" and it is the single most important advice for early-stage indie products.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate their plan for specificity and realism. If they gave concrete names of communities, subreddits, Slack groups, or people they know, validate that and push them to start engaging there now, before the product is ready. If their answer was vague -- "I will promote it on social media" -- push back hard. Ask them to name five specific people they would message on day one. Reference how Pieter Levels manually tweeted about NomadList and engaged in digital nomad forums one by one. How the first Buffer users came from Joel Gascoigne personally responding to every tweet about social media scheduling. The first 100 users are a personal effort, not a marketing campaign.',
      stage: { number: 6, label: 'Audience & Distribution' },
      required: true,
    },
    {
      key: 'content_marketing',
      type: 'single_select',
      question:
        'Do you plan to create content (blog posts, videos, social media) as part of your growth strategy?',
      helper:
        'Content marketing is the most reliable long-term growth channel for indie software, but it takes months to pay off. Blog posts that rank in Google can drive signups for years. Social media content builds trust and audience. But none of it works unless you actually commit to creating consistently.',
      voiceEnabled: true,
      options: [
        {
          value: 'yes_blog',
          label: 'Yes, primarily written content (blog, newsletter)',
          description:
            'SEO-focused articles, tutorials, comparisons, and thought leadership. Compounds over time.',
        },
        {
          value: 'yes_social',
          label: 'Yes, primarily social media content',
          description:
            'Regular posts on Twitter/X, LinkedIn, or other platforms. Building in public, sharing progress and insights.',
        },
        {
          value: 'yes_video',
          label: 'Yes, primarily video content',
          description:
            'YouTube tutorials, TikTok clips, or demo videos. High effort but high trust and engagement.',
        },
        {
          value: 'no_plan',
          label: 'No, not planning content marketing',
          description:
            'Will focus on other growth channels like product-led growth, partnerships, or paid acquisition.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description:
            'Open to it but not sure what kind of content or how much effort it takes.',
        },
      ],
      followUpPrompt:
        'Give specific content strategy advice based on their choice and product type. If blog: recommend starting with three types of posts before launch -- a comparison post ("Product X vs Product Y vs yours"), a tutorial that solves the problem their product addresses, and a "building in public" origin story. These three post types cover SEO, education, and narrative. If social: suggest the "build in public" format -- sharing revenue numbers, user feedback, design decisions, and lessons learned. Reference how indie makers like Jon Yongfook and Danny Postma built significant audiences this way. If video: note the high production cost but suggest starting with simple screen recordings and Loom-style demos before investing in polished production. If no plan: warn that without content, they are entirely dependent on paid channels or virality, both of which are unreliable for indie software.',
      stage: { number: 6, label: 'Audience & Distribution' },
      required: true,
    },

    // ================================================================
    // STAGE 7 -- Resources (questions 24-27)
    // ================================================================
    {
      key: 'builder_profile',
      type: 'single_select',
      question:
        'What best describes your skills as a builder?',
      helper:
        'Be honest. The plan we create together needs to account for what you can actually do versus what you need help with. Every skill gap is either something you learn, outsource, or design around.',
      voiceEnabled: true,
      options: [
        {
          value: 'full_stack',
          label: 'Full-stack developer',
          description:
            'Comfortable building both frontend and backend. Can ship a complete product independently.',
        },
        {
          value: 'frontend_only',
          label: 'Frontend developer',
          description:
            'Strong with UI, HTML/CSS/JS, and frameworks like React. Backend and infrastructure are weaker areas.',
        },
        {
          value: 'backend_only',
          label: 'Backend developer',
          description:
            'Strong with APIs, databases, and server logic. UI design and frontend polish are weaker areas.',
        },
        {
          value: 'non_technical',
          label: 'Non-technical',
          description:
            'No coding experience. Will rely on no-code tools, AI coding tools, or hiring developers.',
        },
        {
          value: 'designer_who_codes',
          label: 'Designer who codes',
          description:
            'Strong design instincts and can build frontends, but backend logic and infrastructure are unfamiliar.',
        },
      ],
      followUpPrompt:
        'Tailor the plan direction based on their builder profile. If full-stack: acknowledge they can move fast but warn about the trap of over-engineering -- indie products do not need perfect architecture, they need to ship. If frontend-only: recommend Supabase or Firebase for the backend to avoid the parts they are weakest at, and suggest Vercel for deployment. If backend-only: recommend using a component library like shadcn/ui or Tailwind UI to compensate for design weakness, or budget for a designer to do the first pass. If non-technical: be direct about the limitations -- AI tools can help, but they need to be realistic about what they can maintain and debug. Recommend no-code tools for validation before investing in custom code. If designer who codes: validate that design is a genuine competitive advantage in indie software where most products look terrible.',
      stage: { number: 7, label: 'Resources' },
      required: true,
    },
    {
      key: 'budget_range',
      type: 'single_select',
      question:
        'What is your total budget for the first six months, including tools, hosting, domains, and any outside help?',
      helper:
        'Be realistic. Include everything: domain registration ($10-15), hosting ($5-50/month), AI tool subscriptions ($20-100/month), payment processor fees, and any freelancer costs. Many successful indie products launched for under $500 total.',
      voiceEnabled: true,
      options: [
        {
          value: 'bootstrapped_0',
          label: '$0 -- Free tools only',
          description:
            'Using only free tiers. Limits tool choices but many great products started this way.',
        },
        {
          value: 'under_1k',
          label: 'Under $1,000',
          description:
            'Enough for a domain, basic hosting, one or two paid tools, and maybe a month of a designer on Fiverr.',
        },
        {
          value: '1k_to_5k',
          label: '$1,000 to $5,000',
          description:
            'Comfortable budget for tools, hosting, some freelance help, and a small marketing experiment.',
        },
        {
          value: '5k_to_20k',
          label: '$5,000 to $20,000',
          description:
            'Significant investment. Can afford dedicated development help, professional design, and paid marketing tests.',
        },
        {
          value: '20k_plus',
          label: 'Over $20,000',
          description:
            'Substantial budget. Can hire contractors, run paid ads, and invest in infrastructure.',
        },
      ],
      followUpPrompt:
        'Give budget-specific advice. If $0: lay out the free stack -- Vercel free tier for hosting, Supabase free tier for database, GitHub for code, Plausible community edition or Umami for analytics, and Resend free tier for email. It is entirely possible to build a real SaaS product for $0 in tooling costs. If under $1K: prioritize spending on a good domain name and one paid tool that saves the most time. If $1K-5K: suggest allocating roughly 40% to development tools, 30% to design help, and 30% to initial marketing experiments. If $5K+: recommend setting aside money for a professional landing page and early paid acquisition experiments to validate messaging, but warn against spending too much before product-market fit.',
      stage: { number: 7, label: 'Resources' },
      required: true,
    },
    {
      key: 'time_commitment',
      type: 'single_select',
      question:
        'How much time can you realistically commit to this project each week?',
      helper:
        'Be honest with yourself. Overcommitting leads to burnout. Undercommitting leads to a project that never ships. Both are common indie failure modes. The timeline we build together depends on this number being accurate.',
      voiceEnabled: true,
      options: [
        {
          value: 'nights_weekends',
          label: 'Nights and weekends only (5-10 hours)',
          description:
            'Building around a full-time job or other obligations. Progress is steady but slow.',
        },
        {
          value: 'part_time',
          label: 'Part-time (15-25 hours per week)',
          description:
            'Significant commitment. Either reduced other work or very disciplined scheduling.',
        },
        {
          value: 'full_time',
          label: 'Full-time on this project (40+ hours)',
          description:
            'This is the primary focus. Fast progress possible but runway pressure may exist.',
        },
        {
          value: 'team_of_2_3',
          label: 'Team of 2-3 people (combined 60+ hours)',
          description:
            'Small team splitting the work. Can cover more ground but needs coordination.',
        },
        {
          value: 'larger_team',
          label: 'Larger team (4+ people)',
          description:
            'A dedicated team. Significant velocity but higher coordination overhead.',
        },
      ],
      followUpPrompt:
        'Calibrate expectations based on their time commitment. If nights and weekends: set realistic expectations -- a focused MVP for a SaaS product takes roughly 200-400 hours of work. At 8 hours per week, that is 6-12 months. Recommend ruthless scope cutting and suggest building the smallest possible version that delivers value. If part-time: they can ship an MVP in 2-3 months with discipline. Recommend time-boxing features -- if a feature takes more than a week of part-time work, it is too big for v1. If full-time: fastest path to launch, but warn about isolation and the importance of getting user feedback early rather than building in a vacuum for months. If team: ask about role division and how they will avoid the coordination tax that kills small team productivity.',
      stage: { number: 7, label: 'Resources' },
      required: true,
    },
    {
      key: 'timeline_to_launch',
      type: 'single_select',
      question:
        'When do you want version one in the hands of real users?',
      helper:
        'This is not when the product is "done" -- it is when the first version is usable enough that real people can try it and give you feedback. Ship early. The longer you wait, the more assumptions you bake in without validation.',
      voiceEnabled: true,
      options: [
        {
          value: '2_weeks',
          label: '2 weeks',
          description:
            'Aggressive. Possible only with an extremely narrow scope and existing technical skills.',
        },
        {
          value: '1_month',
          label: '1 month',
          description:
            'Tight but achievable for a simple product with one core feature and a focused builder.',
        },
        {
          value: '3_months',
          label: '3 months',
          description:
            'A realistic timeline for a solid MVP with 3-5 features, basic polish, and payments set up.',
        },
        {
          value: '6_months',
          label: '6 months',
          description:
            'Plenty of time for a more complete v1. Watch for scope creep -- 6 months has a way of becoming 12.',
        },
        {
          value: 'no_rush',
          label: 'No specific deadline',
          description:
            'This is a long-term side project. No external pressure to ship by a particular date.',
        },
      ],
      followUpPrompt:
        'Cross-reference their timeline with their time commitment and scope. If they said 2 weeks with nights-and-weekends availability, be direct that the math does not work -- either the timeline or the scope needs to change. If they said 6 months with full-time availability, challenge them to ship in 2 months instead and use the remaining 4 to iterate based on user feedback. If no rush, warn about the most common indie failure: the project that is perpetually "almost ready" but never ships. Set a concrete ship date even if it is arbitrary, because deadlines create focus. Reference the idea that "if it is not shipped, it is not a product -- it is a hobby."',
      stage: { number: 7, label: 'Resources' },
      required: true,
    },

    // ================================================================
    // STAGE 8 -- Risks (questions 28-31)
    // ================================================================
    {
      key: 'biggest_fear',
      type: 'open_text',
      question:
        'What is the thing you are most afraid of with this project? The scenario that keeps you up at night.',
      helper:
        'Everyone building something has a fear. Maybe it is "nobody will pay for this." Maybe it is "a big company will copy it in a week." Maybe it is "I will burn out before I finish." Name the fear so we can plan around it instead of pretending it does not exist.',
      voiceEnabled: true,
      followUpPrompt:
        'Take their fear seriously and give a direct, honest response. Do not dismiss it. If they fear nobody will pay: validate that this is the most common and most legitimate risk, and recommend they pre-sell or get letters of intent before building. If they fear a big company will copy them: remind them that big companies are slow, distracted, and rarely build for niche use cases well -- but also acknowledge that if the idea is too simple, it is a real risk. If they fear burnout: ask about their support system and whether they have a co-founder or accountability partner. If they fear technical failure: identify the specific technical risk and build it as a spike or proof of concept first. Turn the fear into a specific action item.',
      stage: { number: 8, label: 'Risks' },
      required: true,
    },
    {
      key: 'technical_unknowns',
      type: 'open_text',
      question:
        'What are the technical parts of this project that you are least confident about? Where are the unknowns?',
      helper:
        'Common technical unknowns for indie products: real-time data sync, payment integration, email deliverability, file processing at scale, complex permissions, third-party API reliability, or mobile app store approval. Even experienced developers have blind spots. Name yours.',
      voiceEnabled: true,
      followUpPrompt:
        'For each technical unknown they named, give concrete advice on how to de-risk it. If it is payments: recommend starting with Stripe Checkout or Lemon Squeezy hosted checkout page -- do not build custom payment flows for v1. If it is real-time: suggest starting with polling every 30 seconds instead of WebSockets and upgrading later. If it is email deliverability: recommend Resend or Postmark over building on raw SMTP. If it is mobile app approval: warn about the App Store review process timeline and suggest launching as a PWA first. For each unknown, suggest building a throwaway prototype of just that piece before committing it to the main product. Prototype the riskiest part first, not last.',
      stage: { number: 8, label: 'Risks' },
      required: true,
    },
    {
      key: 'what_if_no_users',
      type: 'open_text',
      question:
        'Imagine you launch and after one month you have fewer than 10 users. What is your plan B? What would you change, test, or try differently?',
      helper:
        'This is not pessimism -- it is planning. Most indie products do not find traction on the first try. The founders who succeed are the ones who plan for this scenario and iterate rather than giving up. Your plan B might be: change the positioning, target a different audience, pivot the pricing, try a different distribution channel, or talk to the 10 users you do have and figure out what they actually need.',
      voiceEnabled: true,
      followUpPrompt:
        'Evaluate their plan B for realism. If they said "I would shut it down," challenge them -- most successful indie products pivoted at least once before finding traction. If they said "I would try harder at marketing," push for specifics. If they said "I would talk to the users I have," validate that strongly -- this is the right instinct. The best plan B for any indie product is: talk to the few users you have, understand why they signed up, understand why others did not, and iterate on positioning and product based on those conversations. Reference how Superhuman used the "Sean Ellis test" -- asking users how disappointed they would be if the product disappeared -- to find product-market fit through iteration, not a single launch.',
      stage: { number: 8, label: 'Risks' },
      required: true,
    },
    {
      key: 'legal_compliance',
      type: 'multi_select',
      question:
        'Are there any legal or compliance requirements that apply to your product?',
      helper:
        'Compliance requirements depend on what data you collect, who your users are, and what industry you serve. Getting this wrong can be expensive. If you are not sure, that is an honest and important answer -- it means we need to include compliance research in the plan.',
      voiceEnabled: true,
      options: [
        {
          value: 'gdpr',
          label: 'GDPR (EU data privacy)',
          description:
            'Required if you have any users in the European Union. Covers data collection, consent, right to deletion, and data portability.',
        },
        {
          value: 'hipaa',
          label: 'HIPAA (US healthcare data)',
          description:
            'Required if you handle protected health information. Strict security, audit, and access control requirements.',
        },
        {
          value: 'sox',
          label: 'SOX (financial reporting)',
          description:
            'Required if your product handles financial data for publicly traded companies. Audit trails and access controls.',
        },
        {
          value: 'pci',
          label: 'PCI DSS (payment card data)',
          description:
            'Required if you directly handle credit card numbers. Using Stripe or Paddle as a processor avoids most PCI obligations.',
        },
        {
          value: 'none',
          label: 'None that I know of',
          description:
            'No specific regulatory requirements apply to this product or its users.',
        },
        {
          value: 'not_sure',
          label: 'Not sure',
          description:
            'Need to research what compliance requirements apply.',
        },
      ],
      followUpPrompt:
        'Give specific compliance guidance based on their selections. If GDPR: most indie SaaS products need it since the internet is global. The minimum viable compliance includes a privacy policy, cookie consent, a way for users to export their data, and a way for users to request deletion. Recommend using a service like Iubenda for the privacy policy and making data export a v1 feature. If HIPAA: be direct that HIPAA compliance is expensive and complex -- they need a BAA with every service provider, encrypted data at rest and in transit, audit logging, and access controls. Suggest validating the business model thoroughly before investing in HIPAA compliance. If PCI: reassure them that using Stripe, Paddle, or Lemon Squeezy handles PCI for them -- just never store card numbers in their own database. If not sure: recommend a 30-minute consultation with a startup lawyer for $200-300 -- cheap insurance against expensive problems later.',
      stage: { number: 8, label: 'Risks' },
      required: true,
    },

    // ================================================================
    // STAGE 9 -- Success (questions 32-35)
    // ================================================================
    {
      key: 'six_month_goal',
      type: 'open_text',
      question:
        'Six months from today, what does success look like for this product? Describe the specific situation you want to be in.',
      helper:
        'Paint a concrete picture. Not "the product is successful" but something like: "I have 200 paying customers at $29/month, the product is stable, I am spending 2 hours a week on support, and I am working on the V2 features my users have been requesting." The more specific the picture, the better we can plan backward from it.',
      voiceEnabled: true,
      followUpPrompt:
        'Assess whether their six-month goal is realistic given their budget, time commitment, and market. If they described $50K MRR in six months with a nights-and-weekends schedule, gently recalibrate -- most bootstrapped SaaS products take 12-18 months to reach $10K MRR. If their goal is modest and realistic, validate it and note that focus is a superpower. If they only described product milestones without user or revenue numbers, push them to add those -- a product without users is a project, not a business. Reference benchmarks: the median bootstrapped SaaS takes 6-12 months to get its first 100 paying customers.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
    {
      key: 'success_number',
      type: 'open_text',
      question:
        'Give me a single number that would make you feel this project was worth the effort. It could be revenue, users, downloads, or something else entirely. What is the number and what does it measure?',
      helper:
        'This is your North Star metric. Everything in the plan should point toward this number. Examples: "$3,000 MRR," "1,000 weekly active users," "500 paid downloads," or "10 enterprise contracts." One number. Not five.',
      voiceEnabled: true,
      followUpPrompt:
        'Validate or challenge the number. If it is a revenue target, work backward: at their planned price point, how many customers do they need? Is that realistic given their distribution plan? If it is a user target without revenue, ask whether the goal is to build an audience before monetizing or whether they are avoiding the monetization question. If the number is too small to justify the effort, say so -- building a product for $500/month in revenue when they could freelance for $5,000/month is a passion project, not a business, and that is fine as long as they know it. If the number is ambitious but achievable, validate it and note the key levers: conversion rate, churn rate, and acquisition cost.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
    {
      key: 'exit_vision',
      type: 'single_select',
      question:
        'What is the long-term vision for this product? Where do you see it in 3 to 5 years?',
      helper:
        'There is no wrong answer here. Some of the best indie products are lifestyle businesses that fund a great life. Others grow into companies worth acquiring. Others become beloved open source projects. Knowing your endgame shapes decisions you will make starting now.',
      voiceEnabled: true,
      options: [
        {
          value: 'lifestyle_business',
          label: 'Lifestyle business',
          description:
            'A profitable product that funds the life I want to live. No investors, no exit pressure, no growth-at-all-costs.',
        },
        {
          value: 'grow_and_sell',
          label: 'Grow and sell',
          description:
            'Build it to a meaningful size and sell it, either to a strategic buyer or through a marketplace like Acquire.com.',
        },
        {
          value: 'vc_scale',
          label: 'Venture-scale ambition',
          description:
            'Start indie, then raise funding if the product finds strong traction. Aiming for a large outcome.',
        },
        {
          value: 'open_source_community',
          label: 'Open source community',
          description:
            'Build an open source project with a community around it. Monetize through hosting, support, or premium features.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description:
            'Want to see how the product develops before committing to a long-term path.',
        },
      ],
      followUpPrompt:
        'Give path-specific advice. If lifestyle business: validate this as a worthy and underrated goal. Recommend optimizing for profit margin and personal freedom from day one -- avoid building features that require 24/7 support, keep the stack simple, and automate everything that can be automated. If grow and sell: note that SaaS businesses typically sell for 3-5x annual revenue, so building to $200K ARR would mean a $600K-1M exit. Recommend tracking metrics that buyers care about: MRR, churn rate, CAC, and LTV from the start. If VC-scale: be honest that most indie products are not VC-backable, but some that start indie and find strong PMF do raise successfully. If open source: discuss the challenges of monetizing open source and reference successful models like GitLab, Supabase, and PostHog. If not sure: suggest defaulting to lifestyle business decisions until the data tells them otherwise -- it keeps options open.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
    {
      key: 'anything_else',
      type: 'open_text',
      question:
        'Is there anything else I should know about this project? Constraints, context, previous attempts, or anything that did not fit neatly into the earlier questions.',
      helper:
        'This is your catch-all. Maybe you tried building this before and it failed for a specific reason. Maybe you have a unique distribution advantage you did not mention. Maybe there is a deadline tied to an external event. Anything that matters goes here. If there is nothing to add, just say so.',
      voiceEnabled: true,
      followUpPrompt:
        'If they shared additional context, acknowledge it specifically and note how it changes or reinforces the plan. If they mentioned a previous failed attempt, ask what went wrong and commit to addressing that specific failure mode in the plan. If they mentioned a unique advantage -- existing audience, industry connections, relevant domain expertise -- call it out as a genuine asset and plan to use it. If they said nothing to add, summarize the key themes from the entire interview: the product concept, the target user, the competitive position, the monetization approach, and the launch strategy. Confirm that you have everything needed to generate a complete project plan.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
  ],
  artifactTypes: [
    'demand_analysis',
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
    'demand_analysis',
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
