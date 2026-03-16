import { mockAgents } from './agents';

export interface BuilderResponse {
  definition: string;
  explanation: string;
}

const INVOICE_AGENT_MD = mockAgents.find((a) => a.name === 'Overdue Invoice Reminder')!.definition_md;
const CASE_TRIAGE_MD = mockAgents.find((a) => a.name === 'Case Triage Bot')!.definition_md;
const REPORT_AGENT_MD = mockAgents.find((a) => a.name === 'Weekly Sales Report')!.definition_md;
const CONTRACT_AGENT_MD = mockAgents.find((a) => a.name === 'Contract Expiry Alert')!.definition_md;

function buildGenericMd(description: string): string {
  const agentName = description.length > 60
    ? description.slice(0, 57) + '...'
    : description;

  return `# Agent: ${agentName}

## Metadata
- **Version:** 1
- **Author:** kevin@sanguinebio.com
- **Created:** ${new Date().toISOString()}
- **Status:** draft

## Description
${description}

## Persona
Professional and efficient. Provide clear, actionable output with relevant
context. Use structured formatting for readability.

## Instructions
Execute the task described above following best practices for automation.

### Steps
1. Gather required data from connected systems
2. Process and analyze the information
3. Take the appropriate actions based on the analysis
4. Report results to the relevant stakeholders

### Decision Logic
- **If** no data is found: Report "No matching records" and exit gracefully
- **If** an error occurs: Log the error and notify the configured channel
- **Default:** Process normally and deliver results

## Tools
- **salesforce_query**: Query CRM data via SOQL
- **slack_notify**: Send notifications to Slack channels

## Schedule
- **Type:** cron
- **Expression:** 0 9 * * 1-5
- **Timezone:** America/New_York

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (auto-configured) | | | |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| result | string | Task execution result |
| status | string | Success or failure status |

## Constraints
- Max LLM calls: 10
- Max execution time: 120
- Max tokens per call: 2048
- Retry on failure: yes
- Max retries: 2

## Tags
automation, custom`;
}

function matchPromptToDefinition(prompt: string): BuilderResponse {
  const lower = prompt.toLowerCase();

  if (lower.includes('invoice') || lower.includes('overdue') || lower.includes('payment')) {
    return {
      definition: INVOICE_AGENT_MD,
      explanation:
        "I've created an **Overdue Invoice Reminder** agent that queries Salesforce daily for past-due invoices, groups them by age, and sends a formatted summary to your #finance Slack channel. Urgent items (90+ days) are flagged automatically.\n\nYou can review and customize the definition on the right.",
    };
  }

  if (lower.includes('case') || lower.includes('triage') || lower.includes('ticket') || lower.includes('support')) {
    return {
      definition: CASE_TRIAGE_MD,
      explanation:
        "I've created a **Case Triage Bot** that automatically analyzes new Salesforce Cases, assigns priority and category based on content analysis, and routes them to the right team queue. Critical cases trigger an immediate Slack alert.\n\nYou can review and customize the definition on the right.",
    };
  }

  if (lower.includes('report') || lower.includes('sales') || lower.includes('performance') || lower.includes('weekly')) {
    return {
      definition: REPORT_AGENT_MD,
      explanation:
        "I've created a **Weekly Sales Report** agent that pulls pipeline data from Salesforce and targets from Google Sheets, compares performance against goals, and distributes a formatted report via email and Slack every Friday at 5 PM.\n\nYou can review and customize the definition on the right.",
    };
  }

  if (lower.includes('contract') || lower.includes('expir') || lower.includes('renew')) {
    return {
      definition: CONTRACT_AGENT_MD,
      explanation:
        "I've created a **Contract Expiry Alert** agent that monitors contracts expiring within 30, 60, and 90 days, sends personalized emails to account managers, and posts a weekly summary to #renewals.\n\nYou can review and customize the definition on the right.",
    };
  }

  // Generic fallback
  return {
    definition: buildGenericMd(prompt),
    explanation:
      `I've created a custom agent based on your description. The definition includes a basic structure with Salesforce integration and Slack notifications.\n\nFeel free to customize the tools, schedule, and instructions on the right to match your exact requirements.`,
  };
}

function generateFollowUpResponse(prompt: string, currentDefinition: string): BuilderResponse {
  const lower = prompt.toLowerCase();
  let updated = currentDefinition;

  if (lower.includes('email') || lower.includes('notification') || lower.includes('notify')) {
    if (!updated.includes('email_send')) {
      updated = updated.replace(
        /## Tools\n([\s\S]*?)(?=\n## )/,
        (_match, toolsBlock) =>
          `## Tools\n${toolsBlock.trimEnd()}\n- **email_send**: Send email notifications to specified recipients\n\n`,
      );
    }
  }

  if (lower.includes('sheet') || lower.includes('spreadsheet') || lower.includes('google')) {
    if (!updated.includes('google_sheets_read')) {
      updated = updated.replace(
        /## Tools\n([\s\S]*?)(?=\n## )/,
        (_match, toolsBlock) =>
          `## Tools\n${toolsBlock.trimEnd()}\n- **google_sheets_read**: Read data from Google Sheets spreadsheets\n\n`,
      );
    }
  }

  if (lower.includes('schedule') || lower.includes('daily') || lower.includes('hourly') || lower.includes('weekly')) {
    if (lower.includes('hourly') || lower.includes('every hour')) {
      updated = updated.replace(
        /## Schedule\n[\s\S]*?(?=\n## )/,
        `## Schedule\n- **Type:** cron\n- **Expression:** 0 * * * *\n- **Timezone:** America/New_York\n`,
      );
    } else if (lower.includes('daily')) {
      updated = updated.replace(
        /## Schedule\n[\s\S]*?(?=\n## )/,
        `## Schedule\n- **Type:** cron\n- **Expression:** 0 9 * * 1-5\n- **Timezone:** America/New_York\n`,
      );
    }
  }

  if (lower.includes('constraint') || lower.includes('limit') || lower.includes('max')) {
    updated = updated.replace(
      /## Constraints\n[\s\S]*?(?=\n## |$)/,
      `## Constraints\n- Max LLM calls: 5\n- Max execution time: 60\n- Max tokens per call: 1024\n- Retry on failure: yes\n- Max retries: 3\n`,
    );
  }

  const hasChanges = updated !== currentDefinition;

  return {
    definition: updated,
    explanation: hasChanges
      ? "I've updated the agent definition based on your feedback. The changes are reflected in the editor on the right."
      : "I understand your request. I've reviewed the current definition and it looks good as-is for that use case. Feel free to make manual edits in the editor if you'd like to fine-tune anything specific.",
  };
}

export function mockBuilderGenerate(
  prompt: string,
  currentDefinition: string | null,
): Promise<BuilderResponse> {
  const delay = 1500 + Math.random() * 1500; // 1.5-3s

  return new Promise((resolve) => {
    setTimeout(() => {
      if (currentDefinition) {
        resolve(generateFollowUpResponse(prompt, currentDefinition));
      } else {
        resolve(matchPromptToDefinition(prompt));
      }
    }, delay);
  });
}
