import { FC } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { validateImageUrl } from '@/utils/image-handler';
import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

const ProjectPage: FC = () => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);

  // Test with a sample IPFS URL
  useEffect(() => {
    const testImageUrl = "ipfs://QmXJNhGwtbGsBaUYq9YRSmUWNfCVRADrWVyxVP3CfAZadS";
    console.log('[ProjectPage] Testing with URL:', testImageUrl);

    const processedUrl = validateImageUrl(testImageUrl);
    console.log('[ProjectPage] Processed URL:', processedUrl);

    setValidatedImageUrl(processedUrl);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Project Overview</h1>
          <p className="text-gray-400">
            Testing image handling with IPFS URLs
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 bg-gray-800/50 border-purple-800/20 backdrop-blur-sm">
            <div className="aspect-video rounded-lg overflow-hidden bg-black/50 relative">
              {validatedImageUrl && !imageError ? (
                <img 
                  src={validatedImageUrl}
                  alt="Test Token Image"
                  className="w-full h-full object-cover transform hover:scale-105 transition-all duration-300"
                  onError={(e) => {
                    console.error('[ProjectPage] Image failed to load:', validatedImageUrl);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('[ProjectPage] Image loaded successfully:', validatedImageUrl);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-800/20">
                  <div className="w-16 h-16 rounded-full bg-purple-800/30 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-purple-500/50" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-white mb-2">Image URL Details</h2>
              <p className="text-gray-400">
                {validatedImageUrl || 'No valid image URL available'}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectPage;