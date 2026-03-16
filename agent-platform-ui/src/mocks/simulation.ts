import type { ExecutionStep } from '../types/execution';

export interface SimulationResult {
  status: 'success' | 'failed';
  duration_ms: number;
  steps: ExecutionStep[];
  output: string;
  total_tokens: number;
  estimated_cost: number;
  llm_calls: number;
}

export function runMockSimulation(
  definition: string,
  inputContext: Record<string, unknown>,
): Promise<SimulationResult> {
  return new Promise((resolve) => {
    const delay = 2000 + Math.random() * 1500;

    // Parse tools from definition to create realistic steps
    const toolMatches = [...definition.matchAll(/\*\*(\w+)\*\*/g)].map((m) => m[1]);
    const tools = toolMatches.filter((t) =>
      ['salesforce_query', 'sf_record_update', 'slack_notify', 'email_send', 'google_sheets_read', 'hubspot_query'].includes(t),
    );

    const now = new Date();
    const steps: ExecutionStep[] = [];
    let elapsed = 0;

    // Start step
    steps.push({
      id: `sim_step_start`,
      type: 'start',
      timestamp: new Date(now.getTime() + elapsed).toISOString(),
      message: 'Simulation started',
    });
    elapsed += 500;

    // Tool call steps
    for (const tool of tools) {
      const toolDuration = 1500 + Math.floor(Math.random() * 3000);
      steps.push({
        id: `sim_step_tool_${tool}`,
        type: 'tool_call',
        timestamp: new Date(now.getTime() + elapsed).toISOString(),
        duration_ms: toolDuration,
        status: 'success',
        tool_call: {
          id: `sim_tc_${tool}`,
          tool_name: tool,
          input_summary: getToolInputSummary(tool),
          input: getToolMockInput(tool, inputContext),
          output: getToolMockOutput(tool),
          status: 'success',
          duration_ms: toolDuration,
          started_at: new Date(now.getTime() + elapsed).toISOString(),
        },
      });
      elapsed += toolDuration;

      // LLM call after tool
      const llmDuration = 2000 + Math.floor(Math.random() * 2000);
      steps.push({
        id: `sim_step_llm_${tool}`,
        type: 'llm_call',
        timestamp: new Date(now.getTime() + elapsed).toISOString(),
        duration_ms: llmDuration,
        message: `Processing ${tool} results`,
        status: 'success',
      });
      elapsed += llmDuration;
    }

    // Complete step
    steps.push({
      id: `sim_step_complete`,
      type: 'complete',
      timestamp: new Date(now.getTime() + elapsed).toISOString(),
      message: 'Simulation completed successfully',
      status: 'success',
    });

    setTimeout(() => {
      resolve({
        status: 'success',
        duration_ms: elapsed,
        steps,
        output: `Simulation complete. Processed ${tools.length} tool calls successfully.`,
        total_tokens: 1200 + tools.length * 800,
        estimated_cost: 0.02 + tools.length * 0.03,
        llm_calls: tools.length + 1,
      });
    }, delay);
  });
}

function getToolInputSummary(tool: string): string {
  switch (tool) {
    case 'salesforce_query':
      return 'Query records (simulated)';
    case 'sf_record_update':
      return 'Update records (simulated)';
    case 'slack_notify':
      return 'Send notification (simulated)';
    case 'email_send':
      return 'Send email (simulated)';
    case 'google_sheets_read':
      return 'Read spreadsheet data (simulated)';
    case 'hubspot_query':
      return 'Query HubSpot records (simulated)';
    default:
      return 'Execute tool (simulated)';
  }
}

function getToolMockInput(
  tool: string,
  context: Record<string, unknown>,
): Record<string, unknown> {
  switch (tool) {
    case 'salesforce_query':
      return { query: 'SELECT Id, Name FROM Account LIMIT 10', ...context };
    case 'sf_record_update':
      return { object_type: 'Case', record_id: 'CASE-001', fields: { Status: 'Updated' } };
    case 'slack_notify':
      return { channel: '#general', message: 'Simulation test message' };
    case 'email_send':
      return { to: 'test@example.com', subject: 'Simulation', body: 'Test email body' };
    case 'google_sheets_read':
      return { spreadsheet_id: 'sim_sheet_123', range: 'Sheet1!A1:D10' };
    case 'hubspot_query':
      return { object_type: 'contacts', filters: {}, properties: ['email', 'firstname'] };
    default:
      return context;
  }
}

function getToolMockOutput(tool: string): Record<string, unknown> {
  switch (tool) {
    case 'salesforce_query':
      return { record_count: 5, records: ['Account A', 'Account B', 'Account C'] };
    case 'sf_record_update':
      return { updated: 1, errors: 0 };
    case 'slack_notify':
      return { delivered: true, message_id: 'sim_msg_001' };
    case 'email_send':
      return { sent: true, message_id: 'sim_email_001' };
    case 'google_sheets_read':
      return { rows: 10, columns: 4 };
    case 'hubspot_query':
      return { record_count: 3, records: ['Contact 1', 'Contact 2', 'Contact 3'] };
    default:
      return { success: true };
  }
}
