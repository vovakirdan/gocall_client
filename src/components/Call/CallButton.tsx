/**
 * Call Button
 * Initiates a video call to a user or room
 */

import React from 'react';
import { Phone, Video } from 'lucide-react';
import { useCall, CallType } from '../../context/CallContext';

interface CallButtonProps {
  type: CallType;
  targetId: number;
  targetName?: string;
  variant?: 'icon' | 'text' | 'full';
  className?: string;
  disabled?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({
  type,
  targetId,
  targetName,
  variant = 'icon',
  className = '',
  disabled = false,
}) => {
  const { state, initiateCall } = useCall();

  const isInCall = state.status !== 'idle' && state.status !== 'ended';

  const handleClick = () => {
    if (isInCall || disabled) return;
    initiateCall(type, targetId, targetName);
  };

  const baseClasses = 'transition-all focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isInCall || disabled}
        className={`p-2 rounded-full hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
        title={type === 'direct' ? 'Start video call' : 'Start room call'}
      >
        <Video className="w-5 h-5 text-primary" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleClick}
        disabled={isInCall || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
      >
        <Video className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary">Call</span>
      </button>
    );
  }

  // Full variant
  return (
    <button
      onClick={handleClick}
      disabled={isInCall || disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
    >
      <Video className="w-5 h-5" />
      <span>{type === 'direct' ? 'Video Call' : 'Start Call'}</span>
    </button>
  );
};

// Audio-only call button variant
export const AudioCallButton: React.FC<CallButtonProps> = ({
  type,
  targetId,
  targetName,
  variant = 'icon',
  className = '',
  disabled = false,
}) => {
  const { state, initiateCall } = useCall();

  const isInCall = state.status !== 'idle' && state.status !== 'ended';

  const handleClick = () => {
    if (isInCall || disabled) return;
    initiateCall(type, targetId, targetName);
  };

  const baseClasses = 'transition-all focus:outline-none focus:ring-2 focus:ring-green-500/50';

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isInCall || disabled}
        className={`p-2 rounded-full hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
        title={type === 'direct' ? 'Start audio call' : 'Start room call'}
      >
        <Phone className="w-5 h-5 text-green-500" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isInCall || disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
    >
      <Phone className="w-5 h-5" />
      <span>Audio Call</span>
    </button>
  );
};

export default CallButton;
