import { PersonalInformation, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User } from 'lucide-react';

interface PersonalInfoSectionProps {
  data: PersonalInformation;
}

export default function PersonalInfoSection({ data }: PersonalInfoSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-primary" />
          PERSONAL INFORMATION
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Name, DOB, Gender Row */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">NAME</p>
            <p className="font-semibold">{formatValue(data.full_name)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">DATE OF BIRTH</p>
            <p className="font-semibold">{formatValue(data.date_of_birth)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">GENDER</p>
            <p className="font-semibold">{formatValue(data.gender)}</p>
          </div>
        </div>

        {/* Identification Details Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase">IDENTIFICATION TYPE</TableHead>
              <TableHead className="text-xs uppercase">NUMBER</TableHead>
              <TableHead className="text-xs uppercase">ISSUE DATE</TableHead>
              <TableHead className="text-xs uppercase">EXPIRATION DATE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.identifications.length > 0 ? (
              data.identifications.map((id, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatValue(id.type)}</TableCell>
                  <TableCell>{formatValue(id.number)}</TableCell>
                  <TableCell>{formatValue(id.issue_date)}</TableCell>
                  <TableCell>{formatValue(id.expiration_date)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No identification details available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
