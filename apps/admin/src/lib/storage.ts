// ============================================================
// Jetdale — Client-side Project Storage (localStorage)
// All project data persisted locally until auth is re-enabled.
// ============================================================

import type { ArtifactType, ArtifactStatus, ProjectPhase, ChatMessage } from '@jetdale/shared';

export interface ArtifactData {
  type: ArtifactType;
  status: ArtifactStatus;
  contentMarkdown: string;
  generatedAt: string;
  version: number;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

export interface JetdaleProject {
  id: string;
  userId?: string;
  name: string;
  createdAt: string;
  archetypeName: string;
  discoveryAnswers: Record<string, string>;
  phase: ProjectPhase;
  artifacts: Record<string, ArtifactData>;
  chatMessages: ChatMessage[];
  milestones?: Milestone[];
}

const STORAGE_KEY = 'jetdale_projects';

export function getProjects(): JetdaleProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getProjectsForUser(userId: string): JetdaleProject[] {
  return getProjects().filter((p) => p.userId === userId);
}

export function getProject(id: string): JetdaleProject | null {
  return getProjects().find((p) => p.id === id) || null;
}

export function getProjectForUser(id: string, userId: string): JetdaleProject | null {
  const project = getProject(id);
  if (!project || project.userId !== userId) return null;
  return project;
}

export function saveProject(project: JetdaleProject): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  if (typeof window === 'undefined') return;
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function updateProjectArtifact(
  projectId: string,
  type: string,
  data: Partial<ArtifactData>,
): void {
  const project = getProject(projectId);
  if (!project) return;
  const existing = project.artifacts[type] || {
    type: type as ArtifactType,
    status: 'generating' as ArtifactStatus,
    contentMarkdown: '',
    generatedAt: '',
    version: 1,
  };
  project.artifacts[type] = { ...existing, ...data };
  saveProject(project);
}

export function updateProjectPhase(projectId: string, phase: ProjectPhase): void {
  const project = getProject(projectId);
  if (!project) return;
  project.phase = phase;
  saveProject(project);
}

export function addChatMessage(projectId: string, msg: ChatMessage): void {
  const project = getProject(projectId);
  if (!project) return;
  project.chatMessages.push(msg);
  saveProject(project);
}

export function updateProjectMilestones(projectId: string, milestones: Milestone[]): void {
  const project = getProject(projectId);
  if (!project) return;
  project.milestones = milestones;
  saveProject(project);
}

// Map discovery answers from Record<string, string> to prompt format
const QUESTION_TITLES: Record<string, string> = {
  spark: 'In one sentence, what are you building?',
  audience: 'Who is this for?',
  problem: 'What problem does it solve?',
  competition: 'What similar products or solutions exist?',
  differentiator: "What's the ONE thing that makes yours different?",
  platform: 'What platform(s) will this run on?',
  monetization: 'How will you make money?',
  budget: "What's your budget range?",
  timeline: 'When do you need this ready?',
  technical: "What's your technical background?",
  team: "Who's building this?",
  concern: "What's your biggest concern about this project?",
};

export function answersToPromptFormat(
  answers: Record<string, string>,
): Array<{ questionText: string; answerText: string }> {
  return Object.entries(answers)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      questionText: QUESTION_TITLES[key] || key,
      answerText: value,
    }));
}
