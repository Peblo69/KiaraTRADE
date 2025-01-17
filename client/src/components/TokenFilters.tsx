import { FC } from 'react';
import { useTokenFiltersStore, type TokenFilterType } from '@/lib/token-filters';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Target,
  Shield,
  Trophy,
  Award,
  LayoutGrid
} from 'lucide-react';

const filters: Array<{
  id: TokenFilterType;
  label: string;
  icon: typeof Target;
  color: string;
}> = [
  { id: 'all', label: 'All', icon: LayoutGrid, color: 'text-blue-400' },
  { id: 'snipers', label: 'Snipers', icon: Target, color: 'text-green-400' },
  { id: 'bluechip', label: 'BlueChip', icon: Shield, color: 'text-purple-400' },
  { id: 'top10', label: 'Top 10', icon: Trophy, color: 'text-yellow-400' },
  { id: 'audit', label: 'Audit', icon: Award, color: 'text-red-400' },
];

export const TokenFilters: FC = () => {
  const { activeFilter, setFilter } = useTokenFiltersStore();

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(({ id, label, icon: Icon, color }) => {
        const isActive = activeFilter === id;
        return (
          <motion.div
            key={id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={isActive ? "default" : "outline"}
              className={`relative ${isActive ? 'bg-gray-800 border-blue-500/50' : 'bg-black/40 hover:bg-gray-800/50'} backdrop-blur-lg`}
              onClick={() => setFilter(id)}
            >
              <Icon className={`w-4 h-4 mr-2 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500"
                  layoutId="underline"
                />
              )}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};
