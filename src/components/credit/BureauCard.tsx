import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BureauCardProps {
  name: string;
  code: 'cibil' | 'experian' | 'equifax' | 'crif';
  score?: number;
  isSelected?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

const bureauConfig = {
  cibil: { 
    fullName: 'TransUnion CIBIL',
    color: 'bureau-cibil',
    bgClass: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  experian: { 
    fullName: 'Experian',
    color: 'bureau-experian',
    bgClass: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  equifax: { 
    fullName: 'Equifax',
    color: 'bureau-equifax',
    bgClass: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  crif: { 
    fullName: 'CRIF High Mark',
    color: 'bureau-crif',
    bgClass: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600'
  }
};

export default function BureauCard({ name, code, score, isSelected, isLocked, onClick }: BureauCardProps) {
  const config = bureauConfig[code];

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-200",
        onClick && "cursor-pointer",
        isSelected ? `${config.bgClass} shadow-md` : "bg-card border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.iconBg)}>
            <span className={cn("text-lg font-bold", config.iconColor)}>
              {code.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{config.fullName}</p>
            {score && !isLocked && (
              <p className="text-2xl font-bold" style={{ color: `hsl(var(--${config.color}))` }}>
                {score}
              </p>
            )}
          </div>
        </div>
        
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
            <Check className="w-4 h-4 text-accent-foreground" />
          </div>
        )}
        
        {isLocked && (
          <Lock className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}
