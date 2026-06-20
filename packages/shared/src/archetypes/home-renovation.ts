// ============================================================
// Jetdale — Home Renovation Archetype Discovery Script
// 35 questions across 9 stages. Production-ready.
// ============================================================

import type { ArchetypeDefinition } from '../types';

export const homeRenovation: ArchetypeDefinition = {
  slug: 'home_renovation',
  name: 'Home renovation',
  category: 'physical',
  scriptVersion: 1,
  expertPersona:
    'You are a licensed general contractor with 15 years of residential renovation experience. You have managed over 300 projects ranging from kitchen remodels to full gut renovations. You are practical, detail-oriented, and honest about costs and timelines. You will push back on unrealistic budgets and gently correct common homeowner misconceptions. You know permit processes, subcontractor management, and material lead times inside and out.',
  estimatedMinutes: 25,
  iconName: 'hammer',
  description:
    'For homeowners planning renovations, remodels, or additions. Covers scope, permits, contractors, budget, timeline, materials, and contingency planning.',
  questions: [
    // ================================================================
    // STAGE 1 — The Spark (questions 1-3)
    // ================================================================
    {
      key: 'idea_pitch',
      type: 'open_text',
      question: 'What renovation are you planning?',
      helper:
        'A kitchen gut, a bathroom refresh, a second-story addition, finishing the basement -- describe what you want to do in plain language.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge the project directly. Identify the general category of renovation this falls into (kitchen remodel, bathroom remodel, addition, whole-house renovation, etc.). Mention one practical consideration specific to this type of project -- for example, kitchen remodels typically take 6-12 weeks and require temporary cooking arrangements, or additions require foundation work and structural engineering. Keep it to 2-3 sentences and transition to confirming the archetype.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'archetype_confirm',
      type: 'archetype_confirm',
      question:
        'This sounds like a home renovation project. Does that match what you have in mind?',
      helper:
        'We will tailor all the questions and planning documents to residential renovation work.',
      voiceEnabled: false,
      options: [
        {
          value: 'kitchen_remodel',
          label: 'Kitchen remodel',
          description:
            'Updating or gutting the kitchen -- cabinets, countertops, appliances, layout changes.',
        },
        {
          value: 'bathroom_remodel',
          label: 'Bathroom remodel',
          description:
            'Updating one or more bathrooms -- tile, fixtures, layout, plumbing.',
        },
        {
          value: 'addition',
          label: 'Addition',
          description:
            'Adding square footage to the home -- bump-out, second story, garage conversion.',
        },
        {
          value: 'full_renovation',
          label: 'Full renovation',
          description:
            'Gut renovation or major remodel touching most of the house.',
        },
        {
          value: 'basement_finish',
          label: 'Basement finish',
          description:
            'Converting an unfinished basement into livable space.',
        },
        {
          value: 'outdoor_landscape',
          label: 'Outdoor or landscape',
          description:
            'Deck, patio, landscaping, pool, outdoor kitchen, or fencing.',
        },
        {
          value: 'other',
          label: 'Something else',
          description:
            'A different type of home improvement project.',
        },
      ],
      followUpPrompt:
        'Confirm their renovation type. Mention one thing that makes this type of project distinct from others -- for example, kitchen remodels involve the most trades (plumbing, electrical, cabinets, countertops, flooring, appliances), while additions require architectural plans and structural engineering before anything else begins. Transition to asking about their motivation.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'motivation',
      type: 'open_text',
      question: 'Why are you doing this now? What is driving the timing?',
      helper:
        'Growing family, something broke, preparing to sell, always wanted to, just bought the house -- there are no wrong answers.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge their motivation without judgment. If they are renovating to sell, mention that not all renovations return their cost at resale -- kitchens and bathrooms typically return 60-80% while high-end custom work returns less. If they are renovating for personal use, affirm that living in a space that works for them is worth the investment. If something is broken or failing, note that reactive repairs often cost more when delayed. Transition to scoping the project.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },

    // ================================================================
    // STAGE 2 — Scope (questions 4-7)
    // ================================================================
    {
      key: 'rooms_involved',
      type: 'multi_select',
      question: 'Which areas of the home are involved in this renovation?',
      helper:
        'Select all that apply. Even if the main project is a kitchen remodel, include other rooms if they will be touched.',
      voiceEnabled: false,
      options: [
        { value: 'kitchen', label: 'Kitchen', description: 'Cooking, prep, and dining areas' },
        { value: 'bathrooms', label: 'Bathrooms', description: 'Any bathroom -- master, guest, half-bath, powder room' },
        { value: 'bedrooms', label: 'Bedrooms', description: 'Master suite, guest rooms, nursery' },
        { value: 'living_areas', label: 'Living areas', description: 'Living room, family room, den, dining room' },
        { value: 'basement', label: 'Basement', description: 'Finished or unfinished basement space' },
        { value: 'attic', label: 'Attic', description: 'Attic conversion or insulation work' },
        { value: 'garage', label: 'Garage', description: 'Garage conversion, workshop, or storage' },
        { value: 'exterior', label: 'Exterior', description: 'Siding, windows, roofing, front entry' },
        { value: 'outdoor', label: 'Outdoor', description: 'Deck, patio, pool, landscaping, fencing' },
        { value: 'whole_house', label: 'Whole house', description: 'Full renovation touching everything' },
      ],
      followUpPrompt:
        'Summarize the scope based on their selections. If they selected 4 or more areas, note that this is a significant project that will benefit from phased planning to avoid trade conflicts. If they selected whole_house, mention that gut renovations typically take 4-8 months and require careful sequencing -- demolition first, then structural, then rough-in (plumbing, electrical, HVAC), then insulation and drywall, then finishes. Transition to structural changes.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'structural_changes',
      type: 'single_select',
      question: 'How much structural work is involved?',
      helper:
        'Cosmetic means paint, fixtures, and surfaces. Structural means moving walls, adding beams, changing the footprint, or modifying the roof line.',
      voiceEnabled: false,
      options: [
        {
          value: 'cosmetic_only',
          label: 'Cosmetic only',
          description: 'Paint, fixtures, surfaces, appliances -- no walls moving.',
        },
        {
          value: 'minor_structural',
          label: 'Minor structural',
          description: 'Removing a non-load-bearing wall, widening a doorway, adding a window.',
        },
        {
          value: 'major_structural',
          label: 'Major structural',
          description: 'Removing load-bearing walls, adding beams, modifying floor joists or roof.',
        },
        {
          value: 'addition',
          label: 'Addition or expansion',
          description: 'Adding square footage, a new story, or extending the foundation.',
        },
        {
          value: 'not_sure',
          label: 'Not sure yet',
          description: 'Need a contractor or engineer to assess.',
        },
      ],
      followUpPrompt:
        'If cosmetic only, note that the project is simpler from a permitting and engineering perspective but costs can still add up quickly with high-end finishes. If minor structural, mention that even removing a non-load-bearing wall requires confirming it is truly non-load-bearing -- always get a professional opinion. If major structural or addition, flag that a structural engineer will be required and the permit process will be longer (typically 4-12 weeks depending on the municipality). If not sure, strongly recommend getting a contractor walkthrough before committing to a budget. Transition to square footage.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'square_footage',
      type: 'single_select',
      question: 'Roughly how much square footage is being renovated or added?',
      helper:
        'For reference, a typical kitchen is 100-200 sq ft, a bathroom is 40-100 sq ft, and a master suite is 200-400 sq ft.',
      voiceEnabled: false,
      options: [
        { value: 'under_200', label: 'Under 200 sq ft', description: 'A single room like a bathroom or small kitchen' },
        { value: '200_to_500', label: '200-500 sq ft', description: 'A large kitchen, master bath, or couple of small rooms' },
        { value: '500_to_1000', label: '500-1,000 sq ft', description: 'Multiple rooms or a small addition' },
        { value: '1000_to_2000', label: '1,000-2,000 sq ft', description: 'Major renovation or medium addition' },
        { value: 'over_2000', label: 'Over 2,000 sq ft', description: 'Large addition or near-complete renovation' },
        { value: 'not_sure', label: 'Not sure', description: 'Will need to measure or estimate later' },
      ],
      followUpPrompt:
        'Use their square footage to provide a rough cost context. As a general rule of thumb, renovation costs typically run $100-$250 per square foot for mid-range work and $250-$500+ per square foot for high-end finishes, though this varies heavily by region and scope. Do not give a final number -- just set expectations. Mention that kitchens and bathrooms cost more per square foot than bedrooms or living areas because of plumbing, electrical, cabinetry, and tile work. Transition to home age.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'home_age',
      type: 'single_select',
      question: 'How old is the home?',
      helper:
        'The age of the house affects what you might find behind the walls: old wiring, lead paint, asbestos, outdated plumbing, or non-standard framing.',
      voiceEnabled: false,
      options: [
        { value: 'under_10_years', label: 'Under 10 years', description: 'Recently built with modern codes' },
        { value: '10_to_30', label: '10-30 years', description: 'May need some updates but generally solid' },
        { value: '30_to_60', label: '30-60 years', description: 'Likely needs electrical and plumbing evaluation' },
        { value: '60_to_100', label: '60-100 years', description: 'Original systems may need full replacement' },
        { value: 'over_100', label: 'Over 100 years', description: 'Historic home -- special materials and code considerations' },
        { value: 'not_sure', label: 'Not sure', description: 'Will need to research the property records' },
      ],
      followUpPrompt:
        'If the home is under 10 years old, note that surprises are unlikely but not impossible. If 30-60 years, mention that homes from the 1960s-1990s often have galvanized steel plumbing, aluminum wiring, or early polybutylene pipes that may need replacing once walls are opened. If 60-100 years, flag that knob-and-tube wiring, lead paint (pre-1978), and asbestos insulation are common discoveries that add $2,000-$15,000+ to remediation costs. If over 100 years, mention that historic homes often have non-standard framing dimensions and may be subject to preservation requirements. Transition to budget.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },

    // ================================================================
    // STAGE 3 — Budget (questions 8-11)
    // ================================================================
    {
      key: 'total_budget',
      type: 'single_select',
      question: 'What is your total budget for this renovation?',
      helper:
        'Include everything: materials, labor, permits, design fees, and a contingency buffer. The plan only works if this number is honest.',
      voiceEnabled: false,
      options: [
        {
          value: 'under_10k',
          label: 'Under $10,000',
          description: 'Cosmetic refresh -- paint, fixtures, minor updates.',
        },
        {
          value: '10k_to_25k',
          label: '$10,000-$25,000',
          description: 'A single-room remodel or targeted upgrades.',
        },
        {
          value: '25k_to_50k',
          label: '$25,000-$50,000',
          description: 'A solid kitchen or bathroom renovation.',
        },
        {
          value: '50k_to_100k',
          label: '$50,000-$100,000',
          description: 'Major remodel or small addition.',
        },
        {
          value: '100k_to_250k',
          label: '$100,000-$250,000',
          description: 'Large-scale renovation or significant addition.',
        },
        {
          value: '250k_plus',
          label: '$250,000+',
          description: 'Full gut renovation, large addition, or high-end custom work.',
        },
        {
          value: 'figuring_it_out',
          label: 'Still figuring it out',
          description: 'Need help understanding what this will cost.',
        },
      ],
      followUpPrompt:
        'Do not judge any budget. Provide a reality check based on their scope and square footage. For context: a mid-range kitchen remodel averages $25,000-$75,000 nationally, a bathroom $10,000-$35,000, a basement finish $20,000-$50,000, and a room addition $80,000-$200,000+. If their budget seems tight for the scope described, say so clearly but respectfully -- it is better to know now than after demolition starts. If they are still figuring it out, mention that getting 2-3 contractor bids is the fastest way to calibrate. Transition to financing.',
      stage: { number: 3, label: 'Budget' },
      required: true,
    },
    {
      key: 'financing',
      type: 'single_select',
      question: 'How are you planning to pay for this?',
      helper:
        'Different financing methods affect your timeline and flexibility. Some contractors offer payment schedules; others require deposits up front.',
      voiceEnabled: false,
      options: [
        {
          value: 'cash_savings',
          label: 'Cash or savings',
          description: 'Paying out of pocket with money on hand.',
        },
        {
          value: 'heloc',
          label: 'HELOC (home equity line of credit)',
          description: 'Drawing against home equity as needed.',
        },
        {
          value: 'home_equity_loan',
          label: 'Home equity loan',
          description: 'Fixed lump sum borrowed against equity.',
        },
        {
          value: 'construction_loan',
          label: 'Construction loan',
          description: 'Short-term loan specifically for construction, converts to mortgage.',
        },
        {
          value: 'credit',
          label: 'Credit cards or personal loan',
          description: 'Higher-interest borrowing for smaller projects.',
        },
        {
          value: 'combination',
          label: 'Combination of sources',
          description: 'Mixing savings with a loan or credit line.',
        },
        {
          value: 'not_decided',
          label: 'Not decided yet',
          description: 'Still evaluating options.',
        },
      ],
      followUpPrompt:
        'If cash, note that this is the simplest approach and gives them the most negotiating power with contractors. If HELOC, mention that draw schedules align well with phased renovation payments. If construction loan, note that the lender will typically require approved plans and a licensed contractor before funding. If credit cards, gently flag that interest rates of 18-25% can add thousands to the project cost and suggest exploring a HELOC if they have equity. Do not lecture -- just provide the information. Transition to budget priorities.',
      stage: { number: 3, label: 'Budget' },
      required: true,
    },
    {
      key: 'budget_priorities',
      type: 'open_text',
      question:
        'Where do you want to spend more, and where are you willing to cut corners?',
      helper:
        'For example: "Splurge on the countertops and appliances, save on cabinet hardware and light fixtures." Every budget has trade-offs.',
      voiceEnabled: true,
      followUpPrompt:
        'Affirm their priorities. Offer one specific cost-saving tip related to what they want to save on -- for example, stock cabinets look nearly identical to custom at 40-60% of the cost, or luxury vinyl plank has become a credible alternative to hardwood at a fraction of the price. If they want to splurge on something, validate that it makes sense for the project. Mention that the areas with the highest cost variance are cabinets, countertops, tile, and appliances -- those are the best places to flex up or down. Transition to contingency.',
      stage: { number: 3, label: 'Budget' },
      required: true,
    },
    {
      key: 'contingency_comfort',
      type: 'single_select',
      question: 'Do you have a contingency buffer built into your budget?',
      helper:
        'A contingency is extra money set aside for surprises -- and in renovation, there are always surprises.',
      voiceEnabled: false,
      options: [
        {
          value: 'included_10_pct',
          label: 'Yes, about 10%',
          description: 'I have 10% extra set aside for surprises.',
        },
        {
          value: 'included_20_pct',
          label: 'Yes, about 20%',
          description: 'I have 20% extra set aside -- ready for the unexpected.',
        },
        {
          value: 'no_contingency',
          label: 'No contingency built in',
          description: 'The budget number is the absolute max.',
        },
        {
          value: 'what_is_contingency',
          label: 'What is a contingency?',
          description: 'Not familiar with this concept.',
        },
      ],
      followUpPrompt:
        'If they have 10%, that is the minimum recommended for cosmetic renovations. For projects involving plumbing, electrical, or structural work, 15-20% is strongly recommended because opening walls in older homes almost always reveals something unexpected -- rotted subfloor, outdated wiring, plumbing that does not meet code. If they have no contingency, be direct: renovations without a contingency buffer are the number one cause of stalled projects. If they asked what a contingency is, explain it clearly -- it is money set aside specifically for the unknown problems that appear once work begins. Every experienced contractor expects change orders. Transition to timeline.',
      stage: { number: 3, label: 'Budget' },
      required: true,
    },

    // ================================================================
    // STAGE 4 — Timeline (questions 12-14)
    // ================================================================
    {
      key: 'target_start',
      type: 'single_select',
      question: 'When do you want to start construction?',
      helper:
        'Note that "start" means demolition day, not planning. Design, permits, and material ordering happen before that.',
      voiceEnabled: false,
      options: [
        {
          value: 'asap',
          label: 'As soon as possible',
          description: 'Ready to go once the plan is in place.',
        },
        {
          value: '1_to_3_months',
          label: '1-3 months from now',
          description: 'Some runway for planning and bids.',
        },
        {
          value: '3_to_6_months',
          label: '3-6 months from now',
          description: 'Good amount of time to plan properly.',
        },
        {
          value: '6_to_12_months',
          label: '6-12 months from now',
          description: 'Long runway -- can be thorough.',
        },
        {
          value: 'flexible',
          label: 'Flexible / no rush',
          description: 'Will start when everything is ready.',
        },
      ],
      followUpPrompt:
        'If ASAP, set expectations: even a straightforward remodel needs 2-4 weeks of planning, bidding, and material ordering before demo day. Permit approval alone can take 2-8 weeks depending on the municipality. If 1-3 months, that is a workable timeline for most projects under $100K. If 3-6 months or more, they have excellent planning runway -- use it to get multiple bids and lock in material pricing. Mention that contractor availability varies by season; spring and summer are peak demand, so booking early matters. Transition to hard deadlines.',
      stage: { number: 4, label: 'Timeline' },
      required: true,
    },
    {
      key: 'hard_deadline',
      type: 'open_text',
      question:
        'Is there a hard deadline driving this? A baby on the way, a holiday, a listing date, a family gathering?',
      helper:
        'If there is an event or date that makes this time-sensitive, we need to plan around it.',
      voiceEnabled: true,
      followUpPrompt:
        'If they have a hard deadline, take it seriously. Work backward from that date: subtract 2 weeks for punch list and final inspections, then subtract the estimated construction duration, then subtract 4-8 weeks for design, permits, and procurement. If the math does not work, say so honestly -- it is better to adjust scope now than to rush and get a bad result. If there is no hard deadline, affirm that flexible timelines lead to better outcomes because contractors are not cutting corners to hit an arbitrary date. Transition to living situation.',
      stage: { number: 4, label: 'Timeline' },
      required: false,
    },
    {
      key: 'living_situation',
      type: 'single_select',
      question: 'Where will you live during construction?',
      helper:
        'This is a bigger deal than most people realize. Dust, noise, no kitchen, no bathroom -- it adds up fast.',
      voiceEnabled: false,
      options: [
        {
          value: 'stay_in_home',
          label: 'Stay in the home during construction',
          description: 'Living through the renovation.',
        },
        {
          value: 'partial_relocate',
          label: 'Partial relocation',
          description: 'Moving out for the worst phases, staying for the rest.',
        },
        {
          value: 'fully_relocate',
          label: 'Fully relocate until it is done',
          description: 'Staying elsewhere for the entire project.',
        },
        {
          value: 'not_applicable',
          label: 'Not applicable',
          description: 'Investment property, second home, or not living there.',
        },
      ],
      followUpPrompt:
        'If staying in the home, be honest: kitchen remodels without a functioning kitchen last 6-12 weeks on average, and the dust from drywall and demolition gets everywhere even with plastic barriers. Recommend setting up a temporary kitchen station with a microwave, hot plate, and cooler. If partially relocating, suggest planning the move-out around the demolition and rough-in phases when the house is most disrupted. If fully relocating, note that this actually speeds up construction because contractors can work without worrying about occupant access and safety -- budget $1,500-$4,000+ per month for temporary housing. Transition to permits.',
      stage: { number: 4, label: 'Timeline' },
      required: true,
    },

    // ================================================================
    // STAGE 5 — Permits & Regulations (questions 15-17)
    // ================================================================
    {
      key: 'permits_awareness',
      type: 'single_select',
      question: 'What is your understanding of the permit situation for this project?',
      helper:
        'Most work beyond cosmetic upgrades requires a building permit. Electrical, plumbing, and structural work almost always do.',
      voiceEnabled: false,
      options: [
        {
          value: 'have_them',
          label: 'Already have permits or applied',
          description: 'Permits are in hand or in process.',
        },
        {
          value: 'know_needed',
          label: 'Know I need them, have not applied yet',
          description: 'Aware permits are required but have not started the process.',
        },
        {
          value: 'not_sure',
          label: 'Not sure what I need',
          description: 'Do not know if permits are required for this work.',
        },
        {
          value: 'probably_none_needed',
          label: 'Probably no permits needed',
          description: 'Cosmetic work only, nothing structural or mechanical.',
        },
      ],
      followUpPrompt:
        'If they already have permits, great -- confirm they have the right ones for the full scope of work (building, electrical, plumbing, and mechanical are often separate permits). If they know they need them, mention that permit timelines vary wildly by jurisdiction: some cities issue in 1-2 weeks, others take 8-12 weeks for plan review. If not sure, list what typically requires permits: any structural modification, electrical work beyond swapping fixtures, plumbing changes, HVAC modifications, window or door additions, and most exterior work. If they think none are needed, verify the scope is truly cosmetic -- unpermitted work can cause problems at resale and with insurance claims. Transition to HOA.',
      stage: { number: 5, label: 'Permits & Regulations' },
      required: true,
    },
    {
      key: 'hoa_restrictions',
      type: 'single_select',
      question: 'Is the property in a homeowners association (HOA)?',
      helper:
        'HOAs can restrict exterior changes, construction hours, dumpster placement, and even material choices.',
      voiceEnabled: false,
      options: [
        {
          value: 'yes_strict',
          label: 'Yes, with strict rules',
          description: 'HOA has detailed architectural guidelines and approval processes.',
        },
        {
          value: 'yes_moderate',
          label: 'Yes, with moderate rules',
          description: 'HOA has some guidelines but is generally reasonable.',
        },
        {
          value: 'no_hoa',
          label: 'No HOA',
          description: 'No homeowners association restrictions.',
        },
        {
          value: 'not_sure',
          label: 'Not sure',
          description: 'Need to check the property deed or covenants.',
        },
      ],
      followUpPrompt:
        'If strict HOA, flag that they should submit architectural review applications early -- some HOAs take 30-60 days to approve exterior changes, and starting work without approval can result in fines or forced removal. If moderate HOA, suggest reviewing the CC&Rs (covenants, conditions, and restrictions) for any renovation-specific clauses, especially around construction hours, contractor parking, and dumpster placement. If no HOA, note that they still need to comply with local building codes and zoning setback requirements. If not sure, recommend checking the title documents or asking their real estate agent. Transition to historical designation.',
      stage: { number: 5, label: 'Permits & Regulations' },
      required: true,
    },
    {
      key: 'historical_designation',
      type: 'single_select',
      question: 'Is the property in a historic district or have a historical designation?',
      helper:
        'Historic properties often have additional review boards, material requirements, and restrictions on visible changes.',
      voiceEnabled: false,
      options: [
        {
          value: 'yes',
          label: 'Yes',
          description: 'The property or neighborhood has historical designation.',
        },
        {
          value: 'no',
          label: 'No',
          description: 'No historical designation.',
        },
        {
          value: 'not_sure',
          label: 'Not sure',
          description: 'Need to check with the city or county.',
        },
      ],
      followUpPrompt:
        'If yes, this is a significant factor. Historic preservation boards can require specific materials (wood windows instead of vinyl, certain paint colors, period-appropriate details) that cost 2-5x more than standard options. Approval processes can add 1-3 months. Interior-only renovations are usually less restricted, but confirm with the local preservation office. If no, that simplifies things. If not sure, recommend checking with the city planning department -- it is a quick call and avoids surprises. Transition to contractors.',
      stage: { number: 5, label: 'Permits & Regulations' },
      required: true,
    },

    // ================================================================
    // STAGE 6 — Contractors & Labor (questions 18-21)
    // ================================================================
    {
      key: 'work_approach',
      type: 'single_select',
      question: 'How are you planning to get the work done?',
      helper:
        'A general contractor manages all the subcontractors for you. Managing subs yourself can save 15-25% but requires significant time and knowledge.',
      voiceEnabled: false,
      options: [
        {
          value: 'general_contractor',
          label: 'Hire a general contractor',
          description: 'One person manages the entire project and all subcontractors.',
        },
        {
          value: 'manage_subs_myself',
          label: 'Manage subcontractors myself',
          description: 'I will hire and coordinate the individual trades directly.',
        },
        {
          value: 'mostly_diy',
          label: 'Mostly DIY',
          description: 'Doing most of the work myself, hiring out only specialized trades.',
        },
        {
          value: 'mix_diy_and_pro',
          label: 'Mix of DIY and professional',
          description: 'Handling some work myself and hiring professionals for the rest.',
        },
      ],
      followUpPrompt:
        'If general contractor, affirm this is the right choice for projects over $50K or involving multiple trades -- the markup (typically 15-25% over sub costs) pays for scheduling, quality control, and problem-solving. If managing subs, ask if they have done this before -- coordinating plumber, electrician, framer, drywaller, painter, and flooring installer requires knowing the correct sequencing and being available for daily decisions. If mostly DIY, mention that electrical, plumbing, gas lines, and structural work should always be done by licensed professionals for safety and code compliance. If mix, ask which parts they plan to handle themselves so we can assess if that is realistic. Transition to contractor status.',
      stage: { number: 6, label: 'Contractors & Labor' },
      required: true,
    },
    {
      key: 'contractor_status',
      type: 'single_select',
      question: 'Where are you in the process of finding your contractor or team?',
      voiceEnabled: false,
      options: [
        {
          value: 'hired',
          label: 'Already hired',
          description: 'Contract signed and ready to go.',
        },
        {
          value: 'getting_bids',
          label: 'Getting bids',
          description: 'Talking to contractors and comparing estimates.',
        },
        {
          value: 'havent_started',
          label: 'Have not started looking',
          description: 'Need to begin the search.',
        },
        {
          value: 'doing_myself',
          label: 'Doing it myself',
          description: 'DIY -- not hiring a contractor.',
        },
      ],
      followUpPrompt:
        'If already hired, ask if the contract includes a detailed scope of work, payment schedule tied to milestones (not dates), and a clear change order process -- these three items prevent 90% of contractor disputes. If getting bids, recommend getting at least 3 bids and comparing them line by line, not just the bottom number -- a low bid often means something is excluded. If they have not started, suggest starting with referrals from neighbors, local lumber yards, or the National Association of Home Builders (NAHB) directory. Mention that good contractors in most markets are booked 4-8 weeks out. If DIY, acknowledge their ambition and move on. Transition to contractor vetting.',
      stage: { number: 6, label: 'Contractors & Labor' },
      required: true,
    },
    {
      key: 'contractor_vetting',
      type: 'open_text',
      question:
        'What matters most to you when choosing a contractor? What would make you walk away from one?',
      helper:
        'Communication style, price, references, licensing, timeline commitments, specialty experience -- what is non-negotiable for you?',
      voiceEnabled: true,
      followUpPrompt:
        'Validate their priorities. Add any critical vetting criteria they may have missed: always verify a contractor is licensed and insured (general liability and workers comp), check their state license board for complaints, ask for 3 recent references on similar projects and actually call them, and confirm they pull permits in their own name (not yours). If price is their top priority, gently note that the cheapest bid is rarely the best value -- the most common complaint in renovation is paying twice to fix bad work. Transition to experience level.',
      stage: { number: 6, label: 'Contractors & Labor' },
      required: true,
    },
    {
      key: 'past_renovation_experience',
      type: 'single_select',
      question: 'How much renovation experience do you have as a homeowner?',
      helper:
        'No judgment here. First-timers and veterans both benefit from structured planning.',
      voiceEnabled: false,
      options: [
        {
          value: 'first_timer',
          label: 'This is my first renovation',
          description: 'Never done anything beyond basic maintenance.',
        },
        {
          value: 'done_small_projects',
          label: 'Done small projects',
          description: 'Painted rooms, replaced fixtures, minor upgrades.',
        },
        {
          value: 'experienced',
          label: 'Experienced homeowner',
          description: 'Have been through at least one significant renovation.',
        },
        {
          value: 'professional',
          label: 'Professional or trade background',
          description: 'Work in construction, design, or a related trade.',
        },
      ],
      followUpPrompt:
        'If first-timer, reassure them that this process is designed to prepare them thoroughly. Mention the three most common first-timer mistakes: underestimating the timeline by 30-50%, not having a contingency budget, and making too many changes after work begins (change orders are expensive). If they have done small projects, note that the jump from cosmetic work to a full remodel is significant -- the coordination complexity increases exponentially. If experienced, ask what went right and wrong last time so we can build on those lessons. If professional, adjust the tone to be more peer-to-peer and skip the basics. Transition to design.',
      stage: { number: 6, label: 'Contractors & Labor' },
      required: true,
    },

    // ================================================================
    // STAGE 7 — Design & Materials (questions 22-25)
    // ================================================================
    {
      key: 'design_style',
      type: 'open_text',
      question:
        'Describe the look and feel you are going for. What style, colors, or references are inspiring you?',
      helper:
        'Modern farmhouse, mid-century modern, traditional, industrial, coastal, Scandinavian -- or show us a Pinterest board. Even "I just want it to look clean and updated" is a valid answer.',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back their style in specific terms. If they gave a named style (e.g., modern farmhouse), describe what that typically translates to in material choices: shaker cabinets, subway tile, warm wood tones, matte black hardware. If they were vague, offer 2-3 concrete directions based on what they described and ask them to pick the closest match. Mention that having a clear design direction before selecting materials saves significant time and prevents decision fatigue. Transition to material preferences.',
      stage: { number: 7, label: 'Design & Materials' },
      required: true,
    },
    {
      key: 'material_preference',
      type: 'single_select',
      question: 'What level of materials are you targeting?',
      helper:
        'This drives a huge portion of the budget. The difference between builder-grade and custom materials can be 3-5x on the same project.',
      voiceEnabled: false,
      options: [
        {
          value: 'budget_friendly',
          label: 'Budget-friendly',
          description: 'Stock and builder-grade materials. Function over flash.',
        },
        {
          value: 'mid_range',
          label: 'Mid-range',
          description: 'Good quality materials with some upgraded selections.',
        },
        {
          value: 'high_end',
          label: 'High-end',
          description: 'Premium brands, custom fabrication, designer selections.',
        },
        {
          value: 'mix_splurge_and_save',
          label: 'Mix of splurge and save',
          description: 'High-end on focal points, budget-friendly everywhere else.',
        },
      ],
      followUpPrompt:
        'If budget-friendly, mention that big box stores (Home Depot, Lowes) have solid mid-tier options and frequent sales. Stock cabinets, laminate countertops, and ceramic tile can look great with good design. If mid-range, this is where the best value typically lives -- quartz countertops, soft-close semi-custom cabinets, porcelain tile, and mid-tier appliances. If high-end, note that lead times for custom cabinetry (8-16 weeks), natural stone slabs (selection and fabrication 4-6 weeks), and premium appliances (some Sub-Zero and Wolf models have 6-12 month waits) need to be factored into the timeline. If mix, affirm that this is the smartest approach -- splurge where your eye lands first and save where it does not. Transition to design help.',
      stage: { number: 7, label: 'Design & Materials' },
      required: true,
    },
    {
      key: 'design_help_needed',
      type: 'single_select',
      question: 'Do you have a designer or architect involved?',
      helper:
        'A designer helps with material selections, layout, and aesthetics. An architect is needed for structural changes and additions.',
      voiceEnabled: false,
      options: [
        {
          value: 'have_designer',
          label: 'Yes, I have a designer or architect',
          description: 'Already working with a design professional.',
        },
        {
          value: 'want_designer',
          label: 'Want to hire one',
          description: 'Planning to bring in a design professional.',
        },
        {
          value: 'doing_own_design',
          label: 'Doing my own design',
          description: 'Handling all design decisions myself.',
        },
        {
          value: 'need_help_deciding',
          label: 'Not sure if I need one',
          description: 'Help me figure out if professional design help is worth it.',
        },
      ],
      followUpPrompt:
        'If they have a designer, great -- ask if the designer is also handling material specifications and procurement, or just the layout and aesthetic direction. If they want to hire one, mention that interior designers typically charge $75-$200/hour or 10-20% of the project cost, and a good designer often saves their fee by preventing expensive mistakes and getting trade pricing on materials. If doing their own design, that works well for straightforward cosmetic projects but recommend professional help for layout changes, especially in kitchens where the work triangle (sink, stove, fridge) and clearances are critical. If not sure, suggest they need professional design help if the project involves layout changes, structural work, or if they find themselves unable to make material decisions. Transition to must-have features.',
      stage: { number: 7, label: 'Design & Materials' },
      required: true,
    },
    {
      key: 'must_have_features',
      type: 'open_text',
      question:
        'What are your absolute must-have features? The things you will not compromise on.',
      helper:
        'A farmhouse sink, heated bathroom floors, a walk-in pantry, a soaking tub, quartz countertops, a gas range -- name the non-negotiables.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge each must-have specifically. For each item, provide a quick cost context if relevant -- for example, heated bathroom floors cost $6-$15 per square foot in materials plus installation, a farmhouse sink runs $300-$2,000 depending on material, or a gas range conversion from electric requires running a gas line ($500-$2,000). If any must-have conflicts with their budget range, flag it now so they can prioritize. These items will be protected in the budget plan. Transition to risks and concerns.',
      stage: { number: 7, label: 'Design & Materials' },
      required: true,
    },

    // ================================================================
    // STAGE 8 — Risks & Concerns (questions 26-28)
    // ================================================================
    {
      key: 'biggest_worry',
      type: 'open_text',
      question:
        'What is your single biggest worry about this renovation project?',
      helper:
        'Going over budget, the project dragging on forever, shoddy workmanship, making the wrong design choices, living through construction -- name it.',
      voiceEnabled: true,
      followUpPrompt:
        'Take their worry seriously -- do not dismiss it or minimize it. Provide one concrete, actionable step they can take to reduce the risk. For example: if budget overruns, a fixed-price contract with a detailed scope of work is the best protection; if timeline, insist on a construction schedule with milestones and penalty clauses; if quality, require a punch list walkthrough before final payment; if design regret, order samples of every finish material and live with them for a week before committing. We will build specific mitigation plans for this concern into the risk register. Transition to known issues.',
      stage: { number: 8, label: 'Risks & Concerns' },
      required: true,
    },
    {
      key: 'known_issues',
      type: 'multi_select',
      question:
        'Are you aware of any existing issues with the home that could affect the renovation?',
      helper:
        'These are the things that can blow up a budget and timeline if discovered mid-project. Better to know now.',
      voiceEnabled: false,
      options: [
        { value: 'foundation', label: 'Foundation problems', description: 'Cracks, settling, water intrusion through foundation' },
        { value: 'plumbing', label: 'Plumbing issues', description: 'Old pipes, slow drains, low water pressure, leaks' },
        { value: 'electrical', label: 'Electrical concerns', description: 'Old wiring, insufficient panel capacity, no grounding' },
        { value: 'hvac', label: 'HVAC problems', description: 'Aging system, poor distribution, inadequate capacity' },
        { value: 'roof', label: 'Roof issues', description: 'Leaks, aging shingles, structural concerns' },
        { value: 'mold', label: 'Mold', description: 'Visible mold or musty smells' },
        { value: 'asbestos', label: 'Asbestos', description: 'Known or suspected asbestos in insulation, tile, or siding' },
        { value: 'lead_paint', label: 'Lead paint', description: 'Home built before 1978 with original paint' },
        { value: 'termites', label: 'Termite or pest damage', description: 'Active or past infestation, wood damage' },
        { value: 'none_known', label: 'None that I know of', description: 'No known issues' },
      ],
      followUpPrompt:
        'If they selected specific issues, address each one briefly. Foundation repairs can cost $5,000-$30,000+ and must be resolved before cosmetic work. Mold remediation runs $1,500-$10,000 depending on extent. Asbestos abatement is $1,500-$3,000 per area and is legally required before disturbing the material. Lead paint abatement in a renovation zone costs $1,000-$5,000+. Electrical panel upgrades (often needed in older homes) cost $1,500-$4,000. Note that some of these require specialized, licensed contractors -- not all general contractors handle remediation. If none known, mention that a pre-renovation inspection by the contractor is still worth doing to catch hidden issues before demolition starts. Transition to insurance.',
      stage: { number: 8, label: 'Risks & Concerns' },
      required: true,
    },
    {
      key: 'insurance_coverage',
      type: 'single_select',
      question: 'Have you checked your homeowners insurance policy regarding renovation coverage?',
      helper:
        'Most standard policies do not automatically cover construction-related damage, theft of materials on site, or injuries to workers.',
      voiceEnabled: false,
      options: [
        {
          value: 'checked_policy',
          label: 'Yes, checked with my insurer',
          description: 'I have confirmed what is and is not covered.',
        },
        {
          value: 'need_to_check',
          label: 'Need to check',
          description: 'Have not looked into this yet.',
        },
        {
          value: 'have_builders_risk',
          label: 'Have a builders risk policy',
          description: 'Purchased additional construction coverage.',
        },
        {
          value: 'not_sure',
          label: 'Not sure what to look for',
          description: 'Need guidance on what insurance I need.',
        },
      ],
      followUpPrompt:
        'If they checked their policy, good -- confirm they verified coverage for construction-related water damage (the most common renovation insurance claim), theft of materials, and liability for worker injuries. If they need to check, this should happen before work begins. If they have builders risk, that is excellent -- this is the gold standard for renovations over $50K. If not sure, explain: at minimum, verify their contractor carries general liability insurance ($1M minimum) and workers compensation. For projects over $50K, consider a builders risk policy ($500-$2,000 depending on project size) that covers the structure and materials during construction. Transition to success.',
      stage: { number: 8, label: 'Risks & Concerns' },
      required: true,
    },

    // ================================================================
    // STAGE 9 — Success (questions 29-31)
    // ================================================================
    {
      key: 'definition_of_done',
      type: 'open_text',
      question:
        'When this renovation is finished, what does success look like to you? Paint the picture.',
      helper:
        'Think beyond the physical result. How does the space make you feel? How does your daily routine change? What problem is finally solved?',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back their vision of success in concrete terms. Connect their success definition to the practical decisions made earlier in the interview -- for example, if success is "a kitchen where the whole family can cook together," tie that to the layout decisions and must-have features they described. This success picture becomes the north star for every trade-off and decision in the plan. Mention that we will define specific, measurable success criteria based on this vision. Transition to resale considerations.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
    {
      key: 'resale_vs_personal',
      type: 'single_select',
      question: 'Are you optimizing this renovation for resale value, personal enjoyment, or both?',
      helper:
        'This changes how we think about material choices, design trends, and how much customization makes sense.',
      voiceEnabled: false,
      options: [
        {
          value: 'maximize_resale',
          label: 'Maximize resale value',
          description: 'Planning to sell in the next few years. ROI matters most.',
        },
        {
          value: 'personal_enjoyment',
          label: 'Personal enjoyment',
          description: 'This is our forever home. Make it exactly what we want.',
        },
        {
          value: 'both_balanced',
          label: 'Both -- balanced approach',
          description: 'Want to enjoy it now but also protect resale value.',
        },
        {
          value: 'rental_property',
          label: 'Rental property',
          description: 'Renovating for tenants. Durability and cost-effectiveness matter most.',
        },
      ],
      followUpPrompt:
        'If maximize resale, note that the highest-ROI renovations are minor kitchen remodels (75-80% return), bathroom remodels (60-70% return), and curb appeal upgrades. Avoid over-customization that narrows the buyer pool. Neutral colors and timeless materials sell better than bold design choices. If personal enjoyment, affirm that they should build exactly what makes them happy -- the daily quality-of-life improvement is the return on investment. If both balanced, recommend leaning 70% personal and 30% resale-conscious, focusing resale awareness on layout and major finishes. If rental property, prioritize durable, easy-to-maintain materials: luxury vinyl plank flooring, quartz countertops, and commercial-grade fixtures. Transition to final thoughts.',
      stage: { number: 9, label: 'Success' },
      required: true,
    },
    {
      key: 'anything_else',
      type: 'open_text',
      question:
        'Is there anything else about this renovation that we have not covered? Anything keeping you up at night?',
      helper:
        'Last chance to add concerns, constraints, wish-list items, or context that might affect the plan.',
      voiceEnabled: true,
      followUpPrompt:
        'If they add new information, acknowledge it and explain where it will factor into the planning documents. If they say nothing, affirm that we have covered a lot of ground and have a strong foundation for building their renovation plan. Summarize the top 3-4 themes from the conversation: the scope of work, the budget reality, the timeline, and their definition of success. Let them know that the planning artifacts will address all of these areas with specific, actionable recommendations.',
      stage: { number: 9, label: 'Success' },
      required: false,
    },

    // ================================================================
    // STAGE 2 — Scope (additional questions 32-35)
    // ================================================================
    {
      key: 'plumbing_scope',
      type: 'single_select',
      question: 'Will this project involve any plumbing work?',
      helper:
        'Moving a sink, adding a bathroom, relocating a water heater, or running new supply lines all count.',
      voiceEnabled: false,
      options: [
        { value: 'none', label: 'No plumbing work', description: 'Keeping everything where it is.' },
        { value: 'minor', label: 'Minor plumbing', description: 'Replacing fixtures, faucets, or a toilet in existing locations.' },
        { value: 'moderate', label: 'Moderate plumbing', description: 'Moving a sink, adding a line, or replacing a water heater.' },
        { value: 'major', label: 'Major plumbing', description: 'Adding a bathroom, repiping, or moving multiple fixtures.' },
        { value: 'not_sure', label: 'Not sure yet', description: 'Will depend on the final design.' },
      ],
      followUpPrompt:
        'If no plumbing, note that this simplifies the project and reduces both cost and permit complexity. If minor, these are straightforward and most general contractors handle this in-house. If moderate, mention that moving a sink or adding a line typically costs $1,000-$5,000 depending on access and distance from existing lines, and the drains are the expensive part, not the supply. If major, flag that adding a bathroom requires drain, vent, and supply lines which often means opening floors or ceilings below -- budget $8,000-$25,000 for plumbing alone on a new bathroom. If not sure, recommend finalizing the design before getting plumbing bids.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'electrical_scope',
      type: 'single_select',
      question: 'What about electrical work?',
      helper:
        'New outlets, recessed lighting, panel upgrades, dedicated circuits for appliances, or rewiring all count.',
      voiceEnabled: false,
      options: [
        { value: 'none', label: 'No electrical work', description: 'Keeping existing electrical as-is.' },
        { value: 'minor', label: 'Minor electrical', description: 'Adding a few outlets or swapping light fixtures.' },
        { value: 'moderate', label: 'Moderate electrical', description: 'Adding circuits, recessed lighting, or upgrading a sub-panel.' },
        { value: 'major', label: 'Major electrical', description: 'Full rewire, main panel upgrade, or extensive new circuits.' },
        { value: 'not_sure', label: 'Not sure yet', description: 'Will depend on the final plan.' },
      ],
      followUpPrompt:
        'If no electrical, confirm that the existing wiring and panel can handle any new appliances or loads. If minor, these are typically $500-$2,000 and can often be added during other work. If moderate, mention that a kitchen remodel alone often needs 4-6 dedicated circuits (dishwasher, disposal, microwave, refrigerator, range, countertop outlets) which can cost $2,000-$5,000. If major, a full panel upgrade from 100-amp to 200-amp service runs $2,000-$4,000 and is often required in older homes before major renovation work can begin. If not sure, note that the electrician should walk the job after demolition to identify all needs.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'flooring_plans',
      type: 'single_select',
      question: 'Are you replacing or refinishing any flooring?',
      helper:
        'Flooring choices affect cost, timeline, and whether the space needs to be vacated during installation.',
      voiceEnabled: false,
      options: [
        { value: 'keeping_existing', label: 'Keeping existing floors', description: 'No flooring changes planned.' },
        { value: 'refinish', label: 'Refinishing existing hardwood', description: 'Sanding and restaining existing wood floors.' },
        { value: 'new_in_reno_area', label: 'New flooring in renovated area only', description: 'Replacing floors where work is happening.' },
        { value: 'new_throughout', label: 'New flooring throughout', description: 'Replacing floors across multiple rooms or the whole house.' },
        { value: 'not_decided', label: 'Not decided yet', description: 'Still thinking about flooring.' },
      ],
      followUpPrompt:
        'If keeping existing, note that protecting existing floors during construction is critical -- use ram board or heavy paper, not just drop cloths, which tear. If refinishing hardwood, this takes 3-5 days with full cure time and generates significant dust and fumes -- the space must be vacated during the process. If new flooring in the renovation area only, mention the challenge of matching new flooring to existing adjacent floors -- transitions and thresholds matter. If new throughout, this is often the best value per square foot and eliminates matching problems. Common costs: luxury vinyl plank $3-$8/sqft installed, engineered hardwood $6-$14/sqft installed, tile $8-$20/sqft installed, solid hardwood $8-$18/sqft installed. If not decided, recommend choosing flooring early as it affects subfloor prep decisions.',
      stage: { number: 2, label: 'Scope' },
      required: true,
    },
    {
      key: 'hvac_changes',
      type: 'single_select',
      question: 'Will the heating, cooling, or ventilation system need changes?',
      helper:
        'Adding a room, finishing a basement, or opening up walls often requires HVAC modifications to maintain comfort.',
      voiceEnabled: false,
      options: [
        { value: 'no_changes', label: 'No HVAC changes', description: 'Current system is fine for the planned work.' },
        { value: 'extend_existing', label: 'Extend existing system', description: 'Adding ductwork or vents to new or modified spaces.' },
        { value: 'replace_system', label: 'Replace the system', description: 'Upgrading or replacing the furnace, AC, or both.' },
        { value: 'add_mini_split', label: 'Add a mini-split or zone', description: 'Adding ductless units for specific areas.' },
        { value: 'not_sure', label: 'Not sure', description: 'Need an HVAC contractor to evaluate.' },
      ],
      followUpPrompt:
        'If no changes, confirm the existing system has capacity for any layout modifications -- removing walls can change airflow patterns. If extending, mention that adding ductwork to a basement or addition typically costs $1,500-$5,000 and should be designed by an HVAC contractor, not just tapped off the nearest existing duct. If replacing, a full system replacement runs $5,000-$15,000 and can be bundled with renovation work to save on access costs while walls are open. If adding mini-splits, these are excellent for additions and converted spaces at $3,000-$6,000 per zone and avoid ductwork entirely. If not sure, recommend getting an HVAC assessment early -- it affects framing decisions if ductwork needs to run through new walls or ceilings.',
      stage: { number: 2, label: 'Scope' },
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
    'raci_matrix',
    'risk_register',
    'success_metrics',
    'budget',
    'wireframes',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ],
  artifactGenerationOrder: [
    'demand_analysis',
    'vision',
    'scope',
    'personas',
    'competitive_analysis',
    'user_journey',
    'budget',
    'roadmap',
    'raci_matrix',
    'wireframes',
    'risk_register',
    'success_metrics',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ],
};
