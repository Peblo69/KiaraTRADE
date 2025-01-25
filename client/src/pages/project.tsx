import { FC } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const ProjectPage: FC = () => {
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
            Welcome to our project showcase. Here you'll find our latest developments and innovations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 bg-gray-800/50 border-purple-800/20 backdrop-blur-sm">
            <div className="aspect-video rounded-lg overflow-hidden bg-black/50">
              {/* Video content will be added here */}
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                Video content coming soon
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-white mb-2">Project Details</h2>
              <p className="text-gray-400">
                Project description and details will be displayed here.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectPage;