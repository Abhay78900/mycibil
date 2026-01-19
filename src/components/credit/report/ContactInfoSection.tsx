import { ContactInformation, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Phone, Mail } from 'lucide-react';

interface ContactInfoSectionProps {
  data: ContactInformation;
}

export default function ContactInfoSection({ data }: ContactInfoSectionProps) {
  // Defensive: ensure data exists with defaults
  const safeData = {
    addresses: data?.addresses || [],
    phone_numbers: data?.phone_numbers || [],
    email_addresses: data?.email_addresses || []
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-primary" />
          CONTACT INFORMATION
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address History */}
        {safeData.addresses.map((addr, index) => (
          <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">ADDRESS {index + 1}</span>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>CATEGORY: <span className="text-foreground">{formatValue(addr?.category)}</span></span>
                <span>STATUS: <span className="text-foreground">{formatValue(addr?.status)}</span></span>
                <span>DATE REPORTED: <span className="text-foreground">{formatValue(addr?.date_reported)}</span></span>
              </div>
            </div>
            <p className="text-sm">{formatValue(addr?.address)}</p>
          </div>
        ))}
        
        {safeData.addresses.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No address information available</p>
        )}

        {/* Phone Numbers */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">TELEPHONE NUMBERS</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">TYPE</TableHead>
                <TableHead className="text-xs uppercase">TELEPHONE NUMBER</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeData.phone_numbers.length > 0 ? (
                safeData.phone_numbers.map((phone, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatValue(phone?.type)}</TableCell>
                    <TableCell>{formatValue(phone?.number)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No phone numbers available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Email Addresses */}
        {safeData.email_addresses.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">EMAIL ADDRESSES</span>
            </div>
            <div className="space-y-1">
              {safeData.email_addresses.map((email, index) => (
                <p key={index} className="text-sm">{email}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
