import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

interface ValidationResult {
  section: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
}

const REQUIRED_SECTIONS = [
  'Agent',
  'Description',
  'Instructions',
  'Tools',
  'Schedule',
];

const KNOWN_TOOLS = [
  'salesforce_query',
  'sf_record_update',
  'slack_notify',
  'email_send',
  'google_sheets_read',
  'hubspot_query',
];

export function validateAgentMd(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check for agent name (# Agent: ...)
  const hasAgentName = /^#\s+Agent:\s*.+/m.test(content);
  results.push({
    section: 'Agent Name',
    status: hasAgentName ? 'pass' : 'error',
    message: hasAgentName
      ? 'Agent name defined'
      : 'Missing "# Agent: <name>" heading',
  });

  // Check required sections
  for (const section of REQUIRED_SECTIONS.slice(1)) {
    const regex = new RegExp(`^##\\s+${section}`, 'm');
    const hasSection = regex.test(content);
    results.push({
      section,
      status: hasSection ? 'pass' : 'error',
      message: hasSection
        ? `${section} section present`
        : `Missing required "## ${section}" section`,
    });
  }

  // Check optional sections
  const optionalSections = ['Metadata', 'Persona', 'Inputs', 'Outputs', 'Constraints', 'Tags'];
  for (const section of optionalSections) {
    const regex = new RegExp(`^##\\s+${section}`, 'm');
    const hasSection = regex.test(content);
    if (!hasSection) {
      results.push({
        section,
        status: 'warning',
        message: `Optional "## ${section}" section not found`,
      });
    }
  }

  // Check tool references exist in the registry
  const toolsMatch = content.match(/^##\s+Tools\s*\n([\s\S]*?)(?=^##\s|\Z)/m);
  if (toolsMatch) {
    const toolsBlock = toolsMatch[1];
    const referencedTools = [...toolsBlock.matchAll(/\*\*(\w+)\*\*/g)].map((m) => m[1]);
    for (const tool of referencedTools) {
      const exists = KNOWN_TOOLS.includes(tool);
      results.push({
        section: `Tool: ${tool}`,
        status: exists ? 'pass' : 'warning',
        message: exists
          ? `Tool "${tool}" found in registry`
          : `Tool "${tool}" not found in known tool registry`,
      });
    }
    if (referencedTools.length === 0) {
      results.push({
        section: 'Tools',
        status: 'warning',
        message: 'No tools listed in the Tools section',
      });
    }
  }

  // Check for Steps sub-section within Instructions
  const hasSteps = /^###\s+Steps/m.test(content);
  if (!hasSteps) {
    results.push({
      section: 'Steps',
      status: 'warning',
      message: 'Missing "### Steps" sub-section under Instructions',
    });
  }

  return results;
}

interface ValidationPanelProps {
  results: ValidationResult[];
  onClose: () => void;
}

export default function ValidationPanel({ results, onClose }: ValidationPanelProps) {
  const errors = results.filter((r) => r.status === 'error');
  const warnings = results.filter((r) => r.status === 'warning');
  const passes = results.filter((r) => r.status === 'pass');

  const statusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    }
  };

  return (
    <div className="border border-card-border rounded-lg bg-card-bg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-card-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-200">Validation Results</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400">{passes.length} passed</span>
            <span className="text-gray-600">&middot;</span>
            <span className="text-amber-400">{warnings.length} warnings</span>
            <span className="text-gray-600">&middot;</span>
            <span className="text-red-400">{errors.length} errors</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto p-3 space-y-1.5">
        {/* Errors first, then warnings, then passes */}
        {[...errors, ...warnings, ...passes].map((result, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            {statusIcon(result.status)}
            <span className="text-gray-400">{result.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
