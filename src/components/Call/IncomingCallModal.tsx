/**
 * Incoming Call Modal
 * Shows when someone is calling the user
 */

import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';

interface IncomingCallModalProps {
  onAccept?: () => void;
  onReject?: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  onAccept,
  onReject,
}) => {
  const { state, acceptCall, rejectCall } = useCall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(state.status === 'incoming');
  }, [state.status]);

  const handleAccept = async () => {
    await acceptCall();
    onAccept?.();
  };

  const handleReject = () => {
    rejectCall('declined');
    onReject?.();
  };

  if (!isVisible || state.status !== 'incoming') {
    return null;
  }

  const callerName = state.remoteUser?.username || 'Unknown';
  const isDirectCall = state.callType === 'direct';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4"
        >
          {/* Avatar / Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Video className="w-12 h-12 text-primary" />
              </div>
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse opacity-40" />
            </div>
          </div>

          {/* Caller info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {callerName}
            </h2>
            <p className="text-muted-foreground">
              {isDirectCall ? 'Incoming video call...' : `Inviting to ${state.roomName || 'room call'}...`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-8">
            {/* Reject button */}
            <button
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>

            {/* Accept button */}
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallModal;
