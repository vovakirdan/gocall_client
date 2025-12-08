/**
 * Outgoing Call Modal
 * Shows when user is calling someone and waiting for them to answer
 */

import React from 'react';
import { PhoneOff, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';

interface OutgoingCallModalProps {
  onCancel?: () => void;
}

const OutgoingCallModal: React.FC<OutgoingCallModalProps> = ({ onCancel }) => {
  const { state, endCall } = useCall();

  const handleCancel = () => {
    endCall();
    onCancel?.();
  };

  if (state.status !== 'outgoing') {
    return null;
  }

  const calleeName = state.remoteUser?.username || 'User';
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
              {/* Outgoing call animation - dots */}
              <motion.div
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </div>

          {/* Callee info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isDirectCall ? `Calling ${calleeName}...` : `Starting room call...`}
            </h2>
            <p className="text-muted-foreground">
              {isDirectCall ? 'Waiting for answer...' : `Room: ${state.roomName || 'Unknown'}`}
            </p>
          </div>

          {/* Cancel button */}
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
          </div>
          <p className="text-center text-muted-foreground text-sm mt-4">
            Tap to cancel
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OutgoingCallModal;
