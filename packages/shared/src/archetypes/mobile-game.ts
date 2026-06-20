import type { ArchetypeDefinition } from '../types';

export const mobileGame: ArchetypeDefinition = {
  slug: 'mobile_game',
  name: 'Indie Game',
  category: 'software',
  scriptVersion: 1,
  expertPersona:
    'You are an indie game developer who shipped 3 titles on Steam and 2 on mobile. One hit 50K downloads, the others were modest. You understand the difference between "fun to build" and "fun to play," and you push hard on scope control because every game dev underestimates by 3x.',
  estimatedMinutes: 45,
  iconName: 'gamepad-2',
  description:
    'Discovery script for indie and mobile game projects. Covers game design, technical decisions, monetization, scope control, art and audio pipelines, and launch strategy.',
  questions: [
    // =============================================
    // Stage 1: The Spark (Questions 1-3)
    // =============================================
    {
      key: 'game_concept',
      type: 'open_text',
      question:
        'Describe your game in two or three sentences. What does the player do, and why is it fun?',
      helper:
        'Focus on the core experience, not the lore. "You stack blocks under time pressure and the physics go wild" is better than three paragraphs of backstory.',
      voiceEnabled: true,
      followUpPrompt:
        'That gives me a picture. Before we go deeper, let me confirm we are in the right archetype for your project.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'archetype_confirm',
      type: 'archetype_confirm',
      question:
        'This sounds like an indie / mobile game project. Is that right, or would a different category fit better?',
      helper:
        'If your project is actually a gamified app, an educational tool, or a VR experience, we may want a different script.',
      voiceEnabled: true,
      options: [
        {
          value: 'confirmed',
          label: 'Yes, this is an indie / mobile game',
        },
        {
          value: 'change',
          label: 'No, I need a different archetype',
        },
      ],
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },
    {
      key: 'genre_feel',
      type: 'single_select',
      question:
        'Which genre or feel best matches your game? Pick the closest one.',
      helper:
        'If your game blends genres, choose the one that dominates moment-to-moment gameplay.',
      voiceEnabled: true,
      options: [
        {
          value: 'action_platformer',
          label: 'Action / Platformer',
          description: 'Reflex-driven gameplay with jumping, dodging, or combat',
        },
        {
          value: 'puzzle',
          label: 'Puzzle',
          description: 'Logic, spatial reasoning, or pattern recognition at the core',
        },
        {
          value: 'rpg',
          label: 'RPG / Adventure',
          description: 'Character progression, narrative, exploration',
        },
        {
          value: 'strategy',
          label: 'Strategy / Tower Defense',
          description: 'Planning, resource management, tactical decisions',
        },
        {
          value: 'simulation',
          label: 'Simulation / Tycoon',
          description: 'Systems-driven sandbox or management game',
        },
        {
          value: 'roguelike',
          label: 'Roguelike / Roguelite',
          description: 'Procedural runs with permadeath or persistent unlocks',
        },
        {
          value: 'casual_hypercasual',
          label: 'Casual / Hyper-casual',
          description: 'One-tap mechanics, short sessions, mass appeal',
        },
        {
          value: 'card_autobattler',
          label: 'Card Game / Auto-battler',
          description: 'Deck building, draft mechanics, automated combat',
        },
        {
          value: 'narrative',
          label: 'Narrative / Visual Novel',
          description: 'Story-first with branching choices',
        },
        {
          value: 'horror',
          label: 'Horror / Survival',
          description: 'Tension, resource scarcity, atmosphere-driven',
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Something that does not fit the above',
        },
      ],
      followUpPrompt:
        'Good. Now let us get into the actual design -- the part that determines whether your game is fun or just an idea.',
      stage: { number: 1, label: 'The Spark' },
      required: true,
    },

    // =============================================
    // Stage 2: Game Design (Questions 4-9)
    // =============================================
    {
      key: 'core_mechanic',
      type: 'open_text',
      question:
        'What is the single core mechanic the player repeats most often? Describe what their thumbs or mouse are doing second to second.',
      helper:
        'In Flappy Bird it is "tap to flap." In Slay the Spire it is "pick a card, play a card." What is yours? If you cannot name one action, your design might be too scattered.',
      voiceEnabled: true,
      followUpPrompt:
        'That is the heartbeat of your game. Everything else should support that loop.',
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },
    {
      key: 'player_motivation',
      type: 'multi_select',
      question:
        'What keeps the player coming back after the first session? Pick up to three.',
      helper:
        'Think about what the player brags about or screenshots to share.',
      voiceEnabled: true,
      options: [
        {
          value: 'mastery',
          label: 'Mastery',
          description: 'Getting better at a skill-based challenge',
        },
        {
          value: 'progression',
          label: 'Progression',
          description: 'Unlocking new content, levels, or abilities',
        },
        {
          value: 'story',
          label: 'Story',
          description: 'Finding out what happens next in the narrative',
        },
        {
          value: 'collection',
          label: 'Collection',
          description: 'Gathering items, characters, or achievements',
        },
        {
          value: 'social',
          label: 'Social / Competition',
          description: 'Leaderboards, co-op, or PvP bragging rights',
        },
        {
          value: 'creativity',
          label: 'Creativity / Expression',
          description: 'Building, decorating, or creating within the game',
        },
        {
          value: 'relaxation',
          label: 'Relaxation',
          description: 'Low-stress zen or meditative experience',
        },
        {
          value: 'discovery',
          label: 'Discovery / Exploration',
          description: 'Finding secrets, hidden areas, or emergent interactions',
        },
      ],
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },
    {
      key: 'progression_system',
      type: 'single_select',
      question: 'How does the player progress through your game?',
      helper:
        'This shapes your content pipeline. Linear levels are easier to build but procedural runs give more replayability.',
      voiceEnabled: true,
      options: [
        {
          value: 'linear_levels',
          label: 'Linear levels or chapters',
          description: 'Handcrafted stages played in order',
        },
        {
          value: 'open_world',
          label: 'Open world or hub with unlockable areas',
          description: 'Non-linear exploration gated by progression',
        },
        {
          value: 'procedural_runs',
          label: 'Procedural runs',
          description: 'Generated content each playthrough with meta progression',
        },
        {
          value: 'endless',
          label: 'Endless / score-chasing',
          description: 'No fixed end -- the goal is a higher score',
        },
        {
          value: 'narrative_branching',
          label: 'Narrative branching',
          description: 'Player choices determine the path through the story',
        },
        {
          value: 'match_based',
          label: 'Match-based',
          description: 'Discrete rounds or matches with ELO or rank systems',
        },
        {
          value: 'sandbox',
          label: 'Sandbox / no fixed progression',
          description: 'Player sets their own goals within the systems',
        },
      ],
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },
    {
      key: 'session_length',
      type: 'single_select',
      question: 'How long is a typical play session?',
      helper:
        'Mobile skews short. PC and console players tolerate longer sessions. This also affects save systems and monetization timing.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_1_min',
          label: 'Under 1 minute',
          description: 'Hyper-casual, one-attempt sessions',
        },
        {
          value: '1_to_5_min',
          label: '1 to 5 minutes',
          description: 'Quick bus-ride sessions, casual puzzles',
        },
        {
          value: '5_to_15_min',
          label: '5 to 15 minutes',
          description: 'A roguelite run or a couple of levels',
        },
        {
          value: '15_to_30_min',
          label: '15 to 30 minutes',
          description: 'Strategy session or a story chapter',
        },
        {
          value: '30_plus_min',
          label: '30 minutes or more',
          description: 'Deep RPG or simulation sessions',
        },
      ],
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },
    {
      key: 'inspiration_games',
      type: 'open_text',
      question:
        'Name two or three existing games that are closest to what you want to build. What would you borrow from each, and what would you change?',
      helper:
        'Every game stands on the shoulders of others. Being specific about what you would steal and what you would not helps define your identity. "It is Vampire Survivors meets a farming sim" tells me a lot.',
      voiceEnabled: true,
      followUpPrompt:
        'Good references. Knowing your inspirations helps me spot where you might accidentally inherit scope you do not need.',
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },
    {
      key: 'unique_hook',
      type: 'open_text',
      question:
        'What is the one thing a player would tell a friend that makes your game different from the games you just listed?',
      helper:
        'This is your hook -- the thing that shows up in a YouTube thumbnail or a tweet. If you cannot articulate it in one sentence, players will not either.',
      voiceEnabled: true,
      followUpPrompt:
        'That is the line that goes on your store page above the fold. Hold onto it. Now let us talk tech.',
      stage: { number: 2, label: 'Game Design' },
      required: true,
    },

    // =============================================
    // Stage 3: Technical (Questions 10-14)
    // =============================================
    {
      key: 'engine_choice',
      type: 'single_select',
      question: 'Which game engine or framework are you planning to use?',
      helper:
        'Your engine choice affects hiring, asset pipelines, platform support, and what middleware is available to you. Pick based on what you already know, not what is trendy.',
      voiceEnabled: true,
      options: [
        {
          value: 'unity',
          label: 'Unity',
          description: 'C# scripting, largest asset store, strong mobile export pipeline',
        },
        {
          value: 'unreal',
          label: 'Unreal Engine',
          description: 'C++ and Blueprints, best-in-class 3D rendering, heavier builds',
        },
        {
          value: 'godot',
          label: 'Godot',
          description: 'GDScript or C#, open source, lightweight, growing ecosystem',
        },
        {
          value: 'gamemaker',
          label: 'GameMaker',
          description: 'GML scripting, great for 2D, used by Undertale and Hyper Light Drifter',
        },
        {
          value: 'rpg_maker',
          label: 'RPG Maker',
          description: 'Specialized for JRPGs and narrative games, plugin ecosystem',
        },
        {
          value: 'construct',
          label: 'Construct',
          description: 'Visual scripting, browser-based editor, good for 2D web games',
        },
        {
          value: 'custom_framework',
          label: 'Custom engine or framework',
          description: 'SDL, MonoGame, Raylib, LOVE2D, Phaser, or your own from scratch',
        },
        {
          value: 'undecided',
          label: 'Not decided yet',
          description: 'Need guidance on which engine fits this project',
        },
      ],
      followUpPrompt:
        'Engine choice is one of the few decisions that is genuinely painful to reverse. Make sure you are comfortable with it before you write 10,000 lines of code.',
      stage: { number: 3, label: 'Technical' },
      required: true,
    },
    {
      key: 'platform_targets',
      type: 'multi_select',
      question: 'Which platforms are you targeting at launch? Select all that apply.',
      helper:
        'Each platform adds testing surface, store compliance work, and sometimes separate builds. Ship on one or two first, then port.',
      voiceEnabled: true,
      options: [
        {
          value: 'ios',
          label: 'iOS (iPhone / iPad)',
          description: 'App Store review, $99/yr developer account, TestFlight for beta',
        },
        {
          value: 'android',
          label: 'Android (Google Play)',
          description: '$25 one-time fee, wider device fragmentation',
        },
        {
          value: 'steam',
          label: 'Steam (PC / Mac / Linux)',
          description: '$100 listing fee, Steamworks SDK, wishlists matter',
        },
        {
          value: 'itch',
          label: 'itch.io',
          description: 'No fee, great for demos and jam builds, smaller audience',
        },
        {
          value: 'web',
          label: 'Web (browser)',
          description: 'Lowest friction for players, limited monetization, WebGL constraints',
        },
        {
          value: 'switch',
          label: 'Nintendo Switch',
          description: 'Requires approved developer status, good indie attach rates',
        },
        {
          value: 'xbox',
          label: 'Xbox (ID@Xbox)',
          description: 'Free dev kits program, Game Pass potential',
        },
        {
          value: 'playstation',
          label: 'PlayStation (PS Partners)',
          description: 'Dev kit costs, certification process, trophy requirements',
        },
        {
          value: 'epic',
          label: 'Epic Games Store',
          description: '12% revenue share, smaller catalog means more visibility',
        },
      ],
      stage: { number: 3, label: 'Technical' },
      required: true,
    },
    {
      key: 'multiplayer',
      type: 'single_select',
      question: 'Does your game have any multiplayer or online component?',
      helper:
        'Multiplayer is the single biggest scope multiplier in game development. If you are a solo dev or small team, think very carefully before checking anything beyond "single player only."',
      voiceEnabled: true,
      options: [
        {
          value: 'single_player_only',
          label: 'Single-player only',
          description: 'No networking required, simplest path',
        },
        {
          value: 'async_multiplayer',
          label: 'Asynchronous multiplayer',
          description: 'Leaderboards, ghost replays, shared worlds -- no real-time netcode',
        },
        {
          value: 'local_multiplayer',
          label: 'Local multiplayer',
          description: 'Same device or same network, no dedicated servers',
        },
        {
          value: 'online_coop',
          label: 'Online co-op',
          description: '2-4 players cooperating, needs netcode and matchmaking',
        },
        {
          value: 'online_pvp',
          label: 'Online PvP',
          description: 'Competitive real-time play, needs anti-cheat and server infrastructure',
        },
        {
          value: 'mmo_persistent',
          label: 'MMO or persistent world',
          description: 'Always-on servers, massive scope, substantial operating costs',
        },
      ],
      followUpPrompt:
        'If you picked anything beyond single-player, we will need to account for server costs and netcode complexity in the scope section.',
      stage: { number: 3, label: 'Technical' },
      required: true,
    },
    {
      key: 'art_style',
      type: 'single_select',
      question: 'What visual style are you going for?',
      helper:
        'Art style determines your asset pipeline, your team needs, and how long environment creation takes. Pixel art is not automatically faster -- it depends on animation complexity.',
      voiceEnabled: true,
      options: [
        {
          value: 'pixel_art',
          label: 'Pixel art',
          description: 'Retro aesthetic, sprite-based, can range from simple to lavishly detailed',
        },
        {
          value: 'hand_drawn_2d',
          label: 'Hand-drawn 2D',
          description: 'Illustrated or painted look, frame-by-frame or skeletal animation',
        },
        {
          value: 'vector_flat',
          label: 'Vector / flat design',
          description: 'Clean geometric shapes, scalable, popular in mobile',
        },
        {
          value: 'low_poly_3d',
          label: 'Low-poly 3D',
          description: 'Stylized 3D with minimal textures, forgiving for small teams',
        },
        {
          value: 'realistic_3d',
          label: 'Realistic 3D',
          description: 'High-fidelity models and textures, PBR materials, expensive to produce',
        },
        {
          value: 'voxel',
          label: 'Voxel',
          description: 'Block-based 3D, MagicaVoxel style, procedural-friendly',
        },
        {
          value: 'mixed_media',
          label: 'Mixed media or collage',
          description: 'Photography, paper cutout, or mixed with drawn elements',
        },
        {
          value: 'text_minimal',
          label: 'Text-based or minimal UI',
          description: 'ASCII, terminal aesthetic, or pure interface-driven',
        },
        {
          value: 'undecided',
          label: 'Not decided yet',
          description: 'Need help choosing a style that fits the game and the team',
        },
      ],
      stage: { number: 3, label: 'Technical' },
      required: true,
    },
    {
      key: 'audio_approach',
      type: 'single_select',
      question: 'What is your plan for music and sound effects?',
      helper:
        'Audio is often the last thing indie devs think about and the first thing players notice when it is missing or bad. Budget time and money for this.',
      voiceEnabled: true,
      options: [
        {
          value: 'original_composer',
          label: 'Original score from a composer',
          description: 'Hiring a musician or doing it yourself in a DAW',
        },
        {
          value: 'licensed_packs',
          label: 'Licensed music and SFX packs',
          description: 'Buying from asset stores, Epidemic Sound, or similar',
        },
        {
          value: 'procedural_adaptive',
          label: 'Procedural or adaptive audio',
          description: 'FMOD or Wwise-driven systems that react to gameplay',
        },
        {
          value: 'minimal_sfx_only',
          label: 'Minimal -- SFX only, no music',
          description: 'Sound effects but no background tracks',
        },
        {
          value: 'no_audio',
          label: 'No audio at all',
          description: 'Silent game or audio is not applicable',
        },
        {
          value: 'undecided',
          label: 'Not decided yet',
          description: 'Have not thought about audio strategy',
        },
      ],
      stage: { number: 3, label: 'Technical' },
      required: true,
    },

    // =============================================
    // Stage 4: The Player (Questions 15-18)
    // =============================================
    {
      key: 'target_audience',
      type: 'open_text',
      question:
        'Describe your ideal player. Who are they, what do they play now, and where do they hang out online?',
      helper:
        'Be specific. "Gamers" is not an audience. "25-35 year olds who play Stardew Valley and browse r/IndieGaming" is an audience. The more specific you are, the easier marketing becomes.',
      voiceEnabled: true,
      followUpPrompt:
        'Good. Knowing who your player is will shape every decision from difficulty to pricing.',
      stage: { number: 4, label: 'The Player' },
      required: true,
    },
    {
      key: 'age_rating',
      type: 'single_select',
      question: 'What age rating are you targeting?',
      helper:
        'This affects which stores accept your game, which ad networks you can use, and whether you need COPPA compliance. Violence, language, and sexual content all factor in.',
      voiceEnabled: true,
      options: [
        {
          value: 'everyone',
          label: 'Everyone (ESRB E / PEGI 3)',
          description: 'No objectionable content, widest possible audience',
        },
        {
          value: 'everyone_10',
          label: 'Everyone 10+ (ESRB E10+ / PEGI 7)',
          description: 'Mild cartoon violence or mild language',
        },
        {
          value: 'teen',
          label: 'Teen (ESRB T / PEGI 12)',
          description: 'Moderate violence, infrequent strong language',
        },
        {
          value: 'mature',
          label: 'Mature (ESRB M / PEGI 16-18)',
          description: 'Intense violence, blood, strong themes',
        },
        {
          value: 'unrated',
          label: 'Unrated / not applicable',
          description: 'Platforms like itch.io do not require a rating',
        },
      ],
      stage: { number: 4, label: 'The Player' },
      required: true,
    },
    {
      key: 'existing_community',
      type: 'single_select',
      question:
        'Do you already have any community or audience that would care about this game?',
      helper:
        'An existing audience -- even 200 people in a Discord -- dramatically changes your launch math. Be honest about where you are starting from.',
      voiceEnabled: true,
      options: [
        {
          value: 'none',
          label: 'Starting from zero',
          description: 'No existing followers, no mailing list, no Discord',
        },
        {
          value: 'small_following',
          label: 'Small following (under 1K)',
          description: 'A few hundred followers on social media or a small Discord',
        },
        {
          value: 'moderate_following',
          label: 'Moderate following (1K to 10K)',
          description: 'Active community from a previous project or content creation',
        },
        {
          value: 'large_following',
          label: 'Large following (10K+)',
          description: 'Established presence from streaming, YouTube, or prior games',
        },
        {
          value: 'previous_game',
          label: 'Mailing list or wishlist from a previous game',
          description: 'Direct access to players who already bought something from you',
        },
      ],
      stage: { number: 4, label: 'The Player' },
      required: true,
    },
    {
      key: 'player_acquisition',
      type: 'multi_select',
      question:
        'How will players find out about your game? Select all channels you plan to use.',
      helper:
        'Wishlist velocity on Steam, featuring on mobile stores, and organic social sharing are the three biggest free channels for indie games. Paid UA is expensive and mostly for F2P.',
      voiceEnabled: true,
      options: [
        {
          value: 'steam_wishlists',
          label: 'Steam store page and wishlists',
          description: 'Organic discovery through tags, sales, and recommendations',
        },
        {
          value: 'app_store_aso',
          label: 'App Store Optimization (ASO)',
          description: 'Keywords, screenshots, and ratings on iOS and Google Play',
        },
        {
          value: 'social_media',
          label: 'Social media (Twitter/X, TikTok, Reddit)',
          description: 'Devlogs, GIFs, and community engagement',
        },
        {
          value: 'youtube_streamers',
          label: 'YouTubers and streamers',
          description: 'Sending keys to content creators for coverage',
        },
        {
          value: 'press_media',
          label: 'Press and game media outlets',
          description: 'Reaching out to journalists, indie-focused sites',
        },
        {
          value: 'paid_ads',
          label: 'Paid user acquisition',
          description: 'Facebook, Google, Unity Ads, or TikTok ad campaigns',
        },
        {
          value: 'game_festivals',
          label: 'Game festivals and demos',
          description: 'Steam Next Fest, PAX, indie showcases, demo releases',
        },
        {
          value: 'cross_promotion',
          label: 'Cross-promotion from another game',
          description: 'In-game ads or links from a previous title',
        },
        {
          value: 'word_of_mouth',
          label: 'Word of mouth only',
          description: 'No active marketing, relying on organic sharing',
        },
      ],
      stage: { number: 4, label: 'The Player' },
      required: true,
    },

    // =============================================
    // Stage 5: Monetization (Questions 19-23)
    // =============================================
    {
      key: 'business_model',
      type: 'single_select',
      question: 'What is the primary business model for your game?',
      helper:
        'This is the most consequential business decision you will make. Premium games earn upfront but need strong marketing. Free-to-play earns over time but needs retention mechanics and a live-ops mindset.',
      voiceEnabled: true,
      options: [
        {
          value: 'premium',
          label: 'Premium (pay once)',
          description: 'Players pay upfront, no recurring revenue unless you ship DLC',
        },
        {
          value: 'free_to_play',
          label: 'Free-to-play with IAP',
          description: 'Free download, revenue from in-app purchases',
        },
        {
          value: 'freemium',
          label: 'Freemium (free with premium unlock)',
          description: 'Free demo or limited version, one-time purchase to unlock the full game',
        },
        {
          value: 'ad_supported',
          label: 'Ad-supported (free with ads)',
          description: 'Revenue from interstitial, rewarded, or banner ads',
        },
        {
          value: 'subscription',
          label: 'Subscription',
          description: 'Monthly or annual fee for access or content drops',
        },
        {
          value: 'hybrid',
          label: 'Hybrid (IAP plus ads)',
          description: 'Combining in-app purchases with ad revenue',
        },
        {
          value: 'patreon_crowdfund',
          label: 'Crowdfunded or patron-supported',
          description: 'Kickstarter, Patreon, or similar -- the game itself may be free',
        },
        {
          value: 'undecided',
          label: 'Not decided yet',
          description: 'Need guidance on which model fits the game',
        },
      ],
      followUpPrompt:
        'Your monetization model shapes your game design. A premium game needs a strong first impression. A F2P game needs a reason to come back every day.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'price_point',
      type: 'single_select',
      question: 'What price range are you considering?',
      helper:
        'On mobile, anything above $4.99 is a hard sell unless you have strong brand recognition. On Steam, $9.99 to $19.99 is the indie sweet spot. Price signals quality -- too cheap and people assume it is bad.',
      voiceEnabled: true,
      options: [
        {
          value: 'free',
          label: 'Free',
          description: 'No upfront cost, monetized through ads, IAP, or not at all',
        },
        {
          value: 'under_2',
          label: '$0.99 - $1.99',
          description: 'Impulse purchase territory, common for mobile',
        },
        {
          value: '2_to_5',
          label: '$2.99 - $4.99',
          description: 'Standard mobile premium or cheap PC indie',
        },
        {
          value: '5_to_10',
          label: '$4.99 - $9.99',
          description: 'Mid-range indie, works on both mobile and PC',
        },
        {
          value: '10_to_20',
          label: '$9.99 - $19.99',
          description: 'Standard PC indie, needs enough content to justify',
        },
        {
          value: '20_to_30',
          label: '$19.99 - $29.99',
          description: 'Premium indie, needs polished production values',
        },
        {
          value: 'over_30',
          label: '$30+',
          description: 'AA territory, rare for indie without strong brand',
        },
      ],
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },
    {
      key: 'iap_types',
      type: 'multi_select',
      question:
        'If your game has in-app purchases, what types? Select all that apply, or skip if not applicable.',
      helper:
        'The IAP design needs to feel fair or your reviews will tank. Cosmetics are the safest. Pay-to-win mechanics can work in some genres but destroy trust in others.',
      voiceEnabled: true,
      options: [
        {
          value: 'cosmetics',
          label: 'Cosmetic items (skins, themes, effects)',
          description: 'Visual-only items that do not affect gameplay',
        },
        {
          value: 'consumables',
          label: 'Consumables (gems, energy, lives)',
          description: 'Items that are used up and need repurchasing',
        },
        {
          value: 'permanent_unlocks',
          label: 'Permanent unlocks (characters, levels)',
          description: 'One-time purchases that expand the game',
        },
        {
          value: 'battle_pass',
          label: 'Battle pass or season pass',
          description: 'Time-limited progression track with free and paid tiers',
        },
        {
          value: 'remove_ads',
          label: 'Remove ads purchase',
          description: 'One-time IAP to disable all ads',
        },
        {
          value: 'loot_boxes',
          label: 'Gacha or loot boxes',
          description: 'Randomized rewards -- check regional regulations',
        },
        {
          value: 'none',
          label: 'No IAP planned',
          description: 'The game does not include in-app purchases',
        },
      ],
      stage: { number: 5, label: 'Monetization' },
      required: false,
    },
    {
      key: 'ads_strategy',
      type: 'single_select',
      question:
        'If your game includes ads, what ad format are you planning to use?',
      helper:
        'Rewarded ads have the highest eCPM and the least player friction. Interstitials are disruptive but common. Banner ads earn almost nothing on their own. Skip if no ads planned.',
      voiceEnabled: true,
      options: [
        {
          value: 'rewarded_only',
          label: 'Rewarded video only',
          description: 'Player opts in to watch an ad for an in-game reward',
        },
        {
          value: 'interstitial',
          label: 'Interstitial ads between sessions',
          description: 'Full-screen ads shown at natural break points',
        },
        {
          value: 'banner',
          label: 'Banner ads',
          description: 'Always-visible strip ad, low revenue but non-intrusive',
        },
        {
          value: 'mixed_ads',
          label: 'Mix of rewarded and interstitial',
          description: 'Combining formats for higher total revenue',
        },
        {
          value: 'no_ads',
          label: 'No ads',
          description: 'The game will not show any advertisements',
        },
      ],
      stage: { number: 5, label: 'Monetization' },
      required: false,
    },
    {
      key: 'revenue_expectations',
      type: 'single_select',
      question:
        'What revenue outcome would make this project a success in your eyes?',
      helper:
        'Be honest with yourself. The median indie game on Steam earns under $5,000 lifetime. Mobile is even more brutal without UA spend. Knowing your target helps us scope appropriately.',
      voiceEnabled: true,
      options: [
        {
          value: 'hobby',
          label: 'No revenue expectations -- this is a hobby or portfolio piece',
          description: 'Success is shipping, not earning',
        },
        {
          value: 'recoup_costs',
          label: 'Recoup direct costs (under $5K)',
          description: 'Break even on asset purchases, licenses, and fees',
        },
        {
          value: 'side_income',
          label: 'Side income ($5K - $25K)',
          description: 'Meaningful money but not a living wage',
        },
        {
          value: 'living_wage',
          label: 'Living wage ($25K - $100K)',
          description: 'Enough to fund the next project or pay bills for a year',
        },
        {
          value: 'business',
          label: 'Business-sustaining ($100K+)',
          description: 'Revenue that supports a small studio long-term',
        },
        {
          value: 'venture_scale',
          label: 'Venture scale ($1M+)',
          description: 'Aiming for a breakout hit with investor backing',
        },
      ],
      followUpPrompt:
        'Revenue expectations are the reality check that keeps scope honest. Let us now talk about what you actually need to build.',
      stage: { number: 5, label: 'Monetization' },
      required: true,
    },

    // =============================================
    // Stage 6: Scope (Questions 24-29)
    // =============================================
    {
      key: 'mvp_features',
      type: 'open_text',
      question:
        'List the absolute minimum set of features your game needs to be playable and testable. What is the smallest version that is still fun?',
      helper:
        'Think "game jam build that proves the core loop." Not menus, not achievements, not save systems -- what does the player DO and is it fun? If your MVP list has more than five items, it is probably too big.',
      voiceEnabled: true,
      followUpPrompt:
        'Good. I am going to push back on anything on that list that is not strictly needed for the core loop to feel good.',
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'content_volume',
      type: 'open_text',
      question:
        'How much content does the full release need? Think in terms of levels, characters, items, hours of gameplay, or whatever unit makes sense for your game.',
      helper:
        'Content is the iceberg that sinks indie projects. A platformer with 50 handcrafted levels is 10x the work of one with 10. Be specific with numbers, not vague words like "a lot."',
      voiceEnabled: true,
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'what_to_cut',
      type: 'open_text',
      question:
        'What features or content have you been imagining that you would be willing to cut if time or money runs out?',
      helper:
        'Every project needs a "cut list" decided before the pressure hits. If you decide what to cut when you are stressed and behind schedule, you will cut the wrong things. Decide now while you are calm.',
      voiceEnabled: true,
      followUpPrompt:
        'Good. Having a cut list ready is the mark of someone who will actually ship.',
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'vertical_slice_timeline',
      type: 'single_select',
      question:
        'How long do you think it will take to build a vertical slice -- one complete, polished level or loop that represents the final quality?',
      helper:
        'A vertical slice proves that your core loop works and looks good. It is the single most important milestone in game development. Multiply whatever you think by two.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_1_month',
          label: 'Under 1 month',
          description: 'Very small scope or existing prototype',
        },
        {
          value: '1_to_3_months',
          label: '1 to 3 months',
          description: 'Typical for a solo dev working part-time',
        },
        {
          value: '3_to_6_months',
          label: '3 to 6 months',
          description: 'Small team or complex mechanics',
        },
        {
          value: '6_to_12_months',
          label: '6 to 12 months',
          description: 'Ambitious scope or 3D production pipeline',
        },
        {
          value: 'over_12_months',
          label: 'Over 12 months',
          description: 'Large project -- consider whether the scope is realistic',
        },
      ],
      followUpPrompt:
        'Whatever timeline you just picked, the actual time will probably be 2x to 3x that. I am not being pessimistic -- that is the base rate for game development.',
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'full_release_timeline',
      type: 'single_select',
      question: 'When do you want the full game released?',
      helper:
        'Work backwards from your target date. If you want to launch in 12 months and your vertical slice takes 6, you have 6 months to produce all remaining content, polish, test, and market.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_6_months',
          label: 'Under 6 months',
          description: 'Very tight -- only works for small scope',
        },
        {
          value: '6_to_12_months',
          label: '6 to 12 months',
          description: 'Aggressive but achievable for focused projects',
        },
        {
          value: '1_to_2_years',
          label: '1 to 2 years',
          description: 'Standard indie timeline for a mid-sized game',
        },
        {
          value: '2_to_3_years',
          label: '2 to 3 years',
          description: 'Ambitious scope, common for RPGs and strategy games',
        },
        {
          value: 'over_3_years',
          label: 'Over 3 years',
          description: 'High risk of burnout and market shifts -- plan milestones carefully',
        },
        {
          value: 'no_deadline',
          label: 'No fixed deadline',
          description: 'Shipping when it is ready, no external pressure',
        },
      ],
      stage: { number: 6, label: 'Scope' },
      required: true,
    },
    {
      key: 'post_launch_plans',
      type: 'single_select',
      question: 'What happens after launch?',
      helper:
        'The work does not end at launch, especially for F2P games. Even premium games benefit from bug fix patches and a content update or two. Plan for at least 3 months of post-launch support.',
      voiceEnabled: true,
      options: [
        {
          value: 'ship_and_move_on',
          label: 'Ship and move on',
          description: 'Bug fixes only, then start the next project',
        },
        {
          value: 'minor_updates',
          label: 'Minor updates for 3-6 months',
          description: 'Bug fixes plus a few free content drops',
        },
        {
          value: 'dlc_expansions',
          label: 'Paid DLC or expansions',
          description: 'Substantial new content sold separately',
        },
        {
          value: 'live_service',
          label: 'Live service with regular content',
          description: 'Ongoing updates, events, seasons -- requires sustained team',
        },
        {
          value: 'early_access_iteration',
          label: 'Early Access with community-driven development',
          description: 'Launch incomplete, iterate publicly based on feedback',
        },
        {
          value: 'undecided',
          label: 'Not decided yet',
          description: 'Will figure it out based on launch performance',
        },
      ],
      stage: { number: 6, label: 'Scope' },
      required: true,
    },

    // =============================================
    // Stage 7: Art & Audio (Questions 30-33)
    // =============================================
    {
      key: 'art_pipeline',
      type: 'single_select',
      question: 'How will game art assets be created?',
      helper:
        'Your art pipeline is the bottleneck for most indie games. The choice here determines how fast you can produce content and how consistent it looks.',
      voiceEnabled: true,
      options: [
        {
          value: 'self_created',
          label: 'I am creating all art myself',
          description: 'Full creative control, limited by your own skill and speed',
        },
        {
          value: 'dedicated_artist',
          label: 'Dedicated artist on the team',
          description: 'Someone on the team whose primary role is art production',
        },
        {
          value: 'freelance_commission',
          label: 'Freelance or commissioned art',
          description: 'Hiring artists per-asset or per-milestone',
        },
        {
          value: 'asset_store',
          label: 'Pre-made asset packs',
          description: 'Purchased from Unity Asset Store, itch.io, or similar marketplaces',
        },
        {
          value: 'ai_assisted',
          label: 'AI-assisted with manual cleanup',
          description: 'Using generation tools as a starting point, then refining by hand',
        },
        {
          value: 'mixed_pipeline',
          label: 'Mix of the above',
          description: 'Different approaches for different asset types',
        },
      ],
      stage: { number: 7, label: 'Art & Audio' },
      required: true,
    },
    {
      key: 'artist_needs',
      type: 'open_text',
      question:
        'What specific art roles or skills does your project need that you do not currently have covered? Examples: character animator, environment artist, UI designer, VFX artist.',
      helper:
        'Be specific about what is missing. "I need art" is not actionable. "I need someone who can animate 16-frame walk cycles for pixel characters" is something you can hire for.',
      voiceEnabled: true,
      stage: { number: 7, label: 'Art & Audio' },
      required: false,
    },
    {
      key: 'music_sfx_approach',
      type: 'open_text',
      question:
        'Describe the sound and music direction for your game. What should it feel like? Reference specific games or composers if it helps.',
      helper:
        'Good audio direction is specific. "Epic orchestral" is vague. "Low-fi synthwave with FM synth bass, like Hotline Miami but slower tempo" gives a composer something to work with.',
      voiceEnabled: true,
      stage: { number: 7, label: 'Art & Audio' },
      required: false,
    },
    {
      key: 'ui_style',
      type: 'single_select',
      question: 'What is the UI philosophy for your game?',
      helper:
        'Mobile games live or die by their UI. If the player cannot figure out how to play in 10 seconds, they uninstall. Console and PC games have more latitude but good UI still matters.',
      voiceEnabled: true,
      options: [
        {
          value: 'diegetic',
          label: 'Diegetic (in-world)',
          description: 'UI elements exist within the game world -- no HUD overlay',
        },
        {
          value: 'minimal_hud',
          label: 'Minimal HUD',
          description: 'As little on-screen information as possible, clean and focused',
        },
        {
          value: 'standard_hud',
          label: 'Standard HUD with menus',
          description: 'Health bars, inventory, minimap -- genre-appropriate overlays',
        },
        {
          value: 'rich_ui',
          label: 'Rich UI with many panels',
          description: 'Strategy or simulation style with dense information displays',
        },
        {
          value: 'touch_optimized',
          label: 'Touch-first design',
          description: 'Large tap targets, gesture controls, designed for thumbs',
        },
        {
          value: 'text_based',
          label: 'Text-based interface',
          description: 'Primary interaction through text, menus, and dialog',
        },
      ],
      stage: { number: 7, label: 'Art & Audio' },
      required: true,
    },

    // =============================================
    // Stage 8: Resources (Questions 34-37)
    // =============================================
    {
      key: 'budget',
      type: 'single_select',
      question: 'What is your total budget for this project, including all costs?',
      helper:
        'Include hardware, software licenses, asset purchases, contractor payments, marketing spend, and store listing fees. Do not include your own time unless you are paying yourself from savings.',
      voiceEnabled: true,
      options: [
        {
          value: 'zero',
          label: '$0 -- using only free tools and my own time',
          description: 'No financial investment, all sweat equity',
        },
        {
          value: 'under_500',
          label: 'Under $500',
          description: 'Covers store fees and a few asset packs',
        },
        {
          value: '500_to_2k',
          label: '$500 - $2,000',
          description: 'Some freelance help or licensed tools',
        },
        {
          value: '2k_to_10k',
          label: '$2,000 - $10,000',
          description: 'Serious indie budget, can hire specialists for key areas',
        },
        {
          value: '10k_to_50k',
          label: '$10,000 - $50,000',
          description: 'Small studio budget, can sustain a team for months',
        },
        {
          value: '50k_to_200k',
          label: '$50,000 - $200,000',
          description: 'Publisher-backed indie or well-funded studio',
        },
        {
          value: 'over_200k',
          label: '$200,000+',
          description: 'AA scope, likely with investor or publisher funding',
        },
      ],
      stage: { number: 8, label: 'Resources' },
      required: true,
    },
    {
      key: 'team_composition',
      type: 'open_text',
      question:
        'Who is on the team? List each person, their role, and whether they are full-time, part-time, or contract. If it is just you, say so.',
      helper:
        'A solo dev wearing every hat is common in indie games but it means everything takes longer. Be realistic about what one person can do in a week.',
      voiceEnabled: true,
      followUpPrompt:
        'Got it. Team size and composition directly affects how fast you can produce content and how many things can happen in parallel.',
      stage: { number: 8, label: 'Resources' },
      required: true,
    },
    {
      key: 'time_commitment',
      type: 'single_select',
      question:
        'How many hours per week can the core team realistically commit to this project?',
      helper:
        'Be honest. If you have a day job, commute, and family, maybe you get 10 to 15 focused hours per week. Working 80-hour weeks leads to burnout, not shipped games.',
      voiceEnabled: true,
      options: [
        {
          value: 'under_10',
          label: 'Under 10 hours per week',
          description: 'Hobby pace -- expect slow progress and plan accordingly',
        },
        {
          value: '10_to_20',
          label: '10 to 20 hours per week',
          description: 'Part-time commitment alongside other work',
        },
        {
          value: '20_to_40',
          label: '20 to 40 hours per week',
          description: 'Significant commitment, possibly full-time for one person',
        },
        {
          value: 'over_40',
          label: 'Over 40 hours per week (full-time team)',
          description: 'Full-time development, multiple people',
        },
      ],
      stage: { number: 8, label: 'Resources' },
      required: true,
    },
    {
      key: 'tools_licenses',
      type: 'multi_select',
      question:
        'Which tools and licenses do you already have or plan to acquire? Select all that apply.',
      helper:
        'Missing tools mid-project stalls progress. Figure out what you need now, and budget for anything that costs money.',
      voiceEnabled: true,
      options: [
        {
          value: 'engine_license',
          label: 'Game engine (Unity Pro, Unreal, etc.)',
          description: 'Some engines are free up to a revenue threshold',
        },
        {
          value: 'ide',
          label: 'IDE or code editor (VS Code, Rider, Visual Studio)',
          description: 'Your primary coding environment',
        },
        {
          value: 'art_2d',
          label: '2D art tools (Aseprite, Photoshop, Krita, Procreate)',
          description: 'For sprites, textures, UI elements',
        },
        {
          value: 'art_3d',
          label: '3D art tools (Blender, Maya, ZBrush)',
          description: 'For models, rigging, and 3D animation',
        },
        {
          value: 'audio_tools',
          label: 'Audio tools (FMOD, Wwise, Audacity, a DAW)',
          description: 'For music production, SFX editing, and adaptive audio',
        },
        {
          value: 'version_control',
          label: 'Version control (Git, Perforce, PlasticSCM)',
          description: 'Essential for any project -- yes, even solo projects',
        },
        {
          value: 'project_management',
          label: 'Project management (Trello, Jira, Notion, HacknPlan)',
          description: 'Task tracking, sprint planning, milestone management',
        },
        {
          value: 'ci_cd',
          label: 'Build pipeline (Unity Cloud Build, GameCI, custom CI)',
          description: 'Automated builds and testing across platforms',
        },
        {
          value: 'analytics',
          label: 'Analytics and crash reporting (GameAnalytics, Firebase, Sentry)',
          description: 'Player behavior data and crash tracking',
        },
        {
          value: 'backend',
          label: 'Backend services (PlayFab, Firebase, Nakama, custom)',
          description: 'For leaderboards, saves, matchmaking, or live ops',
        },
      ],
      stage: { number: 8, label: 'Resources' },
      required: false,
    },

    // =============================================
    // Stage 9: Launch (Questions 38-39)
    // =============================================
    {
      key: 'launch_strategy',
      type: 'single_select',
      question: 'What is your platform launch strategy?',
      helper:
        'Simultaneous multi-platform launches split your attention during the most critical week. A staggered launch lets you fix problems on one platform before the next audience sees the game.',
      voiceEnabled: true,
      options: [
        {
          value: 'single_platform_first',
          label: 'Launch on one platform, port later',
          description: 'Focus your effort, learn from feedback before expanding',
        },
        {
          value: 'simultaneous',
          label: 'Simultaneous launch on all target platforms',
          description: 'Maximizes day-one reach but highest QA burden',
        },
        {
          value: 'early_access_then_full',
          label: 'Early Access first, full release later',
          description: 'Get feedback and revenue early, build in public',
        },
        {
          value: 'soft_launch',
          label: 'Soft launch in select regions, then worldwide',
          description: 'Common for mobile -- test in Canada, Australia, or Philippines first',
        },
        {
          value: 'demo_then_full',
          label: 'Free demo first, then paid full release',
          description: 'Build wishlists and community with a demo, then convert',
        },
      ],
      followUpPrompt:
        'Good. A clear launch strategy keeps the final months focused instead of chaotic.',
      stage: { number: 9, label: 'Launch' },
      required: true,
    },
    {
      key: 'marketing_approach',
      type: 'open_text',
      question:
        'Describe your marketing plan. When does marketing start, what channels will you use, and what is your marketing budget as a percentage of total budget?',
      helper:
        'Marketing should start the moment you have something that looks good in a GIF or screenshot. For Steam, you want your store page live 6 to 12 months before launch to accumulate wishlists. For mobile, ASO and a launch-day UA budget matter more. If your marketing budget is zero, your plan needs to rely entirely on organic channels.',
      voiceEnabled: true,
      followUpPrompt:
        'One more question. Let us define what winning looks like for you.',
      stage: { number: 9, label: 'Launch' },
      required: true,
    },

    // =============================================
    // Stage 10: Success (Question 40)
    // =============================================
    {
      key: 'success_definition',
      type: 'open_text',
      question:
        'One year after launch, what specific outcomes would make you say this project was a success? Give me numbers or concrete milestones, not feelings.',
      helper:
        'Examples: "10,000 downloads and 4.5 star rating on Google Play," or "Recoup my $15K investment and get featured in one indie showcase," or "Build a portfolio piece good enough to get hired at a game studio." Vague goals like "people enjoy it" are not measurable.',
      voiceEnabled: true,
      followUpPrompt:
        'That is the finish line. Everything we plan from here works backward from those numbers. Let me put together your project plan.',
      stage: { number: 10, label: 'Success' },
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
