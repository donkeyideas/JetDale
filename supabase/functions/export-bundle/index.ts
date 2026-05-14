// ============================================================
// Jetdale — Export Bundle Edge Function
// Generates export bundles for different targets (AI coding tools,
// markdown, PDF, pitch deck, RFP). Uploads to Supabase Storage
// and returns a signed download URL.
// ============================================================

import { getAuthUser, getAdminClient, AuthError } from '../_shared/auth.ts';
import { checkQuota, incrementQuota } from '../_shared/quota-check.ts';
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  limitExceededResponse,
} from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';

// ============================================================
// Types
// ============================================================

type ExportTarget =
  | 'claude_code'
  | 'cursor'
  | 'lovable'
  | 'bolt'
  | 'replit'
  | 'zip_markdown'
  | 'pdf'
  | 'pitch_deck'
  | 'rfp';

const VALID_TARGETS: ExportTarget[] = [
  'claude_code',
  'cursor',
  'lovable',
  'bolt',
  'replit',
  'zip_markdown',
  'pdf',
  'pitch_deck',
  'rfp',
];

interface ExportFile {
  path: string;
  content: string;
}

interface ExportBundle {
  files: ExportFile[];
  metadata: {
    projectName: string;
    target: ExportTarget;
    generatedAt: string;
  };
}

interface ProjectData {
  id: string;
  name: string;
  tagline: string | null;
  phase: string;
  status: string;
  progress_pct: number;
}

interface ArchetypeData {
  slug: string;
  name: string;
  category: string;
  description: string | null;
}

interface ArtifactData {
  type: string;
  title: string | null;
  content_markdown: string | null;
  content_json: unknown;
}

// ============================================================
// Friendly display names for artifact types
// ============================================================

const ARTIFACT_LABELS: Record<string, string> = {
  vision: 'Vision Document',
  scope: 'Scope & Requirements',
  personas: 'User Personas',
  competitive_analysis: 'Competitive Analysis',
  user_journey: 'User Journey Map',
  roadmap: 'Project Roadmap',
  tech_stack: 'Tech Stack',
  architecture_overview: 'Architecture Overview',
  wireframes: 'Wireframe Descriptions',
  raci_matrix: 'RACI Matrix',
  risk_register: 'Risk Register',
  success_metrics: 'Success Metrics',
  budget: 'Budget Breakdown',
  go_to_market: 'Go-to-Market Plan',
  decision_log: 'Decision Log',
  pre_mortem: 'Pre-Mortem Analysis',
  pitch_deck: 'Pitch Deck',
};

// 7 days in seconds
const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    // ----- Auth -----
    const user = await getAuthUser(req);
    const body = await req.json();
    const { projectId, target } = body as {
      projectId?: string;
      target?: string;
    };

    // ----- Validate input -----
    if (!projectId) {
      return errorResponse('projectId is required', 400);
    }
    if (!target || !VALID_TARGETS.includes(target as ExportTarget)) {
      return errorResponse(
        `target is required and must be one of: ${VALID_TARGETS.join(', ')}`,
        400,
      );
    }
    const exportTarget = target as ExportTarget;

    // ----- Quota check -----
    // zip_markdown is the free-tier option, but we still count it
    const quotaCheck = await checkQuota(
      user.id,
      user.planTier,
      'exportsPerMonth',
    );
    if (!quotaCheck.allowed) {
      return limitExceededResponse(
        quotaCheck.limit!,
        quotaCheck.current!,
        quotaCheck.max!,
      );
    }

    const admin = getAdminClient();

    // ----- Verify project ownership -----
    const { data: project, error: projectErr } = await admin
      .from('projects')
      .select('id, name, tagline, phase, status, progress_pct')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectErr || !project) {
      return errorResponse('Project not found', 404);
    }

    // ----- Load archetype -----
    const { data: archetype } = await admin
      .from('projects')
      .select('archetype_id')
      .eq('id', projectId)
      .single();

    let archetypeData: ArchetypeData | null = null;
    if (archetype?.archetype_id) {
      const { data: arch } = await admin
        .from('archetypes')
        .select('slug, name, category, description')
        .eq('id', archetype.archetype_id)
        .single();
      archetypeData = arch;
    }

    // ----- Load all current artifacts -----
    const { data: artifacts } = await admin
      .from('artifacts')
      .select('type, title, content_markdown, content_json')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .eq('status', 'ready');

    const allArtifacts: ArtifactData[] = artifacts ?? [];

    // ----- Create export row (preparing) -----
    const { data: exportRow, error: exportInsertErr } = await admin
      .from('exports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        target: exportTarget,
        status: 'preparing',
      })
      .select('id')
      .single();

    if (exportInsertErr || !exportRow) {
      console.error('Failed to create export row:', exportInsertErr);
      return errorResponse('Failed to initialize export', 500);
    }

    const exportId: string = exportRow.id;

    try {
      // ----- Generate bundle -----
      const bundle = generateBundle(
        exportTarget,
        project as ProjectData,
        archetypeData,
        allArtifacts,
      );

      // ----- Upload to Storage -----
      const storagePath = `${user.id}/${projectId}/${exportId}/bundle.json`;
      const bundleJson = JSON.stringify(bundle, null, 2);
      const bundleBytes = new TextEncoder().encode(bundleJson);

      const { error: uploadErr } = await admin.storage
        .from('exports')
        .upload(storagePath, bundleBytes, {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadErr) {
        console.error('Storage upload failed:', uploadErr);
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      // ----- Create signed URL -----
      const { data: signedUrlData, error: signedUrlErr } = await admin.storage
        .from('exports')
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

      if (signedUrlErr || !signedUrlData?.signedUrl) {
        console.error('Signed URL creation failed:', signedUrlErr);
        throw new Error('Failed to create signed download URL');
      }

      // ----- Update export row to ready -----
      const expiresAt = new Date(
        Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
      ).toISOString();

      await admin
        .from('exports')
        .update({
          status: 'ready',
          storage_path: storagePath,
          file_size_bytes: bundleBytes.length,
          expires_at: expiresAt,
        })
        .eq('id', exportId);

      // ----- Increment quota -----
      await incrementQuota(user.id, 'exports_run');

      // ----- Update project phase if still on artifacts/refine -----
      if (project.phase === 'artifacts' || project.phase === 'refine') {
        await admin
          .from('projects')
          .update({
            phase: 'export',
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', projectId);
      }

      // ----- Log product event -----
      await logProductEvent({
        userId: user.id,
        event: 'export_completed',
        properties: {
          project_id: projectId,
          export_id: exportId,
          target: exportTarget,
          file_count: bundle.files.length,
          file_size_bytes: bundleBytes.length,
          artifact_count: allArtifacts.length,
        },
      });

      return jsonResponse({
        exportId,
        target: exportTarget,
        downloadUrl: signedUrlData.signedUrl,
        expiresAt,
        fileCount: bundle.files.length,
        fileSizeBytes: bundleBytes.length,
      });
    } catch (genErr) {
      // Mark export as failed
      await admin
        .from('exports')
        .update({ status: 'failed' })
        .eq('id', exportId);

      console.error('Export generation failed:', genErr);
      return errorResponse(
        genErr instanceof Error
          ? genErr.message
          : 'Export generation failed',
        500,
      );
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('export-bundle error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ============================================================
// Bundle Generation — Route to correct generator
// ============================================================

function generateBundle(
  target: ExportTarget,
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportBundle {
  const metadata = {
    projectName: project.name,
    target,
    generatedAt: new Date().toISOString(),
  };

  switch (target) {
    case 'claude_code':
      return { files: generateClaudeCode(project, archetype, artifacts), metadata };
    case 'cursor':
      return { files: generateCursor(project, archetype, artifacts), metadata };
    case 'lovable':
      return { files: generateLovable(project, archetype, artifacts), metadata };
    case 'bolt':
      return { files: generateBolt(project, archetype, artifacts), metadata };
    case 'replit':
      return { files: generateReplit(project, archetype, artifacts), metadata };
    case 'zip_markdown':
      return { files: generateZipMarkdown(project, archetype, artifacts), metadata };
    case 'pdf':
      return { files: generatePdf(project, archetype, artifacts), metadata };
    case 'pitch_deck':
      return { files: generatePitchDeck(project, archetype, artifacts), metadata };
    case 'rfp':
      return { files: generateRfp(project, archetype, artifacts), metadata };
    default:
      return { files: generateZipMarkdown(project, archetype, artifacts), metadata };
  }
}

// ============================================================
// Shared helpers
// ============================================================

function projectHeader(project: ProjectData, archetype: ArchetypeData | null): string {
  const lines = [`# ${project.name}`];
  if (project.tagline) {
    lines.push(`\n> ${project.tagline}`);
  }
  if (archetype) {
    lines.push(`\n**Category:** ${archetype.category}`);
    lines.push(`**Archetype:** ${archetype.name}`);
    if (archetype.description) {
      lines.push(`**Description:** ${archetype.description}`);
    }
  }
  lines.push(`**Phase:** ${project.phase}`);
  lines.push(`**Progress:** ${project.progress_pct}%`);
  return lines.join('\n');
}

function artifactToMarkdown(artifact: ArtifactData): string {
  const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
  const title = artifact.title || label;
  const lines = [`## ${title}`];
  if (artifact.content_markdown) {
    lines.push('', artifact.content_markdown);
  }
  return lines.join('\n');
}

function artifactFileName(artifact: ArtifactData): string {
  const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
  // Convert "Vision Document" to "vision-document.md"
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') + '.md';
}

function allArtifactsConsolidated(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): string {
  const sections = [projectHeader(project, archetype)];

  if (artifacts.length === 0) {
    sections.push(
      '\n---\n\n*No artifacts have been generated yet. Complete the discovery phase and generate artifacts first.*',
    );
  } else {
    for (const artifact of artifacts) {
      sections.push('\n---\n');
      sections.push(artifactToMarkdown(artifact));
    }
  }

  return sections.join('\n');
}

// ============================================================
// Target: claude_code
// Creates CLAUDE.md master context + individual artifact files
// ============================================================

function generateClaudeCode(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const files: ExportFile[] = [];

  // Build CLAUDE.md
  const claudeMdSections = [
    `# CLAUDE.md — ${project.name}`,
    '',
    '> This file was generated by Jetdale. It provides Claude Code with full',
    '> context about this project so it can help you build it effectively.',
    '',
    '## Project Overview',
    '',
    projectHeader(project, archetype),
    '',
    '## How to Use This Context',
    '',
    '- Read this file first for a complete overview of the project.',
    '- Individual planning documents are in the `docs/` directory.',
    '- When writing code, reference the tech stack, scope, and wireframes documents.',
    '- When making architectural decisions, check the decision log and risk register.',
    '- The roadmap defines the phased implementation plan — follow it.',
    '- User personas should guide UX decisions and feature prioritization.',
    '',
    '## Project Documents',
    '',
  ];

  if (artifacts.length > 0) {
    claudeMdSections.push(
      '| Document | File |',
      '|----------|------|',
    );
    for (const artifact of artifacts) {
      const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
      const fileName = artifactFileName(artifact);
      claudeMdSections.push(`| ${label} | \`docs/${fileName}\` |`);
    }
  } else {
    claudeMdSections.push(
      '*No planning documents generated yet.*',
    );
  }

  claudeMdSections.push('');

  // Add a condensed summary of each artifact directly in CLAUDE.md
  if (artifacts.length > 0) {
    claudeMdSections.push('## Document Summaries', '');

    for (const artifact of artifacts) {
      const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
      claudeMdSections.push(`### ${label}`, '');

      if (artifact.content_markdown) {
        // Include first ~500 chars as a summary
        const summary = artifact.content_markdown.substring(0, 500);
        const truncated = summary.length < artifact.content_markdown.length;
        claudeMdSections.push(summary + (truncated ? '\n\n*[See full document in docs/ directory]*' : ''));
      }
      claudeMdSections.push('');
    }
  }

  // Key instructions for Claude Code
  claudeMdSections.push(
    '## Implementation Guidelines',
    '',
    '1. **Start with the MVP scope.** Do not build features listed under "Won\'t Have for V1".',
    '2. **Follow the tech stack recommendations** unless there is a strong reason to deviate.',
    '3. **Reference user personas** when making UX decisions.',
    '4. **Check the risk register** before making major architectural choices.',
    '5. **Track progress against the roadmap** milestones.',
    '6. **Log important decisions** in a DECISIONS.md file as the project evolves.',
    '',
  );

  files.push({
    path: 'CLAUDE.md',
    content: claudeMdSections.join('\n'),
  });

  // Individual artifact files in docs/
  for (const artifact of artifacts) {
    const fileName = artifactFileName(artifact);
    const label = ARTIFACT_LABELS[artifact.type] || artifact.type;

    const content = [
      `# ${artifact.title || label}`,
      '',
      `> Generated by Jetdale for project "${project.name}"`,
      '',
      artifact.content_markdown || '*No content available.*',
      '',
    ].join('\n');

    files.push({ path: `docs/${fileName}`, content });
  }

  return files;
}

// ============================================================
// Target: cursor
// Same as claude_code but adds .cursorrules
// ============================================================

function generateCursor(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  // Start with the same files as Claude Code
  const files = generateClaudeCode(project, archetype, artifacts);

  // Find tech stack artifact for language/framework context
  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  const scope = artifacts.find((a) => a.type === 'scope');

  const cursorRulesSections = [
    `# Cursor Rules — ${project.name}`,
    '',
    '## Project Context',
    '',
    `This is "${project.name}"${project.tagline ? ` — ${project.tagline}` : ''}.`,
    archetype ? `Project category: ${archetype.category}. Archetype: ${archetype.name}.` : '',
    '',
    '## Code Style & Conventions',
    '',
    '- Write clean, readable code with clear variable names.',
    '- Add comments only when the code is not self-explanatory.',
    '- Follow the established patterns in the codebase.',
    '- Prefer small, focused functions over large monolithic ones.',
    '- Handle errors explicitly; do not swallow exceptions silently.',
    '',
    '## Architecture Guidelines',
    '',
    '- Reference the planning documents in the `docs/` directory for full context.',
    '- Follow the tech stack defined in `docs/tech-stack.md` when suggesting dependencies.',
    '- Implement features according to the scope in `docs/scope-requirements.md`.',
    '- Follow the phased approach in `docs/project-roadmap.md`.',
    '',
  ];

  if (techStack?.content_markdown) {
    cursorRulesSections.push(
      '## Tech Stack Reference',
      '',
      techStack.content_markdown.substring(0, 1500),
      '',
    );
  }

  if (scope?.content_markdown) {
    // Extract just the MVP Must-Have section if possible
    const mustHaveMatch = scope.content_markdown.match(
      /###?\s*Must Have[\s\S]*?(?=###?\s|$)/i,
    );
    if (mustHaveMatch) {
      cursorRulesSections.push(
        '## MVP Must-Have Features',
        '',
        mustHaveMatch[0].trim(),
        '',
      );
    }
  }

  cursorRulesSections.push(
    '## Important Constraints',
    '',
    '- Only build features listed in the MVP scope.',
    '- Check the risk register before making significant architectural decisions.',
    '- Design for the user personas described in the planning docs.',
    '- Keep the budget constraints in mind when suggesting paid services.',
    '',
  );

  files.push({
    path: '.cursorrules',
    content: cursorRulesSections.join('\n'),
  });

  return files;
}

// ============================================================
// Target: lovable
// Single mega-prompt markdown optimized for Lovable's format
// ============================================================

function generateLovable(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const sections = [
    `# ${project.name} — Lovable Project Prompt`,
    '',
    '## What to Build',
    '',
    `Build a web application called "${project.name}"${project.tagline ? `: ${project.tagline}` : ''}.`,
    '',
  ];

  if (archetype) {
    sections.push(
      `This is a ${archetype.category} project (${archetype.name}).`,
      archetype.description ? `${archetype.description}` : '',
      '',
    );
  }

  // Vision
  const vision = artifacts.find((a) => a.type === 'vision');
  if (vision?.content_markdown) {
    sections.push(
      '## Vision',
      '',
      vision.content_markdown,
      '',
    );
  }

  // Target users from personas
  const personas = artifacts.find((a) => a.type === 'personas');
  if (personas?.content_markdown) {
    sections.push(
      '## Target Users',
      '',
      personas.content_markdown,
      '',
    );
  }

  // Features from scope
  const scope = artifacts.find((a) => a.type === 'scope');
  if (scope?.content_markdown) {
    sections.push(
      '## Features & Requirements',
      '',
      scope.content_markdown,
      '',
    );
  }

  // Wireframes / UI
  const wireframes = artifacts.find((a) => a.type === 'wireframes');
  if (wireframes?.content_markdown) {
    sections.push(
      '## Pages & UI Components',
      '',
      wireframes.content_markdown,
      '',
    );
  }

  // Tech stack
  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  if (techStack?.content_markdown) {
    sections.push(
      '## Tech Stack Preferences',
      '',
      techStack.content_markdown,
      '',
    );
  }

  // Success metrics
  const metrics = artifacts.find((a) => a.type === 'success_metrics');
  if (metrics?.content_markdown) {
    sections.push(
      '## Success Metrics',
      '',
      metrics.content_markdown,
      '',
    );
  }

  sections.push(
    '## Implementation Notes for Lovable',
    '',
    '- Start by creating the core pages and navigation structure.',
    '- Implement the Must-Have features first before moving to Should-Have.',
    '- Use a clean, modern design system with consistent spacing and typography.',
    '- Make the app responsive for both desktop and mobile.',
    '- Include proper form validation and error states.',
    '- Add loading states for async operations.',
    '- Ensure all interactive elements have proper hover and focus states.',
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-lovable-prompt.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Target: bolt
// Single markdown optimized for Bolt.new
// ============================================================

function generateBolt(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const sections = [
    `# ${project.name} — Bolt.new Project Spec`,
    '',
    '## Project Description',
    '',
    `Create a full-stack web application called "${project.name}"${project.tagline ? `: ${project.tagline}` : ''}.`,
    '',
  ];

  if (archetype) {
    sections.push(
      `Category: ${archetype.category}. Type: ${archetype.name}.`,
      '',
    );
  }

  // Vision
  const vision = artifacts.find((a) => a.type === 'vision');
  if (vision?.content_markdown) {
    sections.push('## Project Vision', '', vision.content_markdown, '');
  }

  // Scope
  const scope = artifacts.find((a) => a.type === 'scope');
  if (scope?.content_markdown) {
    sections.push('## Scope & Features', '', scope.content_markdown, '');
  }

  // Tech stack
  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  if (techStack?.content_markdown) {
    sections.push('## Tech Stack', '', techStack.content_markdown, '');
  }

  // Wireframes
  const wireframes = artifacts.find((a) => a.type === 'wireframes');
  if (wireframes?.content_markdown) {
    sections.push('## UI Screens & Navigation', '', wireframes.content_markdown, '');
  }

  // Personas
  const personas = artifacts.find((a) => a.type === 'personas');
  if (personas?.content_markdown) {
    sections.push('## User Personas', '', personas.content_markdown, '');
  }

  // Roadmap
  const roadmap = artifacts.find((a) => a.type === 'roadmap');
  if (roadmap?.content_markdown) {
    sections.push('## Roadmap', '', roadmap.content_markdown, '');
  }

  sections.push(
    '## Implementation Instructions for Bolt.new',
    '',
    '- Build the project as a single full-stack application.',
    '- Implement all Must-Have MVP features listed in the scope.',
    '- Create a clean folder structure with clear separation of concerns.',
    '- Include database schema setup if the project requires persistent data.',
    '- Add authentication if user accounts are part of the scope.',
    '- Include environment variable setup instructions in a .env.example file.',
    '- Write all code in a production-ready style with proper error handling.',
    '- Add brief inline comments for non-obvious logic.',
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-bolt-spec.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Target: replit
// Single markdown optimized for Replit Agent
// ============================================================

function generateReplit(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const sections = [
    `# ${project.name} — Replit Agent Spec`,
    '',
    '## Overview',
    '',
    `Build "${project.name}"${project.tagline ? ` — ${project.tagline}` : ''}.`,
    '',
  ];

  if (archetype) {
    sections.push(
      `This is a ${archetype.category} project (${archetype.name}).`,
      archetype.description ? archetype.description : '',
      '',
    );
  }

  // Core context: vision + scope + tech stack
  const vision = artifacts.find((a) => a.type === 'vision');
  if (vision?.content_markdown) {
    sections.push('## Vision', '', vision.content_markdown, '');
  }

  const scope = artifacts.find((a) => a.type === 'scope');
  if (scope?.content_markdown) {
    sections.push('## Features & Scope', '', scope.content_markdown, '');
  }

  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  if (techStack?.content_markdown) {
    sections.push('## Recommended Tech Stack', '', techStack.content_markdown, '');
  }

  const wireframes = artifacts.find((a) => a.type === 'wireframes');
  if (wireframes?.content_markdown) {
    sections.push('## UI Design', '', wireframes.content_markdown, '');
  }

  const personas = artifacts.find((a) => a.type === 'personas');
  if (personas?.content_markdown) {
    sections.push('## Target Users', '', personas.content_markdown, '');
  }

  const roadmap = artifacts.find((a) => a.type === 'roadmap');
  if (roadmap?.content_markdown) {
    sections.push('## Development Roadmap', '', roadmap.content_markdown, '');
  }

  const budget = artifacts.find((a) => a.type === 'budget');
  if (budget?.content_markdown) {
    sections.push('## Budget Constraints', '', budget.content_markdown, '');
  }

  sections.push(
    '## Instructions for Replit Agent',
    '',
    '- Set up the project with the recommended tech stack.',
    '- Create a clear file structure following standard conventions for the chosen framework.',
    '- Implement MVP Must-Have features first.',
    '- Include a .replit file configured for the correct run command.',
    '- Set up any required database tables and seed data.',
    '- Add a README.md with setup and run instructions.',
    '- Ensure the app runs correctly in the Replit environment.',
    '- Use environment variables (Replit Secrets) for any API keys or credentials.',
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-replit-spec.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Target: zip_markdown (free tier)
// Plain markdown files for each artifact
// ============================================================

function generateZipMarkdown(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const files: ExportFile[] = [];

  // README / overview file
  const overviewSections = [
    projectHeader(project, archetype),
    '',
    '---',
    '',
    '## Included Documents',
    '',
  ];

  if (artifacts.length > 0) {
    for (const artifact of artifacts) {
      const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
      const fileName = artifactFileName(artifact);
      overviewSections.push(`- [${label}](./${fileName})`);
    }
  } else {
    overviewSections.push('*No artifacts generated yet.*');
  }

  overviewSections.push(
    '',
    '---',
    '',
    `*Generated by Jetdale on ${new Date().toISOString().split('T')[0]}*`,
    '',
  );

  files.push({
    path: 'README.md',
    content: overviewSections.join('\n'),
  });

  // Individual artifact files
  for (const artifact of artifacts) {
    const fileName = artifactFileName(artifact);
    const label = ARTIFACT_LABELS[artifact.type] || artifact.type;

    files.push({
      path: fileName,
      content: [
        `# ${artifact.title || label}`,
        '',
        `> Project: ${project.name}`,
        '',
        artifact.content_markdown || '*No content available.*',
        '',
      ].join('\n'),
    });
  }

  return files;
}

// ============================================================
// Target: pdf
// Well-formatted markdown for client-side PDF conversion
// ============================================================

function generatePdf(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const sections = [
    `<div style="text-align: center; margin-bottom: 2em;">`,
    '',
    `# ${project.name}`,
    '',
    project.tagline ? `### ${project.tagline}` : '',
    '',
    archetype ? `**${archetype.category} | ${archetype.name}**` : '',
    '',
    `*Project Planning Document*`,
    `*Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`,
    '',
    `</div>`,
    '',
    '---',
    '',
    '## Table of Contents',
    '',
  ];

  // Build TOC
  for (let i = 0; i < artifacts.length; i++) {
    const label = ARTIFACT_LABELS[artifacts[i].type] || artifacts[i].type;
    sections.push(`${i + 1}. ${label}`);
  }

  sections.push('', '---', '');

  // Project overview section
  sections.push(
    '## Project Overview',
    '',
    projectHeader(project, archetype),
    '',
    '---',
    '',
  );

  // Each artifact as a section
  for (let i = 0; i < artifacts.length; i++) {
    const artifact = artifacts[i];
    const label = ARTIFACT_LABELS[artifact.type] || artifact.type;

    sections.push(
      `## ${i + 1}. ${artifact.title || label}`,
      '',
      artifact.content_markdown || '*No content available.*',
      '',
    );

    // Page break hint for PDF renderers
    if (i < artifacts.length - 1) {
      sections.push('<div style="page-break-after: always;"></div>', '', '---', '');
    }
  }

  // Footer
  sections.push(
    '',
    '---',
    '',
    `<div style="text-align: center; color: #888; font-size: 0.9em;">`,
    `Generated by Jetdale | ${new Date().toISOString().split('T')[0]}`,
    `</div>`,
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-project-plan.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Target: pitch_deck
// 10-slide outline in markdown/HTML
// ============================================================

function generatePitchDeck(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const vision = artifacts.find((a) => a.type === 'vision');
  const scope = artifacts.find((a) => a.type === 'scope');
  const personas = artifacts.find((a) => a.type === 'personas');
  const roadmap = artifacts.find((a) => a.type === 'roadmap');
  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  const budget = artifacts.find((a) => a.type === 'budget');
  const metrics = artifacts.find((a) => a.type === 'success_metrics');
  const risks = artifacts.find((a) => a.type === 'risk_register');
  const pitchArtifact = artifacts.find((a) => a.type === 'pitch_deck');

  // If a pitch_deck artifact already exists, use it as the primary content
  if (pitchArtifact?.content_markdown) {
    return [
      {
        path: `${slugify(project.name)}-pitch-deck.md`,
        content: [
          `# ${project.name} — Pitch Deck`,
          '',
          pitchArtifact.content_markdown,
          '',
          '---',
          '',
          `*Generated by Jetdale on ${new Date().toISOString().split('T')[0]}*`,
          '',
        ].join('\n'),
      },
    ];
  }

  // Otherwise build a 10-slide outline from the available artifacts
  const sections = [
    `# ${project.name} — Pitch Deck`,
    '',
    '---',
    '',
  ];

  // Slide 1: Title
  sections.push(
    '## Slide 1: Title',
    '',
    `### ${project.name}`,
    '',
    project.tagline ? `**${project.tagline}**` : '',
    '',
    archetype ? `*${archetype.category} | ${archetype.name}*` : '',
    '',
    '**Speaker Notes:** Introduce the project name and tagline. Set the stage for the problem you are solving.',
    '',
    '---',
    '',
  );

  // Slide 2: Problem
  sections.push(
    '## Slide 2: The Problem',
    '',
  );
  if (vision?.content_markdown) {
    const problemMatch = vision.content_markdown.match(
      /##?\s*Problem[\s\S]*?(?=##?\s|$)/i,
    );
    if (problemMatch) {
      sections.push(problemMatch[0].trim());
    } else {
      sections.push(extractFirstParagraphs(vision.content_markdown, 2));
    }
  } else {
    sections.push('*Define the core problem your project solves.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Clearly articulate the pain point. Make the audience feel the problem.',
    '',
    '---',
    '',
  );

  // Slide 3: Solution
  sections.push(
    '## Slide 3: The Solution',
    '',
  );
  if (vision?.content_markdown) {
    const solutionMatch = vision.content_markdown.match(
      /##?\s*Vision Statement[\s\S]*?(?=##?\s|$)/i,
    );
    if (solutionMatch) {
      sections.push(solutionMatch[0].trim());
    } else {
      sections.push(`${project.name}${project.tagline ? ` — ${project.tagline}` : ''}`);
    }
  } else {
    sections.push(`${project.name} solves this by providing a comprehensive solution.`);
  }
  sections.push(
    '',
    '**Speaker Notes:** Present your solution as the answer to the problem from the previous slide.',
    '',
    '---',
    '',
  );

  // Slide 4: Target Market
  sections.push(
    '## Slide 4: Target Market',
    '',
  );
  if (personas?.content_markdown) {
    sections.push(extractFirstParagraphs(personas.content_markdown, 4));
  } else if (vision?.content_markdown) {
    const usersMatch = vision.content_markdown.match(
      /##?\s*Target Users[\s\S]*?(?=##?\s|$)/i,
    );
    if (usersMatch) {
      sections.push(usersMatch[0].trim());
    } else {
      sections.push('*Define your target market segments.*');
    }
  } else {
    sections.push('*Define your target market segments and their size.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Describe who your users are and how large the market opportunity is.',
    '',
    '---',
    '',
  );

  // Slide 5: Key Features
  sections.push(
    '## Slide 5: Key Features',
    '',
  );
  if (scope?.content_markdown) {
    const mustHave = scope.content_markdown.match(
      /###?\s*Must Have[\s\S]*?(?=###?\s|$)/i,
    );
    sections.push(mustHave ? mustHave[0].trim() : extractFirstParagraphs(scope.content_markdown, 3));
  } else {
    sections.push('*List your 3-5 most important features.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Highlight the features that differentiate your product. Focus on value, not technical details.',
    '',
    '---',
    '',
  );

  // Slide 6: Technology
  sections.push(
    '## Slide 6: How It Works',
    '',
  );
  if (techStack?.content_markdown) {
    sections.push(extractFirstParagraphs(techStack.content_markdown, 3));
  } else {
    sections.push('*Briefly explain the technology powering your solution.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Keep this high-level. Explain just enough to build confidence in your technical approach.',
    '',
    '---',
    '',
  );

  // Slide 7: Roadmap
  sections.push(
    '## Slide 7: Roadmap & Milestones',
    '',
  );
  if (roadmap?.content_markdown) {
    sections.push(extractFirstParagraphs(roadmap.content_markdown, 4));
  } else {
    sections.push('*Outline your phased development plan and key milestones.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Show you have a realistic plan. Highlight what is already done and what is next.',
    '',
    '---',
    '',
  );

  // Slide 8: Risks & Mitigation
  sections.push(
    '## Slide 8: Risks & Mitigation',
    '',
  );
  if (risks?.content_markdown) {
    sections.push(extractFirstParagraphs(risks.content_markdown, 3));
  } else {
    sections.push('*Acknowledge key risks and show your mitigation strategies.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Showing awareness of risks builds credibility. Focus on the top 3 risks and your plan.',
    '',
    '---',
    '',
  );

  // Slide 9: Budget & Metrics
  sections.push(
    '## Slide 9: Budget & Success Metrics',
    '',
  );
  if (budget?.content_markdown) {
    const summaryMatch = budget.content_markdown.match(
      /##?\s*Budget Summary[\s\S]*?(?=##?\s|$)/i,
    );
    sections.push(summaryMatch ? summaryMatch[0].trim() : extractFirstParagraphs(budget.content_markdown, 2));
  }
  if (metrics?.content_markdown) {
    sections.push('', extractFirstParagraphs(metrics.content_markdown, 3));
  }
  if (!budget?.content_markdown && !metrics?.content_markdown) {
    sections.push('*Present your budget requirements and the KPIs you will track.*');
  }
  sections.push(
    '',
    '**Speaker Notes:** Show the financial picture and how you define success.',
    '',
    '---',
    '',
  );

  // Slide 10: Call to Action
  sections.push(
    '## Slide 10: Call to Action',
    '',
    `### ${project.name}`,
    '',
    project.tagline ? `> ${project.tagline}` : '',
    '',
    '**What We Need:**',
    '- Funding / Resources / Partnerships',
    '- Feedback and early adopters',
    '- Technical advisors and collaborators',
    '',
    '**Speaker Notes:** End with a clear, specific ask. Tell the audience exactly what you need from them and what the next step is.',
    '',
  );

  sections.push(
    '---',
    '',
    `*Generated by Jetdale on ${new Date().toISOString().split('T')[0]}*`,
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-pitch-deck.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Target: rfp
// Formal Request for Proposal document template
// ============================================================

function generateRfp(
  project: ProjectData,
  archetype: ArchetypeData | null,
  artifacts: ArtifactData[],
): ExportFile[] {
  const vision = artifacts.find((a) => a.type === 'vision');
  const scope = artifacts.find((a) => a.type === 'scope');
  const personas = artifacts.find((a) => a.type === 'personas');
  const roadmap = artifacts.find((a) => a.type === 'roadmap');
  const techStack = artifacts.find((a) => a.type === 'tech_stack');
  const budget = artifacts.find((a) => a.type === 'budget');
  const metrics = artifacts.find((a) => a.type === 'success_metrics');
  const risks = artifacts.find((a) => a.type === 'risk_register');
  const wireframes = artifacts.find((a) => a.type === 'wireframes');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sections = [
    `<div style="text-align: center; margin-bottom: 3em;">`,
    '',
    `# Request for Proposal (RFP)`,
    '',
    `## ${project.name}`,
    '',
    project.tagline ? `### ${project.tagline}` : '',
    '',
    `**Issue Date:** ${today}`,
    `**Proposal Deadline:** [INSERT DATE]`,
    `**Contact:** [INSERT CONTACT NAME AND EMAIL]`,
    '',
    `</div>`,
    '',
    '---',
    '',

    // Section 1: Introduction
    '## 1. Introduction & Background',
    '',
    `This Request for Proposal (RFP) is issued for the design, development, and deployment of "${project.name}"${project.tagline ? `, ${project.tagline}` : ''}.`,
    '',
  ];

  if (archetype) {
    sections.push(
      `**Project Category:** ${archetype.category}`,
      `**Project Type:** ${archetype.name}`,
      archetype.description ? `\n${archetype.description}` : '',
      '',
    );
  }

  if (vision?.content_markdown) {
    sections.push(vision.content_markdown, '');
  }

  sections.push('---', '');

  // Section 2: Scope of Work
  sections.push(
    '## 2. Scope of Work',
    '',
    'The selected vendor will be responsible for the full development lifecycle of this project, including design, development, testing, deployment, and handoff.',
    '',
  );
  if (scope?.content_markdown) {
    sections.push(scope.content_markdown, '');
  } else {
    sections.push('*[Detailed scope to be inserted]*', '');
  }
  sections.push('---', '');

  // Section 3: Target Users
  sections.push(
    '## 3. Target Users & Personas',
    '',
  );
  if (personas?.content_markdown) {
    sections.push(personas.content_markdown, '');
  } else {
    sections.push('*[User persona details to be inserted]*', '');
  }
  sections.push('---', '');

  // Section 4: Technical Requirements
  sections.push(
    '## 4. Technical Requirements',
    '',
  );
  if (techStack?.content_markdown) {
    sections.push(
      'The following tech stack is recommended but open to vendor proposals with justification:',
      '',
      techStack.content_markdown,
      '',
    );
  } else {
    sections.push(
      'Vendors should propose their recommended technology stack with justification.',
      '',
    );
  }

  if (wireframes?.content_markdown) {
    sections.push(
      '### UI/UX Requirements',
      '',
      wireframes.content_markdown,
      '',
    );
  }

  sections.push('---', '');

  // Section 5: Project Timeline
  sections.push(
    '## 5. Project Timeline & Milestones',
    '',
  );
  if (roadmap?.content_markdown) {
    sections.push(roadmap.content_markdown, '');
  } else {
    sections.push(
      'Vendors should propose a phased delivery timeline with clear milestones.',
      '',
    );
  }
  sections.push('---', '');

  // Section 6: Budget
  sections.push(
    '## 6. Budget & Pricing',
    '',
  );
  if (budget?.content_markdown) {
    sections.push(
      'The following budget framework has been established:',
      '',
      budget.content_markdown,
      '',
      'Vendors should provide a detailed cost breakdown aligned with the project phases.',
      '',
    );
  } else {
    sections.push(
      'Vendors should provide a detailed cost breakdown including:',
      '',
      '- Development costs (fixed or time-and-materials)',
      '- Infrastructure and hosting costs',
      '- Third-party service costs',
      '- Ongoing maintenance and support costs',
      '- Any additional costs or assumptions',
      '',
    );
  }
  sections.push('---', '');

  // Section 7: Success Criteria
  sections.push(
    '## 7. Success Criteria & Acceptance',
    '',
  );
  if (metrics?.content_markdown) {
    sections.push(metrics.content_markdown, '');
  } else {
    sections.push('*[Success criteria and acceptance testing requirements to be defined]*', '');
  }
  sections.push('---', '');

  // Section 8: Risk Considerations
  sections.push(
    '## 8. Risk Considerations',
    '',
    'Vendors should address the following identified risks in their proposals:',
    '',
  );
  if (risks?.content_markdown) {
    sections.push(risks.content_markdown, '');
  } else {
    sections.push('*[Risk register to be provided]*', '');
  }
  sections.push('---', '');

  // Section 9: Proposal Requirements
  sections.push(
    '## 9. Proposal Submission Requirements',
    '',
    'Proposals must include the following:',
    '',
    '1. **Company Overview:** Brief description of your company, relevant experience, and team members who will work on this project.',
    '2. **Technical Approach:** Detailed description of your proposed architecture, technology choices, and development methodology.',
    '3. **Project Plan:** Phased delivery timeline with milestones, deliverables, and dependencies.',
    '4. **Team Structure:** Roles and responsibilities of each team member, including availability.',
    '5. **Cost Proposal:** Detailed pricing breakdown by phase and deliverable.',
    '6. **Portfolio:** 2-3 examples of similar projects completed, with references.',
    '7. **Risk Mitigation:** Your approach to addressing the risks identified in Section 8.',
    '8. **Support & Maintenance:** Post-launch support plan and SLA terms.',
    '9. **Assumptions & Constraints:** Any assumptions made in preparing the proposal.',
    '',
    '---',
    '',

    // Section 10: Evaluation Criteria
    '## 10. Evaluation Criteria',
    '',
    'Proposals will be evaluated on the following criteria:',
    '',
    '| Criteria | Weight |',
    '|----------|--------|',
    '| Technical Approach & Architecture | 25% |',
    '| Relevant Experience & Portfolio | 20% |',
    '| Project Timeline & Feasibility | 15% |',
    '| Cost & Value | 20% |',
    '| Team Qualifications | 10% |',
    '| Communication & Process | 10% |',
    '',
    '---',
    '',

    // Section 11: Terms
    '## 11. Terms & Conditions',
    '',
    '- All proposals become the property of the issuing organization.',
    '- The issuing organization reserves the right to reject any or all proposals.',
    '- Vendors may be asked to present their proposals or clarify details.',
    '- Final contract terms will be negotiated with the selected vendor.',
    '- All intellectual property developed under this contract will be owned by the client.',
    '- A mutual NDA will be required before sharing proprietary information.',
    '',
    '---',
    '',
    `<div style="text-align: center; color: #888;">`,
    `Generated by Jetdale on ${new Date().toISOString().split('T')[0]}`,
    `</div>`,
    '',
  );

  return [
    {
      path: `${slugify(project.name)}-rfp.md`,
      content: sections.join('\n'),
    },
  ];
}

// ============================================================
// Utility functions
// ============================================================

/**
 * Convert a project name to a URL/file-safe slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

/**
 * Extract the first N non-empty paragraphs from markdown content.
 * Useful for building summaries from full artifact content.
 */
function extractFirstParagraphs(markdown: string, count: number): string {
  const paragraphs = markdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return paragraphs.slice(0, count).join('\n\n');
}
