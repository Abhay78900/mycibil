import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScoreRepairCTAProps {
  score: number;
}

export default function ScoreRepairCTA({ score }: ScoreRepairCTAProps) {
  const needsRepair = score < 700;

  if (!needsRepair) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-6"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Improve Your Credit Score</h3>
            <p className="text-sm text-muted-foreground">
              Your score of {score} can be improved. Get personalized tips to boost your score.
            </p>
          </div>
        </div>
        <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
          Start Score Repair
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
