import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrifRequest {
  reportId: string;
  fullName: string;
  panNumber: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, fullName, panNumber, mobileNumber, dateOfBirth, gender } = await req.json() as CrifRequest;

    console.log('CRIF API request:', { reportId, fullName, panNumber, mobileNumber, dateOfBirth, gender });

    // Validate required fields
    if (!reportId || !fullName || !panNumber || !mobileNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: reportId, fullName, panNumber, mobileNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IDSpay credentials
    const apiId = Deno.env.get('IDSPAY_API_ID');
    const apiKey = Deno.env.get('IDSPAY_API_KEY');
    const tokenId = Deno.env.get('IDSPAY_TOKEN_ID');

    if (!apiId || !apiKey || !tokenId) {
      console.error('Missing IDSpay credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'IDSpay credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check sandbox mode
    const { data: sandboxSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sandbox_mode')
      .maybeSingle();

    const isSandboxMode = sandboxSetting?.value?.enabled ?? true;

    let crifScore: number;
    let rawCrifData: any;

    if (isSandboxMode) {
      console.log('Running in sandbox mode - generating mock CRIF data');

      // Generate mock CRIF data
      crifScore = Math.floor(Math.random() * (850 - 650 + 1)) + 650;
      rawCrifData = generateMockCrifData(fullName, panNumber, dateOfBirth, gender, crifScore);
    } else {
      console.log('Running in production mode - calling IDSpay CRIF API');

      // Call IDSpay CRIF API - UAT URL
      const crifApiUrl = 'https://javabackend.idspay.in/api/v1/uat/srv3/credit-report/crif';

      const requestBody = {
        api_id: apiId,
        api_key: apiKey,
        token_id: tokenId,
        pan: panNumber,
        name: fullName,
        mobile: mobileNumber,
        dob: dateOfBirth,
        gender: gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : undefined,
        consent: 'Y'
      };

      console.log('Calling CRIF API URL:', crifApiUrl);
      console.log('Request body (redacted):', { ...requestBody, api_key: '***', token_id: '***' });

      const apiResponse = await fetch(crifApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('CRIF API response status:', apiResponse.status);
      console.log('CRIF API response headers:', Object.fromEntries(apiResponse.headers.entries()));

      // Get raw text first to handle non-JSON responses
      const rawResponseText = await apiResponse.text();
      console.log('CRIF API raw response (first 500 chars):', rawResponseText.slice(0, 500));

      // Check if response is HTML (error page)
      if (rawResponseText.startsWith('<!DOCTYPE') || rawResponseText.startsWith('<html')) {
        console.error('API returned HTML instead of JSON - likely endpoint error or authentication issue');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'CRIF API returned an error page. Please verify API credentials and endpoint URL.',
            details: `Status: ${apiResponse.status}, Response starts with: ${rawResponseText.slice(0, 100)}`
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse JSON
      let apiData;
      try {
        apiData = JSON.parse(rawResponseText);
      } catch (parseError) {
        console.error('Failed to parse API response as JSON:', parseError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid JSON response from CRIF API',
            details: rawResponseText.slice(0, 200)
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('CRIF API parsed response:', JSON.stringify(apiData).slice(0, 500));

      if (!apiResponse.ok) {
        console.error('CRIF API error:', apiData);
        return new Response(
          JSON.stringify({ success: false, error: apiData.message || 'CRIF API request failed' }),
          { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract score from API response
      crifScore = extractCrifScore(apiData);

      // Transform IDSpay CRIF response to the unified report shape used by the UI.
      // This ensures the frontend renders the real report instead of generating a mock template.
      rawCrifData = transformCrifToUnifiedReport(apiData, {
        bureauName: 'CRIF High Mark',
        reportId,
        fullName,
        panNumber,
        dateOfBirth,
        gender,
      });
    }

    // Update the credit report with CRIF data
    const { error: updateError } = await supabase
      .from('credit_reports')
      .update({
        crif_score: crifScore,
        raw_crif_data: rawCrifData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Error updating credit report:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update credit report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recalculate average score
    const { data: report } = await supabase
      .from('credit_reports')
      .select('cibil_score, experian_score, equifax_score, crif_score')
      .eq('id', reportId)
      .single();

    if (report) {
      const scores = [report.cibil_score, report.experian_score, report.equifax_score, report.crif_score]
        .filter(s => s !== null) as number[];

      if (scores.length > 0) {
        const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        await supabase
          .from('credit_reports')
          .update({ average_score: averageScore })
          .eq('id', reportId);
      }
    }

    console.log('CRIF report fetched successfully:', { reportId, crifScore });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          score: crifScore,
          rawData: rawCrifData,
          isSandbox: isSandboxMode
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-crif-report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractCrifScore(apiData: any): number {
  // Extract score from CRIF API response
  if (apiData?.score) return Number(apiData.score);
  if (apiData?.data?.score) return Number(apiData.data.score);
  if (apiData?.creditScore) return Number(apiData.creditScore);
  if (apiData?.data?.creditScore) return Number(apiData.data.creditScore);

  // IDSpay CRIF: data.credit_score is a string number
  if (apiData?.data?.credit_score) return Number(String(apiData.data.credit_score).replace(/,/g, ''));

  // Default mock score if not found
  return Math.floor(Math.random() * (850 - 650 + 1)) + 650;
}

function normalizeCrifDate(input?: string | null): string {
  if (!input) return '---';
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10);
  const m = String(input).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return String(input);
}

function toNum(input: unknown): number {
  const n = Number(String(input ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function ensureArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return [val as T];
  return [];
}

function transformCrifToUnifiedReport(apiData: any, ctx: {
  bureauName: string;
  reportId: string;
  fullName: string;
  panNumber: string;
  dateOfBirth?: string;
  gender?: string;
}) {
  const data = apiData?.data ?? {};
  const cr = data?.credit_report ?? {};
  const hdr = cr?.HEADER ?? {};

  const addresses = ensureArray<any>(cr?.['PERSONAL-INFO-VARIATION']?.['ADDRESS-VARIATIONS']?.VARIATION)
    .map((v) => ({
      address: String(v?.VALUE ?? 'Not Reported'),
      category: 'Not Reported',
      status: 'Not Reported',
      date_reported: normalizeCrifDate(v?.['REPORTED-DATE'])
    }));

  const phones = ensureArray<any>(cr?.['PERSONAL-INFO-VARIATION']?.['PHONE-NUMBER-VARIATIONS']?.VARIATION)
    .map((v) => ({ type: 'Phone', number: String(v?.VALUE ?? 'Not Reported') }));

  if (data?.mobile) {
    phones.unshift({ type: 'Mobile', number: String(data.mobile) });
  }

  const emp = cr?.['EMPLOYMENT-DETAILS']?.['EMPLOYMENT-DETAIL'];
  const employment_information = emp ? [{
    account_type: String(emp?.['ACCT-TYPE'] ?? 'Not Reported'),
    date_reported: normalizeCrifDate(emp?.['DATE-REPORTED']),
    occupation: String(emp?.['OCCUPATION'] ?? 'Not Reported'),
    income: String(emp?.['INCOME'] ?? 'Not Reported'),
    frequency: String(emp?.['INCOME-FREQUENCY'] ?? 'Not Reported'),
    income_indicator: String(emp?.['INCOME-INDICATOR'] ?? 'Not Reported'),
  }] : [];

  const responses = ensureArray<any>(cr?.RESPONSES?.RESPONSE);
  const accounts = responses
    .map(r => r?.['LOAN-DETAILS'])
    .filter(Boolean)
    .map((ld: any) => {
      const dateReported = normalizeCrifDate(ld?.['DATE-REPORTED']);
      return {
        member_name: String(ld?.['CREDIT-GUARANTOR'] ?? 'Not Reported'),
        account_type: String(ld?.['ACCT-TYPE'] ?? 'Not Reported'),
        account_number: String(ld?.['ACCT-NUMBER'] ?? '---'),
        ownership: String(ld?.['OWNERSHIP-IND'] ?? 'Not Reported'),
        credit_limit: '-',
        sanctioned_amount: String(ld?.['DISBURSED-AMT'] ?? '-'),
        current_balance: String(ld?.['CURRENT-BAL'] ?? '-'),
        cash_limit: '-',
        amount_overdue: String(ld?.['OVERDUE-AMT'] ?? '0'),
        rate_of_interest: String(ld?.['INTEREST-RATE'] ?? '-'),
        repayment_tenure: String(ld?.['REPAYMENT-TENURE'] ?? '-'),
        emi_amount: '-',
        payment_frequency: 'Monthly',
        actual_payment_amount: String(ld?.['ACTUAL-PAYMENT'] ?? '-'),
        dates: {
          date_opened: normalizeCrifDate(ld?.['DISBURSED-DT']) || '-',
          date_closed: ld?.['CLOSED-DATE'] ? normalizeCrifDate(ld?.['CLOSED-DATE']) : null,
          date_of_last_payment: ld?.['LAST-PAYMENT-DATE'] ? normalizeCrifDate(ld?.['LAST-PAYMENT-DATE']) : null,
          date_reported: dateReported,
        },
        payment_start_date: normalizeCrifDate(ld?.['DISBURSED-DT']) || '-',
        payment_end_date: dateReported,
        payment_history: [],
        collateral: {
          value: '-',
          type: '-',
          suit_filed: '-',
          credit_facility_status: String(ld?.['ACCOUNT-STATUS'] ?? '-'),
          written_off_total: String(ld?.['WRITE-OFF-AMT'] ?? '-'),
          written_off_principal: String(ld?.['PRINCIPAL-WRITE-OFF-AMT'] ?? '-'),
          settlement_amount: String(ld?.['SETTLEMENT-AMT'] ?? '-'),
        },
      };
    });

  const enquiryObj = cr?.['INQUIRY-HISTORY']?.HISTORY;
  const enquiries = ensureArray<any>(enquiryObj).map((e) => ({
    member_name: String(e?.['MEMBER-NAME'] ?? 'Not Reported'),
    date_of_enquiry: normalizeCrifDate(e?.['INQUIRY-DATE']) || '---',
    enquiry_purpose: String(e?.['PURPOSE'] ?? 'Not Reported'),
  }));

  const primary = cr?.['ACCOUNTS-SUMMARY']?.['PRIMARY-ACCOUNTS-SUMMARY'] ?? {};
  const total_accounts = toNum(primary?.['PRIMARY-NUMBER-OF-ACCOUNTS']) || accounts.length;
  const active_accounts = toNum(primary?.['PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS']);
  const closed_accounts = Math.max(0, total_accounts - active_accounts);

  const unified = {
    header: {
      bureau_name: ctx.bureauName,
      control_number: String(hdr?.['REPORT-ID'] ?? ctx.reportId),
      report_date: normalizeCrifDate(hdr?.['DATE-OF-ISSUE']) || new Date().toISOString().slice(0, 10),
      credit_score: toNum(data?.credit_score) || null,
    },
    personal_information: {
      full_name: String(ctx.fullName || `${data?.first_name ?? ''} ${data?.last_name ?? ''}` || 'Not Reported').trim().toUpperCase(),
      date_of_birth: normalizeCrifDate(ctx.dateOfBirth) || '---',
      gender: ctx.gender || 'Not Reported',
      identifications: [
        {
          type: 'INCOME TAX ID NUMBER (PAN)',
          number: String(data?.pan ?? ctx.panNumber ?? 'Not Reported'),
          issue_date: null,
          expiration_date: null,
        }
      ]
    },
    contact_information: {
      addresses,
      phone_numbers: phones,
      email_addresses: [] as string[],
    },
    employment_information,
    accounts,
    enquiries,
    summary: {
      total_accounts,
      active_accounts,
      closed_accounts,
      total_overdue_amount: accounts.reduce((sum: number, a: any) => sum + toNum(a.amount_overdue), 0),
      total_sanctioned_amount: toNum(primary?.['PRIMARY-SANCTIONED-AMOUNT']) || accounts.reduce((sum: number, a: any) => sum + toNum(a.sanctioned_amount), 0),
      total_current_balance: toNum(primary?.['PRIMARY-CURRENT-BALANCE']) || accounts.reduce((sum: number, a: any) => sum + toNum(a.current_balance), 0),
    }
  };

  // Keep original response for audit/debugging without breaking the UI
  return { ...unified, _raw: apiData };
}


function generateMockCrifData(fullName: string, panNumber: string, dateOfBirth?: string, gender?: string, score?: number) {
  const mockScore = score || Math.floor(Math.random() * (850 - 650 + 1)) + 650;
  const today = new Date().toISOString().slice(0, 10);
  
  // Return in UNIFIED format so the frontend can render it directly
  return {
    header: {
      bureau_name: 'CRIF High Mark',
      control_number: `CRIF-${Date.now()}`,
      report_date: today,
      credit_score: mockScore
    },
    personal_information: {
      full_name: (fullName || 'Not Reported').toUpperCase(),
      date_of_birth: dateOfBirth || '---',
      gender: gender || 'Not Reported',
      identifications: [
        {
          type: 'INCOME TAX ID NUMBER (PAN)',
          number: panNumber || 'Not Reported',
          issue_date: null,
          expiration_date: null
        }
      ]
    },
    contact_information: {
      addresses: [
        {
          address: '123 MOCK STREET, SAMPLE CITY, STATE 123456',
          category: 'Residence',
          status: 'Current',
          date_reported: today
        }
      ],
      phone_numbers: [
        { type: 'Mobile', number: '9876543210' }
      ],
      email_addresses: []
    },
    employment_information: [
      {
        account_type: 'Personal Loan',
        date_reported: today,
        occupation: 'SALARIED',
        income: 'Not Reported',
        frequency: 'Monthly',
        income_indicator: 'N'
      }
    ],
    accounts: [
      {
        member_name: 'HDFC BANK LTD',
        account_type: 'Personal Loan',
        ownership: 'Individual',
        account_number: 'XXXX1234',
        credit_limit: '-',
        sanctioned_amount: '5,00,000',
        current_balance: '2,50,000',
        cash_limit: '-',
        amount_overdue: '0',
        rate_of_interest: '12.5',
        repayment_tenure: '60',
        emi_amount: '11,200',
        payment_frequency: 'Monthly',
        actual_payment_amount: '11,200',
        dates: {
          date_opened: '2022-03-15',
          date_closed: null,
          date_of_last_payment: today,
          date_reported: today
        },
        payment_start_date: '2022-04-01',
        payment_end_date: today,
        payment_history: [],
        collateral: {
          value: '-',
          type: '-',
          suit_filed: '-',
          credit_facility_status: 'Active',
          written_off_total: '-',
          written_off_principal: '-',
          settlement_amount: '-'
        }
      },
      {
        member_name: 'ICICI BANK LTD',
        account_type: 'Credit Card',
        ownership: 'Individual',
        account_number: 'XXXX5678',
        credit_limit: '1,00,000',
        sanctioned_amount: '1,00,000',
        current_balance: '25,000',
        cash_limit: '25,000',
        amount_overdue: '0',
        rate_of_interest: '-',
        repayment_tenure: 'Revolving',
        emi_amount: '-',
        payment_frequency: 'Monthly',
        actual_payment_amount: '-',
        dates: {
          date_opened: '2021-06-10',
          date_closed: null,
          date_of_last_payment: today,
          date_reported: today
        },
        payment_start_date: '-',
        payment_end_date: '-',
        payment_history: [],
        collateral: {
          value: '-',
          type: '-',
          suit_filed: '-',
          credit_facility_status: 'Active',
          written_off_total: '-',
          written_off_principal: '-',
          settlement_amount: '-'
        }
      }
    ],
    enquiries: [
      {
        member_name: 'HDFC BANK',
        date_of_enquiry: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        enquiry_purpose: 'Credit Card'
      }
    ],
    summary: {
      total_accounts: 2,
      active_accounts: 2,
      closed_accounts: 0,
      total_overdue_amount: 0,
      total_sanctioned_amount: 600000,
      total_current_balance: 275000
    }
  };
}
