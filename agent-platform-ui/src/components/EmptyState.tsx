import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onAction) {
      onAction();
    } else if (actionTo) {
      navigate(actionTo);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 text-gray-600">
        {icon || <Inbox className="w-10 h-10" />}
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-gray-600 text-xs mb-4">{description}</p>
      {actionLabel && (
        <button
          onClick={handleClick}
          className="px-4 py-2 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
