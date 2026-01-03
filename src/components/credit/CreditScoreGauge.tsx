import { motion } from 'framer-motion';

interface CreditScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score < 500) return 'hsl(var(--score-poor))';
  if (score < 650) return 'hsl(var(--score-fair))';
  if (score < 750) return 'hsl(var(--score-good))';
  return 'hsl(var(--score-excellent))';
};

const getScoreLabel = (score: number): string => {
  if (score < 500) return 'Poor';
  if (score < 650) return 'Fair';
  if (score < 750) return 'Good';
  return 'Excellent';
};

export default function CreditScoreGauge({ score, size = 280, showLabel = true }: CreditScoreGaugeProps) {
  const normalizedScore = Math.max(300, Math.min(900, score));
  const percentage = ((normalizedScore - 300) / 600) * 100;
  const color = getScoreColor(normalizedScore);
  const label = getScoreLabel(normalizedScore);
  
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const offset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size * 0.75 }}>
      <svg width={size} height={size} className="transform -rotate-[135deg]">
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={circumference * 0.25}
        />
        {/* Score arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <motion.span 
          className="text-5xl font-bold font-display"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {normalizedScore}
        </motion.span>
        <span className="text-sm text-muted-foreground">out of 900</span>
        {showLabel && (
          <motion.span 
            className="mt-2 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${color}20`, color }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {label}
          </motion.span>
        )}
      </div>
    </div>
  );
}
