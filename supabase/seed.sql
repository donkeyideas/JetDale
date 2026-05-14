-- Seed data: 5 launch archetypes

insert into public.archetypes (slug, name, category, description, icon_name, script_version, question_count, estimated_minutes, artifact_types, expert_persona, is_active, is_premium)
values
  (
    'indie_software',
    'Indie software / SaaS',
    'software',
    'For solo founders and indie hackers building software products. Covers problem validation, monetization, MVP scoping, and technical architecture.',
    'rocket',
    1,
    35,
    22,
    '{vision,scope,personas,roadmap,tech_stack,risk_register,success_metrics,budget}'::public.artifact_type[],
    'You are a former indie hacker who has shipped 4 SaaS products, two of which reached $10K MRR and one that failed spectacularly. You learned more from the failure. You have strong opinions on pricing, distribution, and scope control. You speak plainly, push back on feature bloat, and always ask "who is paying for this and why?"',
    true,
    false
  ),
  (
    'ai_built_app',
    'App built with AI builders',
    'software',
    'For non-technical creators using AI coding tools like Lovable, Cursor, Claude Code, Bolt, or Replit. Focuses on what to build before opening the AI tool.',
    'cpu',
    1,
    30,
    18,
    '{vision,scope,personas,roadmap,tech_stack,risk_register,success_metrics,budget}'::public.artifact_type[],
    'You are a product designer who transitioned into AI-assisted development. You have shipped 6 apps using Lovable, Cursor, and Claude Code. You understand the gap between "I got a demo working" and "I have a product people pay for." You help people think before they prompt.',
    true,
    false
  ),
  (
    'mobile_game',
    'Indie game',
    'software',
    'For game developers building with Unity, Unreal, Godot, or GameMaker. Covers game design, monetization strategy, art pipeline, and launch planning.',
    'gamepad',
    1,
    40,
    25,
    '{vision,scope,personas,roadmap,tech_stack,risk_register,success_metrics,budget}'::public.artifact_type[],
    'You are an indie game developer who shipped 3 titles on Steam and 2 on mobile. One hit 50K downloads, the others were modest. You understand the difference between "fun to build" and "fun to play," and you push hard on scope control because every game dev underestimates by 3x.',
    true,
    false
  ),
  (
    'wedding_event',
    'Wedding or event',
    'event',
    'For couples planning a wedding or anyone organizing a major event. Covers budget allocation, vendor selection, timeline, logistics, and contingency planning.',
    'calendar',
    1,
    35,
    20,
    '{vision,scope,personas,roadmap,risk_register,success_metrics,budget}'::public.artifact_type[],
    'You are a veteran event planner with 12 years of experience coordinating over 200 weddings and corporate events. You have seen every disaster and know how to prevent them. You are warm but direct about budget realities and timeline constraints.',
    true,
    false
  ),
  (
    'home_renovation',
    'Home renovation project',
    'physical',
    'For homeowners planning renovations. Covers project scoping, contractor management, permit requirements, budget tracking, and timeline planning.',
    'home',
    1,
    35,
    20,
    '{vision,scope,roadmap,risk_register,success_metrics,budget}'::public.artifact_type[],
    'You are a licensed general contractor with 15 years of residential renovation experience. You have managed over 100 projects from kitchen remodels to full gut renovations. You know what homeowners underestimate, where hidden costs lurk, and when to DIY versus hire out.',
    true,
    false
  );

-- Seed initial feature flags
insert into public.feature_flags (key, enabled, rollout_percentage, metadata)
values
  ('voice_input', true, 100, '{"description": "Enable voice input in discovery flow"}'),
  ('reality_check', true, 100, '{"description": "Enable AI reality check feature"}'),
  ('export_pdf', true, 100, '{"description": "Enable PDF export target"}'),
  ('export_pitch_deck', true, 100, '{"description": "Enable pitch deck export target"}'),
  ('team_plan', false, 0, '{"description": "Enable team plan features"}'),
  ('weekly_emails', true, 100, '{"description": "Enable weekly check-in emails"}');
