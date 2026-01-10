import { motion } from 'framer-motion';
import CreditScoreGauge from './CreditScoreGauge';

interface BureauConfig {
  name: string;
  fullName: string;
  color: string;
  logo: string;
}

interface BureauScoreCardsProps {
  bureauConfig: Record<string, BureauConfig>;
  getScoreForBureau: (bureau: string) => number;
  selectedBureau: string;
  onBureauSelect: (bureau: string) => void;
}

export default function BureauScoreCards({
  bureauConfig,
  getScoreForBureau,
  selectedBureau,
  onBureauSelect
}: BureauScoreCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Object.entries(bureauConfig).map(([key, config]) => {
        const score = getScoreForBureau(key);
        const hasPurchased = score && score > 0;
        const isSelected = selectedBureau === key;

        return (
          <motion.div
            key={key}
            whileHover={{ scale: hasPurchased ? 1.02 : 1 }}
            whileTap={{ scale: hasPurchased ? 0.98 : 1 }}
            onClick={() => hasPurchased && onBureauSelect(key)}
            className={`
              relative rounded-xl p-4 border-2 transition-all cursor-pointer
              ${isSelected 
                ? 'border-primary bg-primary/5 shadow-lg' 
                : hasPurchased 
                  ? 'border-border bg-card hover:border-primary/50' 
                  : 'border-border/50 bg-muted/30 opacity-60 cursor-not-allowed'
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl mb-2">{config.logo}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {config.name}
              </span>
              {hasPurchased ? (
                <div className="mt-2">
                  <CreditScoreGauge score={score} size={80} />
                </div>
              ) : (
                <span className="text-lg font-bold text-muted-foreground mt-4">N/A</span>
              )}
            </div>
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
