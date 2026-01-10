import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

interface ImprovementTipsProps {
  tips: string[];
}

export default function ImprovementTips({ tips }: ImprovementTipsProps) {
  if (!tips || tips.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Improvement Tips
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
