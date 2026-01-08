import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { CreditReport } from '@/types';

interface AIReportAnalysisProps {
  report: CreditReport;
}

export default function AIReportAnalysis({ report }: AIReportAnalysisProps) {
  if (!report.ai_analysis) return null;

  const isHighRisk = report.is_high_risk;
  const riskFlags = (report.risk_flags as string[]) || [];
  const improvementTips = (report.improvement_tips as string[]) || [];

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Text */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{report.ai_analysis}</p>
        </div>

        {/* Risk Flags */}
        {isHighRisk && riskFlags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Risk Flags
            </h4>
            <ul className="space-y-1">
              {riskFlags.map((flag, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Tips */}
        {improvementTips.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Improvement Tips
            </h4>
            <ul className="space-y-1">
              {improvementTips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isHighRisk && riskFlags.length === 0 && improvementTips.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>No significant issues detected in your credit profile.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
