// ============================================================
// Jetdale — Wedding / Event Archetype Discovery Script
// 35 questions across 9 stages. Production-ready.
// ============================================================

import type { ArchetypeDefinition } from '../types';

export const weddingEvent: ArchetypeDefinition = {
  slug: 'wedding_event',
  name: 'Wedding or event',
  category: 'event',
  scriptVersion: 1,
  expertPersona:
    'You are a veteran event planner with 12 years of experience coordinating over 200 weddings and corporate events. You have seen every disaster and know how to prevent them. You are warm but direct about budget realities and timeline constraints. You never sugarcoat logistics problems.',
  estimatedMinutes: 20,
  iconName: 'calendar',
  description:
    'For couples planning a wedding or anyone organizing a major event. Covers budget allocation, vendor selection, timeline, logistics, and contingency planning.',
  questions: [
    // Stage 1: The Spark
    {
      key: 'spark',
      type: 'open_text',
      question: 'In one sentence, what event are you planning?',
      helper:
        'A wedding, a corporate retreat, a birthday milestone, a fundraiser — just describe it plainly.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge their event warmly but without gushing. Confirm what type of event this sounds like. If it is a wedding, confirm "wedding." If it sounds like something else, ask to clarify. Keep it to 2-3 sentences.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'archetype_confirm',
      type: 'archetype_confirm',
      question: 'This sounds like a wedding or major event. Is that right?',
      helper: 'We will tailor all the questions and planning documents to this type of event.',
      voiceEnabled: false,
      options: [
        { value: 'wedding', label: 'Wedding', description: 'A wedding ceremony and reception' },
        { value: 'corporate_event', label: 'Corporate event', description: 'Conference, retreat, team offsite, or company party' },
        { value: 'birthday_milestone', label: 'Birthday or milestone', description: 'A significant birthday, anniversary, or celebration' },
        { value: 'fundraiser', label: 'Fundraiser or gala', description: 'Charity event, auction, or formal gala' },
        { value: 'other_event', label: 'Something else', description: 'A different type of event' },
      ],
      followUpPrompt:
        'Confirm the event type and mention one thing that makes planning this type of event unique. Transition to asking about the vision.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'vision_statement',
      type: 'open_text',
      question: 'Close your eyes for a second. What does the perfect version of this event feel like?',
      helper:
        'Not logistics — the feeling. Intimate and cozy? Grand and glamorous? Relaxed backyard party? Describe the vibe.',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back the emotional tone they described. Affirm it is a clear vision. Mention that this feeling will guide every vendor and budget decision. Transition to date and timeline.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },

    // Stage 2: Date & Timeline
    {
      key: 'event_date',
      type: 'single_select',
      question: 'When is this event happening?',
      helper: 'If you have an exact date, great. Otherwise, give us a range.',
      voiceEnabled: false,
      options: [
        { value: 'exact_date_set', label: 'Date is locked in', description: 'We have a confirmed date' },
        { value: 'within_3_months', label: 'Within 3 months', description: 'Coming up fast' },
        { value: '3_to_6_months', label: '3-6 months out', description: 'Solid planning window' },
        { value: '6_to_12_months', label: '6-12 months out', description: 'Standard wedding timeline' },
        { value: 'over_12_months', label: 'Over a year away', description: 'Plenty of time to plan properly' },
        { value: 'no_date_yet', label: 'No date yet', description: 'Still figuring it out' },
      ],
      followUpPrompt:
        'If under 3 months, gently flag that the timeline is tight and vendor availability will be limited. If over 12 months, affirm they have great runway. Transition to guest count.',
      stage: { number: 2, label: 'Date & Timeline' },
      required: true,
    },
    {
      key: 'guest_count',
      type: 'single_select',
      question: 'How many guests are you expecting?',
      helper: 'This drives almost every other decision: venue size, catering, seating, parking.',
      voiceEnabled: false,
      options: [
        { value: 'micro', label: 'Under 30', description: 'Intimate gathering' },
        { value: 'small', label: '30-75', description: 'Small wedding or event' },
        { value: 'medium', label: '75-150', description: 'Mid-size event' },
        { value: 'large', label: '150-300', description: 'Large event' },
        { value: 'very_large', label: '300+', description: 'Major production' },
      ],
      followUpPrompt:
        'Provide a brief insight on how this guest count affects planning. For example, under 30 opens up non-traditional venues. Over 150 usually requires a dedicated coordinator. Transition to venue.',
      stage: { number: 2, label: 'Date & Timeline' },
      required: true,
    },
    {
      key: 'season_preference',
      type: 'open_text',
      question: 'Any season, weather, or time-of-day preferences?',
      helper:
        'Outdoor summer evening? Indoor winter afternoon? This affects venue, attire, photography, and catering.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge their preference. If outdoor, mention weather contingency planning. Transition to venue.',
      stage: { number: 2, label: 'Date & Timeline' },
      required: false,
    },

    // Stage 3: Venue & Location
    {
      key: 'venue_status',
      type: 'single_select',
      question: 'Where are you with the venue?',
      voiceEnabled: false,
      options: [
        { value: 'booked', label: 'Already booked', description: 'Venue is locked in and deposit paid' },
        { value: 'shortlist', label: 'Have a shortlist', description: 'Narrowed it down to a few options' },
        { value: 'searching', label: 'Still searching', description: 'Looking at options' },
        { value: 'no_idea', label: 'No idea yet', description: 'Need help figuring out what kind of venue' },
      ],
      followUpPrompt:
        'If booked, great — ask what drew them to it. If still searching, mention that venue is typically the first thing to lock down because availability disappears fast.',
      stage: { number: 3, label: 'Venue & Location' },
      required: true,
    },
    {
      key: 'venue_type',
      type: 'single_select',
      question: 'What type of venue fits your vision?',
      helper: 'Think about the feeling you described earlier.',
      voiceEnabled: false,
      options: [
        { value: 'traditional', label: 'Traditional venue', description: 'Banquet hall, hotel ballroom, country club' },
        { value: 'outdoor', label: 'Outdoor / garden', description: 'Garden, vineyard, farm, beach' },
        { value: 'nontraditional', label: 'Non-traditional space', description: 'Art gallery, warehouse, rooftop, restaurant' },
        { value: 'destination', label: 'Destination', description: 'Out of town or out of country' },
        { value: 'private_home', label: 'Private home or property', description: 'Backyard, family estate' },
      ],
      followUpPrompt:
        'Confirm this fits their earlier vision. Mention one practical consideration for this venue type (e.g., outdoor = tent/rain plan, destination = travel logistics for guests).',
      stage: { number: 3, label: 'Venue & Location' },
      required: true,
    },
    {
      key: 'venue_geography',
      type: 'open_text',
      question: 'What city or region are you planning this in?',
      helper: 'This affects vendor availability, pricing, and guest travel.',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge the location. If it is a major metro, mention vendor competition is high so book early. If rural or destination, flag logistics considerations.',
      stage: { number: 3, label: 'Venue & Location' },
      required: true,
    },

    // Stage 4: Budget
    {
      key: 'total_budget',
      type: 'single_select',
      question: 'What is your total budget for this event?',
      helper:
        'Be honest here. The plan only works if the budget is real. This is the number that constrains every other decision.',
      voiceEnabled: false,
      options: [
        { value: 'under_5k', label: 'Under $5,000', description: 'Very lean — requires creative trade-offs' },
        { value: '5k_15k', label: '$5,000-$15,000', description: 'Tight but workable for smaller events' },
        { value: '15k_30k', label: '$15,000-$30,000', description: 'Standard range for a modest wedding' },
        { value: '30k_60k', label: '$30,000-$60,000', description: 'Comfortable budget with room for priorities' },
        { value: '60k_100k', label: '$60,000-$100,000', description: 'Premium experience' },
        { value: 'over_100k', label: 'Over $100,000', description: 'No major constraints' },
      ],
      followUpPrompt:
        'Do not judge any budget. Provide a reality check: for their guest count and venue type, flag if the budget is tight, comfortable, or generous. Mention the typical allocation breakdown (venue 40-50%, catering 25-30%, everything else 20-35%).',
      stage: { number: 4, label: 'Budget' },
      required: true,
    },
    {
      key: 'budget_flexibility',
      type: 'single_select',
      question: 'How firm is that number?',
      voiceEnabled: false,
      options: [
        { value: 'hard_cap', label: 'Hard cap — cannot exceed it', description: 'This is the absolute maximum' },
        { value: 'soft_cap', label: 'Soft cap — some flexibility', description: 'Could stretch 10-15% for the right thing' },
        { value: 'ballpark', label: 'Rough ballpark', description: 'Could go higher if the plan justifies it' },
      ],
      followUpPrompt:
        'Noted. If hard cap, mention the importance of building in a 10% contingency buffer within that cap. If soft, ask what would justify going over.',
      stage: { number: 4, label: 'Budget' },
      required: true,
    },
    {
      key: 'budget_priorities',
      type: 'multi_select',
      question: 'Where do you want to spend the most? Pick your top 2-3 priorities.',
      helper: 'You cannot prioritize everything. What matters most to the experience you described?',
      voiceEnabled: false,
      options: [
        { value: 'venue', label: 'Venue', description: 'The space itself makes the event' },
        { value: 'food_drink', label: 'Food and drink', description: 'The meal and bar experience' },
        { value: 'photography', label: 'Photography / videography', description: 'Capturing the memories' },
        { value: 'music_entertainment', label: 'Music and entertainment', description: 'Band, DJ, performers' },
        { value: 'flowers_decor', label: 'Flowers and decor', description: 'Visual atmosphere' },
        { value: 'attire', label: 'Attire', description: 'Dress, suit, accessories' },
      ],
      followUpPrompt:
        'Good priorities. Mention that the areas they did not pick are where they should look to save. This is how you stay on budget without sacrificing what matters.',
      stage: { number: 4, label: 'Budget' },
      required: true,
    },

    // Stage 5: Vendors & Services
    {
      key: 'vendors_booked',
      type: 'multi_select',
      question: 'Which vendors have you already booked or started talking to?',
      voiceEnabled: false,
      options: [
        { value: 'photographer', label: 'Photographer', description: 'Photo and/or video' },
        { value: 'caterer', label: 'Caterer', description: 'Food service' },
        { value: 'florist', label: 'Florist', description: 'Flowers and greenery' },
        { value: 'dj_band', label: 'DJ or band', description: 'Music and entertainment' },
        { value: 'planner', label: 'Planner or coordinator', description: 'Day-of or full-service planner' },
        { value: 'none', label: 'None yet', description: 'Starting from scratch' },
      ],
      followUpPrompt:
        'If none, that is fine — we will build a vendor priority list. If some are booked, ask how they chose them and if they are happy with the pricing.',
      stage: { number: 5, label: 'Vendors & Services' },
      required: true,
    },
    {
      key: 'catering_style',
      type: 'single_select',
      question: 'What kind of food and drink experience do you want?',
      voiceEnabled: false,
      options: [
        { value: 'plated', label: 'Plated dinner', description: 'Formal sit-down with courses' },
        { value: 'buffet', label: 'Buffet', description: 'Casual and flexible' },
        { value: 'family_style', label: 'Family style', description: 'Shared platters at the table' },
        { value: 'stations', label: 'Food stations', description: 'Interactive stations or food trucks' },
        { value: 'cocktail', label: 'Cocktail and passed apps', description: 'Mingling format, no formal seating' },
      ],
      followUpPrompt:
        'Good choice. Mention the per-person cost implications. Plated is typically the most expensive. Buffet and stations often give more variety for less.',
      stage: { number: 5, label: 'Vendors & Services' },
      required: true,
    },
    {
      key: 'bar_service',
      type: 'single_select',
      question: 'What about the bar?',
      voiceEnabled: false,
      options: [
        { value: 'open_bar', label: 'Full open bar', description: 'All drinks covered all night' },
        { value: 'beer_wine', label: 'Beer and wine only', description: 'No hard liquor' },
        { value: 'signature_cocktails', label: 'Signature cocktails + beer/wine', description: 'A few custom drinks plus basics' },
        { value: 'cash_bar', label: 'Cash bar', description: 'Guests pay for their own drinks' },
        { value: 'no_alcohol', label: 'Non-alcoholic', description: 'No alcohol served' },
      ],
      followUpPrompt:
        'Note that open bar for a large wedding can easily be $5K-$15K+ depending on duration and guest count. Signature cocktails with beer/wine is a popular way to control costs while feeling special.',
      stage: { number: 5, label: 'Vendors & Services' },
      required: true,
    },
    {
      key: 'music_entertainment',
      type: 'single_select',
      question: 'What is your plan for music and entertainment?',
      voiceEnabled: false,
      options: [
        { value: 'live_band', label: 'Live band', description: 'Full band performance' },
        { value: 'dj', label: 'DJ', description: 'Professional DJ with sound system' },
        { value: 'both', label: 'Band + DJ combo', description: 'Band for ceremony/cocktails, DJ for reception' },
        { value: 'playlist', label: 'Curated playlist', description: 'Self-managed with good speakers' },
        { value: 'undecided', label: 'Not sure yet', description: 'Need to think about this' },
      ],
      followUpPrompt:
        'A live band typically costs 3-5x what a DJ costs but creates a different energy. If budget is tight, a great DJ beats a mediocre band every time.',
      stage: { number: 5, label: 'Vendors & Services' },
      required: true,
    },

    // Stage 6: Design & Aesthetic
    {
      key: 'color_palette',
      type: 'open_text',
      question: 'Do you have a color palette or aesthetic theme in mind?',
      helper: 'Describe colors, textures, mood boards, or reference images. "Sage green and cream" or "industrial chic" — whatever feels right.',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back the aesthetic. If vague, offer 2-3 specific directions based on their venue type and vision to help them narrow it down.',
      stage: { number: 6, label: 'Design & Aesthetic' },
      required: false,
    },
    {
      key: 'formality_level',
      type: 'single_select',
      question: 'How formal is this event?',
      voiceEnabled: false,
      options: [
        { value: 'black_tie', label: 'Black tie / formal', description: 'Gowns and tuxedos' },
        { value: 'semi_formal', label: 'Semi-formal', description: 'Suits and cocktail dresses' },
        { value: 'dressy_casual', label: 'Dressy casual', description: 'Nice but relaxed' },
        { value: 'casual', label: 'Casual', description: 'Come as you are' },
      ],
      followUpPrompt:
        'This sets the tone for invitations, venue setup, and guest expectations. Make sure the formality matches the venue choice.',
      stage: { number: 6, label: 'Design & Aesthetic' },
      required: true,
    },

    // Stage 7: Logistics
    {
      key: 'ceremony_reception_same',
      type: 'single_select',
      question: 'Are the ceremony and reception at the same location?',
      voiceEnabled: false,
      options: [
        { value: 'same_venue', label: 'Yes, same venue', description: 'Everything in one place' },
        { value: 'different_venues', label: 'No, different locations', description: 'Ceremony at one place, reception at another' },
        { value: 'not_applicable', label: 'Not applicable', description: 'No ceremony component' },
      ],
      followUpPrompt:
        'If different locations, flag transportation logistics for guests. Shuttle buses, parking, and travel time between locations need to be planned.',
      stage: { number: 7, label: 'Logistics' },
      required: true,
    },
    {
      key: 'guest_travel',
      type: 'single_select',
      question: 'Will most guests be local or traveling in?',
      voiceEnabled: false,
      options: [
        { value: 'mostly_local', label: 'Mostly local', description: 'Most guests live nearby' },
        { value: 'mixed', label: 'Mix of local and traveling', description: 'About half and half' },
        { value: 'mostly_traveling', label: 'Mostly traveling', description: 'Most guests need flights or long drives' },
      ],
      followUpPrompt:
        'If many are traveling, mention hotel room blocks, welcome bags, and possibly a welcome dinner or next-day brunch as things to plan.',
      stage: { number: 7, label: 'Logistics' },
      required: true,
    },
    {
      key: 'special_considerations',
      type: 'open_text',
      question: 'Any special considerations we should plan around?',
      helper:
        'Dietary restrictions, accessibility needs, cultural or religious traditions, family dynamics, children, pets.',
      voiceEnabled: true,
      followUpPrompt:
        'Take note of everything mentioned. These details often get forgotten in planning and become last-minute emergencies. We will build them into the plan.',
      stage: { number: 7, label: 'Logistics' },
      required: false,
    },

    // Stage 8: Planning Support
    {
      key: 'planning_help',
      type: 'single_select',
      question: 'How much planning help do you have?',
      voiceEnabled: false,
      options: [
        { value: 'full_planner', label: 'Full-service planner', description: 'Professional handling everything' },
        { value: 'partial_planner', label: 'Partial planner or coordinator', description: 'Professional for some parts' },
        { value: 'day_of_only', label: 'Day-of coordinator only', description: 'Someone to run the day itself' },
        { value: 'diy', label: 'Doing it ourselves', description: 'No professional planning help' },
      ],
      followUpPrompt:
        'If DIY, be honest: planning a 100+ person event without a coordinator is a full-time job for 3-6 months. At minimum, a day-of coordinator is worth every penny. It frees you to actually enjoy the event.',
      stage: { number: 8, label: 'Planning Support' },
      required: true,
    },
    {
      key: 'planning_team',
      type: 'open_text',
      question: 'Who else is involved in the planning?',
      helper:
        'Partner, parents, bridal party, friends? Who is making decisions, and who is just helping execute?',
      voiceEnabled: true,
      followUpPrompt:
        'Acknowledge the team. Mention that having clear decision-making authority is critical. Too many cooks in the kitchen is the number one cause of planning stress.',
      stage: { number: 8, label: 'Planning Support' },
      required: false,
    },
    {
      key: 'biggest_stress',
      type: 'open_text',
      question: 'What part of planning stresses you out the most?',
      helper: 'Be honest. Budget? Family politics? Decision fatigue? The timeline?',
      voiceEnabled: true,
      followUpPrompt:
        'Validate their stress. It is real. Then briefly mention how the planning documents we generate will specifically address this concern.',
      stage: { number: 8, label: 'Planning Support' },
      required: true,
    },

    // Stage 9: Risks & Contingency
    {
      key: 'weather_plan',
      type: 'single_select',
      question: 'If any part of your event is outdoors, what is the rain plan?',
      voiceEnabled: false,
      options: [
        { value: 'tent', label: 'Tent on standby', description: 'We will rent a tent as backup' },
        { value: 'indoor_backup', label: 'Indoor backup space', description: 'Venue has an indoor option' },
        { value: 'no_plan_yet', label: 'No plan yet', description: 'Need to figure this out' },
        { value: 'not_applicable', label: 'Fully indoor', description: 'Not relevant' },
      ],
      followUpPrompt:
        'If no plan yet and they have outdoor elements, flag this as high priority. A rain plan is not optional — it is insurance.',
      stage: { number: 9, label: 'Risks & Contingency' },
      required: true,
    },
    {
      key: 'insurance',
      type: 'single_select',
      question: 'Are you getting event insurance?',
      helper: 'Most venues require it. It covers cancellation, liability, and vendor no-shows.',
      voiceEnabled: false,
      options: [
        { value: 'yes', label: 'Yes', description: 'Already purchased or plan to' },
        { value: 'looking_into_it', label: 'Looking into it', description: 'On the to-do list' },
        { value: 'no', label: 'No', description: 'Not planning to' },
        { value: 'didnt_know', label: 'Did not know this was a thing', description: 'Tell me more' },
      ],
      followUpPrompt:
        'Event insurance typically costs $150-$500 and covers far more than that. If they are spending over $10K on an event, it is a no-brainer.',
      stage: { number: 9, label: 'Risks & Contingency' },
      required: true,
    },
    {
      key: 'vendor_backup',
      type: 'open_text',
      question: 'What is your biggest worry about the event going wrong?',
      helper: 'Vendor cancellation? Family drama? Something going over budget? Weather? Say it out loud.',
      voiceEnabled: true,
      followUpPrompt:
        'Take their worry seriously. Mention that we will build specific contingency plans for this in the risk register.',
      stage: { number: 9, label: 'Risks & Contingency' },
      required: true,
    },

    // Stage 10: Success
    {
      key: 'success_definition',
      type: 'open_text',
      question: 'When this event is over and you look back on it, what makes you say "that was perfect"?',
      helper: 'Not perfect execution — perfect feeling. What is the one thing that has to go right?',
      voiceEnabled: true,
      followUpPrompt:
        'Reflect back their definition of success. This is the north star for every planning decision. Everything we build in the plan will optimize for this outcome.',
      stage: { number: 10, label: 'Success' },
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
    'budget',
    'roadmap',
    'raci_matrix',
    'go_to_market',
    'risk_register',
    'success_metrics',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ],
};
