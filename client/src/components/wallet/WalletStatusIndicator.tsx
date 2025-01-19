import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const WalletStatusIndicator: FC = () => {
  const { wallet, connected, connecting } = useWallet();

  const getStatus = () => {
    if (connecting) return 'connecting';
    if (connected) return 'connected';
    return 'disconnected';
  };

  return (
    <div className="flex items-center">
      <motion.div
        animate={getStatus()}
        className="relative flex items-center"
      >
        {/* Status dot */}
        <motion.div
          className="w-3 h-3 rounded-full"
          variants={{
            connected: { 
              backgroundColor: "rgb(34 197 94)", // green-500
              boxShadow: "0 0 12px rgb(34 197 94)"
            },
            disconnected: { 
              backgroundColor: "rgb(156 163 175)", // gray-400
              boxShadow: "none"
            },
            connecting: {
              backgroundColor: "rgb(234 179 8)", // yellow-500
              boxShadow: "0 0 12px rgb(234 179 8)"
            }
          }}
          animate={getStatus()}
        />

        {/* Loading spinner */}
        {connecting && (
          <motion.div 
            className="absolute -right-1"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </motion.div>
        )}
      </motion.div>

      {/* Status text */}
      <motion.span
        className="ml-2 text-sm"
        animate={{
          color: connecting 
            ? "rgb(234 179 8)" 
            : connected 
              ? "rgb(34 197 94)"
              : "rgb(156 163 175)"
        }}
      >
        {connecting 
          ? "Connecting..." 
          : connected 
            ? "Connected"
            : "Disconnected"}
      </motion.span>
    </div>
  );
};

export default WalletStatusIndicator;