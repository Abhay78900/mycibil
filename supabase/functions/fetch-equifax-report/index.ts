import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EquifaxRequest {
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

  const startTime = Date.now();
  let supabase: any;
  let userId: string | null = null;
  let partnerId: string | null = null;

  try {
    const { reportId, fullName, panNumber, mobileNumber, dateOfBirth, gender } = await req.json() as EquifaxRequest;
    const requestPayload = { reportId, fullName, panNumber: panNumber?.substring(0, 5) + '***', mobileNumber: mobileNumber?.substring(0, 5) + '***', dateOfBirth, gender };

    console.log('[EQUIFAX] Request received:', requestPayload);

    if (!reportId || !fullName || !panNumber || !mobileNumber) {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Equifax authentication failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get report details for user_id and partner_id
    const { data: reportInfo } = await supabase
      .from('credit_reports')
      .select('user_id, partner_id')
      .eq('id', reportId)
      .single();

    userId = reportInfo?.user_id;
    partnerId = reportInfo?.partner_id;

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

    let equifaxScore: number;
    let rawEquifaxData: any;

    if (isSandboxMode) {
      console.log('[EQUIFAX] Sandbox mode - generating mock data');
      equifaxScore = Math.floor(Math.random() * (850 - 650 + 1)) + 650;
      rawEquifaxData = generateMockEquifaxData(fullName, normalizedPan, dateOfBirth, gender, equifaxScore);

      if (userId) {
        await logBureauApiCall(supabase, {
          reportId, userId, partnerId,
          bureauCode: 'equifax', bureauName: 'Equifax',
          requestPayload, responseJson: rawEquifaxData,
          responseStatus: 200, isSandbox: true,
          errorMessage: null, processingTimeMs: Date.now() - startTime
        });
      }
    } else {
      const equifaxApiUrl = apiEnvironment === 'production'
        ? 'https://javabackend.idspay.in/api/v1/prod/srv3/credit-report/equifax'
        : 'https://javabackend.idspay.in/api/v1/uat/srv3/credit-report/equifax';

      console.log(`[EQUIFAX] Calling API: ${equifaxApiUrl}`);

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
        const apiResponse = await fetch(equifaxApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const responseText = await apiResponse.text();

        if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
          console.error('[EQUIFAX] HTML error page received');
          await logBureauApiCall(supabase, {
            reportId, userId: userId!, partnerId,
            bureauCode: 'equifax', bureauName: 'Equifax',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: { error: 'HTML error page' }, responseStatus: 502,
            isSandbox: false, errorMessage: 'Equifax service unavailable',
            processingTimeMs: Date.now() - startTime
          });
          return new Response(
            JSON.stringify({ success: false, error: 'Equifax service unavailable' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let apiData: any;
        try {
          apiData = JSON.parse(responseText);
        } catch {
          await logBureauApiCall(supabase, {
            reportId, userId: userId!, partnerId,
            bureauCode: 'equifax', bureauName: 'Equifax',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: { raw_text: responseText.substring(0, 1000) }, responseStatus: 502,
            isSandbox: false, errorMessage: 'Invalid JSON response',
            processingTimeMs: Date.now() - startTime
          });
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid Equifax response' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!apiResponse.ok || apiData.status === 'error' || apiData.success === false) {
          await logBureauApiCall(supabase, {
            reportId, userId: userId!, partnerId,
            bureauCode: 'equifax', bureauName: 'Equifax',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: apiData, responseStatus: apiResponse.status,
            isSandbox: false, errorMessage: apiData.message || 'Equifax API failed',
            processingTimeMs: Date.now() - startTime
          });
          return new Response(
            JSON.stringify({ success: false, error: apiData.message || 'Equifax API failed' }),
            { status: apiResponse.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        equifaxScore = extractEquifaxScore(apiData);
        rawEquifaxData = transformEquifaxToUnifiedReport(apiData, {
          bureauName: 'Equifax', reportId, fullName,
          panNumber: normalizedPan, dateOfBirth, gender,
        });

        await logBureauApiCall(supabase, {
          reportId, userId: userId!, partnerId,
          bureauCode: 'equifax', bureauName: 'Equifax',
          requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
          responseJson: apiData, responseStatus: 200,
          isSandbox: false, errorMessage: null,
          processingTimeMs: Date.now() - startTime
        });
      } catch (fetchError: any) {
        console.error('[EQUIFAX] Fetch error:', fetchError);
        await logBureauApiCall(supabase, {
          reportId, userId: userId!, partnerId,
          bureauCode: 'equifax', bureauName: 'Equifax',
          requestPayload: { api_key: '[REDACTED]', token_id: '[REDACTED]' },
          responseJson: null, responseStatus: 503,
          isSandbox: false, errorMessage: fetchError.message,
          processingTimeMs: Date.now() - startTime
        });
        return new Response(
          JSON.stringify({ success: false, error: `Equifax service unavailable: ${fetchError.message}` }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('credit_reports')
      .update({
        equifax_score: equifaxScore,
        raw_equifax_data: rawEquifaxData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('[EQUIFAX] DB update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save Equifax report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recalculateAverageScore(supabase, reportId);

    console.log('[EQUIFAX] Report saved:', { reportId, score: equifaxScore });

    return new Response(
      JSON.stringify({
        success: true,
        data: { score: equifaxScore, rawData: rawEquifaxData, isSandbox: isSandboxMode }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[EQUIFAX] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logBureauApiCall(supabase: any, params: {
  reportId: string; userId: string; partnerId: string | null;
  bureauCode: string; bureauName: string; requestPayload: any;
  responseJson: any; responseStatus: number; isSandbox: boolean;
  errorMessage: string | null; processingTimeMs: number;
}) {
  try {
    await supabase.from('bureau_api_logs').insert({
      report_id: params.reportId, user_id: params.userId, partner_id: params.partnerId,
      bureau_code: params.bureauCode, bureau_name: params.bureauName,
      request_payload: params.requestPayload, response_json: params.responseJson,
      response_status: params.responseStatus, is_sandbox: params.isSandbox,
      error_message: params.errorMessage, processing_time_ms: params.processingTimeMs
    });
    console.log(`[${params.bureauCode.toUpperCase()}] API call logged`);
  } catch (logError) {
    console.error(`[${params.bureauCode.toUpperCase()}] Failed to log:`, logError);
  }
}

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

function extractEquifaxScore(apiData: any): number {
  const score = apiData?.score || apiData?.data?.score || apiData?.ScoreValue || apiData?.data?.ScoreValue;
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

function transformEquifaxToUnifiedReport(apiData: any, ctx: any) {
  const data = apiData?.data ?? apiData ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const accountsRaw = ensureArray<any>(data?.accounts || data?.TradeAccounts || []);
  const accounts = accountsRaw.map((acc: any) => ({
    member_name: String(acc?.subscriber || acc?.MemberName || 'Not Reported'),
    account_type: String(acc?.account_type || acc?.AccountType || 'Not Reported'),
    account_number: String(acc?.account_number || acc?.AccountNumber || '---'),
    ownership: String(acc?.ownership || 'Individual'),
    credit_limit: String(acc?.credit_limit || '-'),
    sanctioned_amount: String(acc?.high_credit || acc?.SanctionedAmount || '-'),
    current_balance: String(acc?.balance || acc?.CurrentBalance || '-'),
    cash_limit: '-',
    amount_overdue: String(acc?.past_due || acc?.AmountOverdue || '0'),
    rate_of_interest: '-',
    repayment_tenure: '-',
    emi_amount: '-',
    payment_frequency: 'Monthly',
    actual_payment_amount: '-',
    dates: {
      date_opened: normalizeDateStr(acc?.open_date),
      date_closed: acc?.close_date ? normalizeDateStr(acc?.close_date) : null,
      date_of_last_payment: null,
      date_reported: normalizeDateStr(acc?.report_date) || today,
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

  const enquiriesRaw = ensureArray<any>(data?.enquiries || data?.Inquiries || []);
  const enquiries = enquiriesRaw.map((e: any) => ({
    member_name: String(e?.subscriber || e?.MemberName || 'Not Reported'),
    date_of_enquiry: normalizeDateStr(e?.inquiry_date || e?.InquiryDate) || '---',
    enquiry_purpose: String(e?.type || e?.Purpose || 'Not Reported'),
  }));

  return {
    header: {
      bureau_name: ctx.bureauName,
      control_number: String(data?.report_number || ctx.reportId),
      report_date: today,
      credit_score: extractEquifaxScore(apiData),
    },
    personal_information: {
      full_name: ctx.fullName.toUpperCase(),
      date_of_birth: normalizeDateStr(ctx.dateOfBirth) || '---',
      gender: ctx.gender || 'Not Reported',
      identifications: [{ type: 'INCOME TAX ID NUMBER (PAN)', number: ctx.panNumber, issue_date: null, expiration_date: null }]
    },
    contact_information: { addresses: [], phone_numbers: [], email_addresses: [] },
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

function generateMockEquifaxData(fullName: string, panNumber: string, dateOfBirth?: string, gender?: string, score?: number) {
  const mockScore = score || Math.floor(Math.random() * (850 - 650 + 1)) + 650;
  const today = new Date().toISOString().slice(0, 10);

  return {
    header: {
      bureau_name: 'Equifax',
      control_number: `EQX-${Date.now()}`,
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
      member_name: 'KOTAK MAHINDRA BANK',
      account_type: 'Auto Loan',
      ownership: 'Individual',
      account_number: 'XXXX3456',
      credit_limit: '-',
      sanctioned_amount: '8,00,000',
      current_balance: '4,50,000',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '-',
      repayment_tenure: '-',
      emi_amount: '-',
      payment_frequency: 'Monthly',
      actual_payment_amount: '-',
      dates: { date_opened: '2022-08-10', date_closed: null, date_of_last_payment: today, date_reported: today },
      payment_start_date: '2022-08-10',
      payment_end_date: today,
      payment_history: [],
      collateral: { value: '-', type: '-', suit_filed: '-', credit_facility_status: 'Active', written_off_total: '-', written_off_principal: '-', settlement_amount: '-' }
    }],
    enquiries: [{ member_name: 'TATA CAPITAL', date_of_enquiry: today, enquiry_purpose: 'Consumer Loan' }],
    summary: { total_accounts: 1, active_accounts: 1, closed_accounts: 0, total_overdue_amount: 0, total_sanctioned_amount: 800000, total_current_balance: 450000 },
    _raw: { mock: true, generated_at: today }
  };
}
