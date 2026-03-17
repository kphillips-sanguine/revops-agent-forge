import type { Agent } from '../types/agent';

export const mockAgents: Agent[] = [
  {
    id: 'ag_01HQ3K5X7Y',
    name: 'Overdue Invoice Reminder',
    version: 3,
    status: 'active',
    definition_md: `# Agent: Overdue Invoice Reminder

## Metadata
- **ID:** 550e8400-e29b-41d4-a716-446655440001
- **Version:** 3
- **Author:** kevin@sanguinebio.com
- **Created:** 2025-11-15T10:00:00Z
- **Status:** active

## Description
Checks Salesforce daily for invoices past their due date and sends a summary
to the #finance Slack channel. Helps the finance team stay on top of collections
without manually running reports.

## Persona
Professional and concise. Use bullet points for clarity. Include invoice
numbers and amounts for easy reference. Flag anything over 90 days as urgent.

## Instructions
Query Salesforce for all open invoices where the due date has passed.
Group them by age buckets and format a clear summary for the finance team.

### Steps
1. Query Salesforce for all Invoice__c records where Status__c = 'Open'
   and Due_Date__c < TODAY
2. Group results into buckets: 1-30 days, 31-60 days, 61-90 days, 90+ days
3. Calculate total outstanding amount per bucket
4. Format a Slack message with the summary
5. If any invoices are 90+ days overdue, prefix the message with ":rotating_light: URGENT"
6. Send the summary to the #finance Slack channel

### Decision Logic
- **If** no overdue invoices found: Send "All clear — no overdue invoices today! :white_check_mark:"
- **If** total overdue > $100,000: Also send a DM to the CFO
- **Default:** Send standard summary to #finance

## Tools
- **salesforce_query**: Query Invoice__c records with SOQL
- **slack_notify**: Send formatted messages to Slack channels

## Schedule
- **Type:** cron
- **Expression:** 0 8 * * 1-5
- **Timezone:** America/Denver

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none — this agent is self-contained) | | | |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| summary | string | Formatted overdue invoice summary |
| total_overdue | number | Total dollar amount overdue |
| invoice_count | integer | Number of overdue invoices |
| urgent | boolean | True if any invoice is 90+ days overdue |

## Constraints
- Max LLM calls: 10
- Max execution time: 120
- Max tokens per call: 2048
- Retry on failure: yes
- Max retries: 2

## Tags
finance, salesforce, daily, notifications, invoices`,
    guardrails_md: 'Do not send more than 50 notifications per run. Skip invoices under $100.',
    tools_allowed: ['hubspot_query', 'slack_notify'],
    model_id: 'claude-sonnet',
    schedule: { type: 'cron', value: '0 9 * * *', timezone: 'America/New_York', enabled: true },
    tags: ['finance', 'automation', 'notifications'],
    created_by: 'kevin@sanguinebio.com',
    approved_by: 'admin@sanguinebio.com',
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2026-02-20T14:30:00Z',
    last_execution_at: '2026-03-16T09:00:00Z',
    execution_count: 87,
    estimated_cost: 0.12,
  },
  {
    id: 'ag_02JR4L6Y8Z',
    name: 'Case Triage Bot',
    version: 2,
    status: 'active',
    definition_md: `# Agent: Case Triage Bot

## Metadata
- **ID:** 550e8400-e29b-41d4-a716-446655440002
- **Version:** 2
- **Author:** kevin@sanguinebio.com
- **Created:** 2025-12-01T08:00:00Z
- **Status:** active

## Description
Automatically triages new Salesforce Cases by analyzing the subject and
description, assigning priority, suggesting a category, and routing to
the appropriate queue. Runs on every new case creation via webhook.

## Persona
Analytical and precise. When providing triage reasoning, be specific about
which keywords or patterns led to the classification. Never guess — if
uncertain about priority, default to Medium and flag for human review.

## Instructions
Receive a new Case payload, analyze its content, classify it, and update
the Case record in Salesforce with triage results.

### Steps
1. Receive the new Case data (Id, Subject, Description, Contact info)
2. Analyze the Subject and Description for urgency indicators:
   - Keywords: "down", "outage", "urgent", "ASAP", "broken", "error", "crash"
   - Sentiment: negative/frustrated language
   - Business impact: mentions of revenue, customers, deadlines
3. Classify Priority: Critical / High / Medium / Low
4. Classify Category: Bug, Feature Request, Question, Access Request, Data Issue
5. Determine routing queue based on category:
   - Bug → Engineering Support
   - Feature Request → Product Team
   - Question → Tier 1 Support
   - Access Request → IT Admin
   - Data Issue → Data Operations
6. Update the Case in Salesforce with:
   - Priority (if not already set by submitter)
   - Case_Category__c
   - Triage_Notes__c (reasoning for classification)
   - OwnerId (route to queue)
7. If Priority = Critical, also send a Slack alert to #critical-cases

### Decision Logic
- **If** Subject contains "outage" or "down" AND Description mentions production: Priority = Critical
- **If** Contact is a VIP account (check Account.VIP__c): Bump priority by one level
- **If** Description is empty or too vague to classify: Set Priority = Medium, add Triage_Notes = "Needs manual review — insufficient detail"
- **Default:** Use LLM analysis for classification

## Tools
- **salesforce_query**: Look up Case details, Contact info, Account VIP status
- **sf_record_update**: Update Case fields (Priority, Category, Notes, Owner)
- **slack_notify**: Alert #critical-cases for Critical priority

## Schedule
- **Type:** webhook
- **Webhook Path:** /trigger/case-triage
- **Event Source:** Salesforce Platform Event (New_Case__e)

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| case_id | string | yes | Salesforce Case record ID |
| subject | string | yes | Case subject line |
| description | string | no | Case description body |
| contact_id | string | no | Contact who submitted the case |
| account_id | string | no | Associated Account ID |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| priority | string | Assigned priority (Critical/High/Medium/Low) |
| category | string | Assigned category |
| queue | string | Routing destination |
| triage_notes | string | Reasoning for the classification |
| needs_review | boolean | True if manual review is recommended |

## Constraints
- Max LLM calls: 5
- Max execution time: 60
- Max tokens per call: 2048
- Retry on failure: yes
- Max retries: 1

## Tags
salesforce, cases, triage, automation, webhook, support`,
    guardrails_md: 'Never auto-close cases. P1 cases must always generate a Slack alert.',
    tools_allowed: ['salesforce_query', 'sf_record_update', 'slack_notify'],
    model_id: 'gemini-pro',
    schedule: { type: 'interval', value: '15m', enabled: true },
    tags: ['support', 'triage', 'salesforce'],
    created_by: 'kevin@sanguinebio.com',
    approved_by: 'admin@sanguinebio.com',
    created_at: '2025-12-01T08:00:00Z',
    updated_at: '2026-01-15T16:45:00Z',
    last_execution_at: '2026-03-16T08:45:00Z',
    execution_count: 1420,
    estimated_cost: 0.08,
  },
  {
    id: 'ag_03KS5M7Z9A',
    name: 'Weekly Sales Report',
    version: 1,
    status: 'pending_review',
    definition_md: `# Agent: Weekly Sales Report

## Metadata
- **ID:** 550e8400-e29b-41d4-a716-446655440003
- **Version:** 1
- **Author:** sarah@sanguinebio.com
- **Created:** 2026-03-10T11:00:00Z
- **Status:** pending_review

## Description
Generates a comprehensive weekly sales performance report by pulling data
from Salesforce and Google Sheets, then distributes via email and Slack.
Provides leadership with pipeline visibility without manual report building.

## Persona
Data-driven and thorough. Present numbers clearly with context — compare
to previous week and targets. Use tables and bullet points for readability.
Highlight wins and flag concerns diplomatically.

## Instructions
Compile sales metrics for the current week, compare against targets,
and distribute a formatted report to stakeholders.

### Steps
1. Query Salesforce for all Opportunities closed this week (Closed Won + Closed Lost)
2. Query Salesforce for pipeline changes (new opps, stage changes, amount changes)
3. Read target numbers from the Sales Targets Google Sheet
4. Calculate key metrics:
   - Total Closed Won revenue
   - Win rate (Closed Won / Total Closed)
   - Average deal size
   - Pipeline created this week
   - Pipeline coverage ratio
5. Compare metrics against weekly targets from Google Sheet
6. Format report with sections: Executive Summary, Wins, Losses, Pipeline Changes, Forecast
7. Email full report to sales-leadership@sanguinebio.com
8. Post executive summary to #sales-updates Slack channel

### Decision Logic
- **If** weekly revenue exceeds target by >20%: Add celebration emoji and highlight top deals
- **If** weekly revenue is below target by >20%: Flag as "Needs Attention" with contributing factors
- **If** pipeline coverage < 3x: Add warning about insufficient pipeline
- **Default:** Standard report format

## Tools
- **salesforce_query**: Pull opportunity and pipeline data via SOQL
- **email_send**: Send formatted HTML report to leadership distribution list
- **slack_notify**: Post summary to #sales-updates channel
- **google_sheets_read**: Read weekly/monthly targets from Sales Targets spreadsheet

## Schedule
- **Type:** cron
- **Expression:** 0 17 * * 5
- **Timezone:** America/New_York

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| week_start | date | no | Override start of reporting week (default: last Monday) |
| include_forecast | boolean | no | Include next-week forecast section (default: true) |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| report_html | string | Full HTML formatted report |
| summary | string | Executive summary text |
| total_closed_won | number | Total revenue closed this week |
| win_rate | number | Win rate percentage |
| pipeline_created | number | New pipeline dollar amount |

## Constraints
- Max LLM calls: 15
- Max execution time: 180
- Max tokens per call: 4096
- Retry on failure: yes
- Max retries: 2

## Tags
sales, reporting, weekly, salesforce, google-sheets`,
    guardrails_md: null,
    tools_allowed: ['salesforce_query', 'email_send', 'slack_notify', 'google_sheets_read'],
    model_id: 'gemini-flash',
    schedule: { type: 'cron', value: '0 17 * * 5', timezone: 'America/New_York', enabled: false },
    tags: ['sales', 'reporting', 'weekly'],
    created_by: 'sarah@sanguinebio.com',
    approved_by: null,
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-14T09:20:00Z',
    last_execution_at: null,
    execution_count: 0,
    estimated_cost: 0.15,
  },
  {
    id: 'ag_04LT6N8A0B',
    name: 'Data Quality Checker',
    version: 1,
    status: 'draft',
    definition_md: `# Agent: Data Quality Checker\n\n## Description\nAudits CRM data for quality issues and generates a report of records needing attention.\n\n## Instructions\n1. Scan contacts for missing emails, phone numbers\n2. Check companies for duplicate entries\n3. Validate deal stage consistency\n4. Generate quality score per record\n5. Export findings to Google Sheet\n\n## Tools\n- salesforce_query\n- google_sheets_read\n\n## Schedule\nWeekly on Monday at 6:00 AM`,
    guardrails_md: null,
    tools_allowed: ['salesforce_query', 'google_sheets_read'],
    model_id: 'claude-sonnet',
    schedule: { type: 'cron', value: '0 6 * * 1', timezone: 'America/New_York', enabled: false },
    tags: ['data-quality', 'crm', 'audit'],
    created_by: 'kevin@sanguinebio.com',
    approved_by: null,
    created_at: '2026-03-12T14:00:00Z',
    updated_at: '2026-03-13T10:30:00Z',
    last_execution_at: null,
    execution_count: 0,
    estimated_cost: 0.20,
  },
  {
    id: 'ag_05MU7O9B1C',
    name: 'New Lead Notifier',
    version: 4,
    status: 'draft',
    definition_md: `# Agent: New Lead Notifier\n\n## Description\nMonitors for new high-value leads and instantly notifies the sales team.\n\n## Instructions\n1. Watch for new leads with score > 80\n2. Enrich lead data from company database\n3. Send Slack notification to assigned rep\n4. Create follow-up task in Salesforce\n\n## Tools\n- salesforce_query\n- sf_record_update\n- slack_notify\n\n## Schedule\nEvery 5 minutes during business hours`,
    guardrails_md: 'Only notify during business hours (8 AM - 6 PM EST). Max 20 notifications per hour.',
    tools_allowed: ['salesforce_query', 'sf_record_update', 'slack_notify'],
    model_id: 'gemini-flash',
    schedule: { type: 'interval', value: '5m', enabled: false },
    tags: ['sales', 'leads', 'notifications'],
    created_by: 'mike@sanguinebio.com',
    approved_by: null,
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-11T15:00:00Z',
    last_execution_at: '2026-03-01T12:30:00Z',
    execution_count: 342,
    estimated_cost: 0.05,
  },
  {
    id: 'ag_06NV8P0C2D',
    name: 'Contract Expiry Alert',
    version: 2,
    status: 'disabled',
    definition_md: `# Agent: Contract Expiry Alert\n\n## Description\nAlerts account managers about contracts expiring within the next 30/60/90 days.\n\n## Instructions\n1. Query contracts database for upcoming expirations\n2. Group by urgency (30/60/90 day windows)\n3. Send personalized emails to account managers\n4. Post weekly summary to #renewals channel\n\n## Tools\n- salesforce_query\n- email_send\n- slack_notify\n\n## Schedule\nDaily at 8:00 AM EST`,
    guardrails_md: 'Do not alert for contracts under $5,000 ARR.',
    tools_allowed: ['salesforce_query', 'email_send', 'slack_notify'],
    model_id: 'gemini-pro',
    schedule: { type: 'cron', value: '0 8 * * *', timezone: 'America/New_York', enabled: false },
    tags: ['renewals', 'contracts', 'notifications'],
    created_by: 'kevin@sanguinebio.com',
    approved_by: 'admin@sanguinebio.com',
    created_at: '2025-10-01T12:00:00Z',
    updated_at: '2026-02-28T08:00:00Z',
    last_execution_at: '2026-02-28T08:00:00Z',
    execution_count: 145,
    estimated_cost: 0.10,
  },
  {
    id: 'ag_07OW9Q1D3E',
    name: 'Meeting Notes Summarizer',
    version: 1,
    status: 'draft',
    definition_md: `# Agent: Meeting Notes Summarizer\n\n## Description\nSummarizes meeting recordings and distributes action items to attendees.\n\n## Instructions\n1. Detect new meeting recordings\n2. Transcribe and summarize key points\n3. Extract action items with owners\n4. Email summary to all attendees\n5. Create tasks in project management tool\n\n## Tools\n- email_send\n- slack_notify\n\n## Schedule\nTriggered via webhook after meeting ends`,
    guardrails_md: null,
    tools_allowed: ['email_send', 'slack_notify'],
    model_id: 'claude-sonnet',
    schedule: { type: 'webhook', value: 'meeting_ended', enabled: false },
    tags: ['meetings', 'productivity', 'ai'],
    created_by: 'sarah@sanguinebio.com',
    approved_by: null,
    created_at: '2026-03-14T16:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
    last_execution_at: null,
    execution_count: 0,
    estimated_cost: 0.25,
  },
];
