import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BureauData {
  id: string;
  name: string;
  price: number;
}

interface ReportInput {
  fullName: string;
  panNumber: string;
  dateOfBirth?: string;
  selectedBureaus: string[];
}

export function useCreditReports() {
  const { user, userRole } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const bureaus: BureauData[] = [
    { id: 'cibil', name: 'TransUnion CIBIL', price: 99 },
    { id: 'experian', name: 'Experian', price: 99 },
    { id: 'equifax', name: 'Equifax', price: 99 },
    { id: 'crif', name: 'CRIF High Mark', price: 99 }
  ];

  const generateScore = () => Math.floor(Math.random() * (850 - 650 + 1)) + 650;

  const generateReportData = (selectedBureaus: string[]) => {
    const cibil_score = selectedBureaus.includes('cibil') ? generateScore() : null;
    const experian_score = selectedBureaus.includes('experian') ? generateScore() : null;
    const equifax_score = selectedBureaus.includes('equifax') ? generateScore() : null;
    const crif_score = selectedBureaus.includes('crif') ? generateScore() : null;

    const validScores = [cibil_score, experian_score, equifax_score, crif_score].filter(s => s !== null) as number[];
    const averageScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;

    return {
      cibil_score,
      experian_score,
      equifax_score,
      crif_score,
      average_score: averageScore,
      active_loans: [
        {
          lender: 'HDFC Bank',
          loan_type: 'Home Loan',
          sanctioned_amount: 5000000,
          current_balance: 3500000,
          emi_amount: 45000,
          tenure_months: 240,
          start_date: '2022-01-15'
        }
      ],
      credit_cards: [
        {
          bank: 'Axis Bank',
          credit_limit: 200000,
          current_balance: 45000,
          payment_status: 'On Time'
        }
      ],
      enquiries: [
        {
          institution: 'HDFC Bank',
          date: '2024-01-15',
          purpose: 'Credit Card Application'
        }
      ]
    };
  };

  const generateReport = async (input: ReportInput, partnerId?: string): Promise<string | null> => {
    if (!user) {
      toast.error('Please login to generate a report');
      return null;
    }

    if (input.selectedBureaus.length === 0) {
      toast.error('Please select at least one bureau');
      return null;
    }

    setIsGenerating(true);
    try {
      const totalCost = input.selectedBureaus.length * 99;
      const reportData = generateReportData(input.selectedBureaus);
      const isPartner = userRole === 'partner';

      // Create report record
      const { data: report, error } = await supabase
        .from('credit_reports')
        .insert({
          user_id: user.id,
          partner_id: isPartner ? partnerId : null,
          full_name: input.fullName,
          pan_number: input.panNumber.toUpperCase(),
          date_of_birth: input.dateOfBirth,
          selected_bureaus: input.selectedBureaus,
          cibil_score: reportData.cibil_score,
          experian_score: reportData.experian_score,
          equifax_score: reportData.equifax_score,
          crif_score: reportData.crif_score,
          average_score: reportData.average_score,
          amount_paid: totalCost,
          report_status: 'unlocked',
          active_loans: reportData.active_loans,
          credit_cards: reportData.credit_cards,
          enquiries: reportData.enquiries
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Credit report generated successfully!');
      return report.id;
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const getUserReports = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('user_id', user.id)
        .is('partner_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  };

  const getPartnerReports = async (partnerId: string) => {
    if (!partnerId) return [];

    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching partner reports:', error);
      return [];
    }
  };

  const getAllReports = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all reports:', error);
      return [];
    }
  };

  const getReportById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  };

  return {
    bureaus,
    generateReport,
    getUserReports,
    getPartnerReports,
    getAllReports,
    getReportById,
    isGenerating
  };
}
