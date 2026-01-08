import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, Shield } from 'lucide-react';

interface ScoreRepairCTAProps {
  score?: number | null;
}

export default function ScoreRepairCTA({ score }: ScoreRepairCTAProps) {
  const needsImprovement = score && score < 700;

  if (!needsImprovement) return null;

  return (
    <Card className="mt-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Improve Your Credit Score
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your score has room for improvement. Get personalized tips to boost your credit health.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Increase by 50+ points</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Expert guidance</span>
              </div>
            </div>
          </div>
          <Button className="flex-shrink-0">
            Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
