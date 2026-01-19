import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExperianRequest {
  reportId: string;
  fullName: string;
  panNumber: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function validatePan(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase());
}

function validateMobile(mobile: string): boolean {
  return /^\d{10}$/.test(mobile.replace(/\s+/g, ''));
}

function validateDob(dob: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dob);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, fullName, panNumber, mobileNumber, dateOfBirth, gender } = await req.json() as ExperianRequest;

    console.log('[EXPERIAN] Request received:', { reportId, fullName, panNumber: panNumber?.substring(0, 5) + '***' });

    // Validate required fields
    if (!reportId || !fullName || !panNumber || !mobileNumber) {
      console.error('[EXPERIAN] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing mandatory fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPan = panNumber.toUpperCase().trim();
    if (!validatePan(normalizedPan)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PAN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanMobile = mobileNumber.replace(/\s+/g, '');
    if (!validateMobile(cleanMobile)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mobile number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dateOfBirth && !validateDob(dateOfBirth)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid DOB format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiId = Deno.env.get('IDSPAY_API_ID');
    const apiKey = Deno.env.get('IDSPAY_API_KEY');
    const tokenId = Deno.env.get('IDSPAY_TOKEN_ID');

    if (!apiId || !apiKey || !tokenId) {
      console.error('[EXPERIAN] Missing credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Experian authentication failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sandboxSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sandbox_mode')
      .maybeSingle();

    const { data: apiEnvSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_environment')
      .maybeSingle();

    const isSandboxMode = sandboxSetting?.value?.enabled ?? true;
    const apiEnvironment = apiEnvSetting?.value?.environment ?? 'uat';

    let experianScore: number;
    let rawExperianData: any;

    if (isSandboxMode) {
      console.log('[EXPERIAN] Sandbox mode - generating mock data');
      experianScore = Math.floor(Math.random() * (850 - 650 + 1)) + 650;
      rawExperianData = generateMockExperianData(fullName, normalizedPan, dateOfBirth, gender, experianScore);
    } else {
      const experianApiUrl = apiEnvironment === 'production'
        ? 'https://javabackend.idspay.in/api/v1/prod/srv3/credit-report/experian'
        : 'https://javabackend.idspay.in/api/v1/uat/srv3/credit-report/experian';

      console.log(`[EXPERIAN] Calling API: ${experianApiUrl}`);

      const requestBody = {
        api_id: apiId,
        api_key: apiKey,
        token_id: tokenId,
        pan: normalizedPan,
        name: fullName.trim(),
        mobile: cleanMobile,
        dob: dateOfBirth || undefined,
        gender: gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : undefined,
        consent: 'Y'
      };

      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof typeof requestBody] === undefined) {
          delete requestBody[key as keyof typeof requestBody];
        }
      });

      try {
        const apiResponse = await fetch(experianApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const responseText = await apiResponse.text();

        if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
          console.error('[EXPERIAN] HTML error page received');
          return new Response(
            JSON.stringify({ success: false, error: 'Experian service unavailable' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let apiData: any;
        try {
          apiData = JSON.parse(responseText);
        } catch {
          console.error('[EXPERIAN] Invalid JSON response');
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid Experian response' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!apiResponse.ok || apiData.status === 'error' || apiData.success === false) {
          return new Response(
            JSON.stringify({ success: false, error: apiData.message || 'Experian API failed' }),
            { status: apiResponse.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        experianScore = extractExperianScore(apiData);
        rawExperianData = transformExperianToUnifiedReport(apiData, {
          bureauName: 'Experian',
          reportId,
          fullName,
          panNumber: normalizedPan,
          dateOfBirth,
          gender,
        });
      } catch (fetchError: any) {
        console.error('[EXPERIAN] Fetch error:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: `Experian service unavailable: ${fetchError.message}` }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('credit_reports')
      .update({
        experian_score: experianScore,
        raw_experian_data: rawExperianData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('[EXPERIAN] DB update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save Experian report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recalculateAverageScore(supabase, reportId);

    console.log('[EXPERIAN] Report saved:', { reportId, score: experianScore });

    return new Response(
      JSON.stringify({
        success: true,
        data: { score: experianScore, rawData: rawExperianData, isSandbox: isSandboxMode }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[EXPERIAN] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function recalculateAverageScore(supabase: any, reportId: string) {
  const { data: report } = await supabase
    .from('credit_reports')
    .select('cibil_score, experian_score, equifax_score, crif_score')
    .eq('id', reportId)
    .single();

  if (report) {
    const scores = [report.cibil_score, report.experian_score, report.equifax_score, report.crif_score]
      .filter(s => s !== null) as number[];
    if (scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      await supabase.from('credit_reports').update({ average_score: avg }).eq('id', reportId);
    }
  }
}

function extractExperianScore(apiData: any): number {
  const score = apiData?.score || apiData?.data?.score || apiData?.EXP_SCORE || apiData?.data?.EXP_SCORE;
  if (score) return Number(String(score).replace(/,/g, ''));
  return Math.floor(Math.random() * (850 - 650 + 1)) + 650;
}

function normalizeDateStr(input?: string | null): string {
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

function transformExperianToUnifiedReport(apiData: any, ctx: any) {
  const data = apiData?.data ?? apiData ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const accountsRaw = ensureArray<any>(data?.accounts || data?.ACCOUNTS || []);
  const accounts = accountsRaw.map((acc: any) => ({
    member_name: String(acc?.member || acc?.MEMBER_NAME || 'Not Reported'),
    account_type: String(acc?.type || acc?.ACCOUNT_TYPE || 'Not Reported'),
    account_number: String(acc?.account_no || acc?.ACCOUNT_NUMBER || '---'),
    ownership: String(acc?.ownership || 'Individual'),
    credit_limit: String(acc?.credit_limit || '-'),
    sanctioned_amount: String(acc?.sanctioned || acc?.HIGH_CREDIT || '-'),
    current_balance: String(acc?.balance || acc?.CURRENT_BALANCE || '-'),
    cash_limit: '-',
    amount_overdue: String(acc?.overdue || acc?.AMOUNT_OVERDUE || '0'),
    rate_of_interest: '-',
    repayment_tenure: '-',
    emi_amount: '-',
    payment_frequency: 'Monthly',
    actual_payment_amount: '-',
    dates: {
      date_opened: normalizeDateStr(acc?.opened_date),
      date_closed: acc?.closed_date ? normalizeDateStr(acc?.closed_date) : null,
      date_of_last_payment: null,
      date_reported: normalizeDateStr(acc?.reported_date) || today,
    },
    payment_start_date: '-',
    payment_end_date: today,
    payment_history: [],
    collateral: {
      value: '-', type: '-', suit_filed: '-',
      credit_facility_status: String(acc?.status || '-'),
      written_off_total: '-', written_off_principal: '-', settlement_amount: '-'
    },
  }));

  const enquiriesRaw = ensureArray<any>(data?.enquiries || data?.ENQUIRIES || []);
  const enquiries = enquiriesRaw.map((e: any) => ({
    member_name: String(e?.member || e?.MEMBER_NAME || 'Not Reported'),
    date_of_enquiry: normalizeDateStr(e?.date || e?.ENQUIRY_DATE) || '---',
    enquiry_purpose: String(e?.purpose || e?.PURPOSE || 'Not Reported'),
  }));

  return {
    header: {
      bureau_name: ctx.bureauName,
      control_number: String(data?.report_id || ctx.reportId),
      report_date: today,
      credit_score: extractExperianScore(apiData),
    },
    personal_information: {
      full_name: ctx.fullName.toUpperCase(),
      date_of_birth: normalizeDateStr(ctx.dateOfBirth) || '---',
      gender: ctx.gender || 'Not Reported',
      identifications: [{ type: 'INCOME TAX ID NUMBER (PAN)', number: ctx.panNumber, issue_date: null, expiration_date: null }]
    },
    contact_information: {
      addresses: [],
      phone_numbers: [],
      email_addresses: [],
    },
    employment_information: [],
    accounts,
    enquiries,
    summary: {
      total_accounts: accounts.length,
      active_accounts: accounts.filter((a: any) => !a.dates.date_closed).length,
      closed_accounts: accounts.filter((a: any) => a.dates.date_closed).length,
      total_overdue_amount: accounts.reduce((s: number, a: any) => s + toNum(a.amount_overdue), 0),
      total_sanctioned_amount: accounts.reduce((s: number, a: any) => s + toNum(a.sanctioned_amount), 0),
      total_current_balance: accounts.reduce((s: number, a: any) => s + toNum(a.current_balance), 0),
    },
    _raw: apiData
  };
}

function generateMockExperianData(fullName: string, panNumber: string, dateOfBirth?: string, gender?: string, score?: number) {
  const mockScore = score || Math.floor(Math.random() * (850 - 650 + 1)) + 650;
  const today = new Date().toISOString().slice(0, 10);

  return {
    header: {
      bureau_name: 'Experian',
      control_number: `EXP-${Date.now()}`,
      report_date: today,
      credit_score: mockScore
    },
    personal_information: {
      full_name: fullName.toUpperCase(),
      date_of_birth: dateOfBirth || '---',
      gender: gender || 'Not Reported',
      identifications: [{ type: 'INCOME TAX ID NUMBER (PAN)', number: panNumber, issue_date: null, expiration_date: null }]
    },
    contact_information: { addresses: [], phone_numbers: [], email_addresses: [] },
    employment_information: [],
    accounts: [{
      member_name: 'AXIS BANK',
      account_type: 'Credit Card',
      ownership: 'Individual',
      account_number: 'XXXX9012',
      credit_limit: '2,00,000',
      sanctioned_amount: '-',
      current_balance: '45,000',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '-',
      repayment_tenure: '-',
      emi_amount: '-',
      payment_frequency: 'Monthly',
      actual_payment_amount: '-',
      dates: { date_opened: '2021-01-15', date_closed: null, date_of_last_payment: today, date_reported: today },
      payment_start_date: '2021-01-15',
      payment_end_date: today,
      payment_history: [],
      collateral: { value: '-', type: '-', suit_filed: '-', credit_facility_status: 'Active', written_off_total: '-', written_off_principal: '-', settlement_amount: '-' }
    }],
    enquiries: [{ member_name: 'BAJAJ FINANCE', date_of_enquiry: today, enquiry_purpose: 'Personal Loan' }],
    summary: { total_accounts: 1, active_accounts: 1, closed_accounts: 0, total_overdue_amount: 0, total_sanctioned_amount: 0, total_current_balance: 45000 },
    _raw: { mock: true, generated_at: today }
  };
}
