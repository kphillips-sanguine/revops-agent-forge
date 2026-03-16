import type { AgentStatus } from '../types/agent';
import type { ExecutionStatus } from '../types/execution';

type BadgeStatus = AgentStatus | ExecutionStatus;

const statusConfig: Record<BadgeStatus, { label: string; classes: string }> = {
  draft: {
    label: 'Draft',
    classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  pending_review: {
    label: 'Pending Review',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  active: {
    label: 'Active',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  disabled: {
    label: 'Disabled',
    classes: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  running: {
    label: 'Running',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
  },
  success: {
    label: 'Success',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  timeout: {
    label: 'Timeout',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
