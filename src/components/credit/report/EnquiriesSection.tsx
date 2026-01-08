import { EnquiryInfo, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';

interface EnquiriesSectionProps {
  data: EnquiryInfo[];
}

export default function EnquiriesSection({ data }: EnquiriesSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5 text-primary" />
          ENQUIRY INFORMATION
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase">MEMBER NAME</TableHead>
              <TableHead className="text-xs uppercase">DATE OF ENQUIRY</TableHead>
              <TableHead className="text-xs uppercase">ENQUIRY PURPOSE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((enquiry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatValue(enquiry.member_name)}</TableCell>
                  <TableCell>{formatValue(enquiry.date_of_enquiry)}</TableCell>
                  <TableCell>{formatValue(enquiry.enquiry_purpose)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No enquiry information available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
