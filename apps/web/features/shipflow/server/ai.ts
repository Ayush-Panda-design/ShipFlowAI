import { generateText } from "ai";

import { getReviewModel, getReviewMaxOutputTokens } from "@/features/ai-sdk";

const PRD_SYSTEM = `You are a senior product manager. Generate a structured PRD from a feature request.
Respond ONLY with valid JSON matching this shape:
{
  "problemStatement": string,
  "goals": string,
  "nonGoals": string,
  "userStories": string (markdown list),
  "acceptanceCriteria": string (markdown checklist),
  "edgeCases": string,
  "successMetrics": string,
  "rawMarkdown": string (full PRD in markdown)
}`;

export async function generatePrdFromRequest(title: string, description: string, clarifications: string) {
  const model = getReviewModel();

  const { text } = await generateText({
    model,
    maxOutputTokens: getReviewMaxOutputTokens(),
    system: PRD_SYSTEM,
    prompt: `Feature: ${title}\n\nDescription:\n${description}\n\nClarifications:\n${clarifications || "None"}`,
  });

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("PRD model did not return JSON");
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
    problemStatement: string;
    goals: string;
    nonGoals: string;
    userStories: string;
    acceptanceCriteria: string;
    edgeCases: string;
    successMetrics: string;
    rawMarkdown: string;
  };
}

const TASKS_SYSTEM = `You are an engineering lead. Break a PRD into actionable engineering tasks.
Respond ONLY with a JSON array: [{ "title": string, "description": string, "priority": "low"|"medium"|"high" }]`;

export async function generateTasksFromPrd(prdMarkdown: string) {
  const model = getReviewModel();

  const { text } = await generateText({
    model,
    maxOutputTokens: getReviewMaxOutputTokens(),
    system: TASKS_SYSTEM,
    prompt: prdMarkdown,
  });

  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Task model did not return JSON array");
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Array<{
    title: string;
    description: string;
    priority: string;
  }>;
}

const CLARIFY_SYSTEM = `You are a product discovery agent. Given a feature request, ask 2-3 concise follow-up questions if context is missing. If the request is clear enough, respond that no clarification is needed and explain why.

When similar existing features are listed in the prompt, explicitly educate the user: name the existing feature(s), explain overlap, and recommend extending or reusing them instead of duplicating work.`;

export async function generateClarificationQuestions(
  title: string,
  description: string,
  similarFeaturesContext = "",
) {
  const model = getReviewModel();

  const { text } = await generateText({
    model,
    maxOutputTokens: 1024,
    system: CLARIFY_SYSTEM,
    prompt: [
      similarFeaturesContext,
      `Title: ${title}`,
      "",
      `Description:`,
      description,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return text.trim();
}
