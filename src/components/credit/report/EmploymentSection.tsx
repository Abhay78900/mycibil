import { EmploymentInfo, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase } from 'lucide-react';

interface EmploymentSectionProps {
  data: EmploymentInfo[];
}

export default function EmploymentSection({ data }: EmploymentSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="w-5 h-5 text-primary" />
          EMPLOYMENT INFORMATION
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase">ACCOUNT TYPE</TableHead>
              <TableHead className="text-xs uppercase">DATE REPORTED</TableHead>
              <TableHead className="text-xs uppercase">OCCUPATION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((emp, index) => (
                <TableRow key={index}>
                  <TableCell>{formatValue(emp.account_type)}</TableCell>
                  <TableCell>{formatValue(emp.date_reported)}</TableCell>
                  <TableCell>{formatValue(emp.occupation)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No employment information available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data.length > 0 && data[0].income && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground uppercase">INCOME</p>
              <p className="font-medium">{formatValue(data[0].income)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">FREQUENCY</p>
              <p className="font-medium">{formatValue(data[0].frequency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">INCOME INDICATOR</p>
              <p className="font-medium">{formatValue(data[0].income_indicator)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
