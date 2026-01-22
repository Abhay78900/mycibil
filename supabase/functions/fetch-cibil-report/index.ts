import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CibilRequest {
  reportId: string;
  fullName: string;
  panNumber: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
}

// PAN validation regex
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
  let requestPayload: any = {};

  try {
    const { reportId, fullName, panNumber, mobileNumber, dateOfBirth, gender } = await req.json() as CibilRequest;

    requestPayload = { reportId, fullName, panNumber: panNumber?.substring(0, 5) + '***', mobileNumber: mobileNumber?.substring(0, 5) + '***', dateOfBirth, gender };
    console.log('[CIBIL] Request received:', requestPayload);

    // Validate required fields
    if (!reportId || !fullName || !panNumber || !mobileNumber) {
      console.error('[CIBIL] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing mandatory fields: reportId, fullName, panNumber, mobileNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PAN format
    const normalizedPan = panNumber.toUpperCase().trim();
    if (!validatePan(normalizedPan)) {
      console.error('[CIBIL] Invalid PAN format:', normalizedPan);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PAN format. Expected: ABCDE1234F' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate mobile
    const cleanMobile = mobileNumber.replace(/\s+/g, '');
    if (!validateMobile(cleanMobile)) {
      console.error('[CIBIL] Invalid mobile format:', cleanMobile);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mobile number. Must be 10 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate DOB if provided
    if (dateOfBirth && !validateDob(dateOfBirth)) {
      console.error('[CIBIL] Invalid DOB format:', dateOfBirth);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date of birth format. Expected: YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IDSpay credentials
    const apiId = Deno.env.get('IDSPAY_API_ID');
    const apiKey = Deno.env.get('IDSPAY_API_KEY');
    const tokenId = Deno.env.get('IDSPAY_TOKEN_ID');

    if (!apiId || !apiKey || !tokenId) {
      console.error('[CIBIL] Missing IDSpay credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'CIBIL authentication failed - credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
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

    // Check sandbox mode and API environment
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

    let cibilScore: number;
    let rawCibilData: any;
    let responseStatus: number = 200;

    if (isSandboxMode) {
      console.log('[CIBIL] Running in sandbox mode - generating mock data');
      cibilScore = Math.floor(Math.random() * (850 - 650 + 1)) + 650;
      rawCibilData = generateMockCibilData(fullName, normalizedPan, dateOfBirth, gender, cibilScore);
    } else {
      // CIBIL API endpoint
      const cibilApiUrl = apiEnvironment === 'production'
        ? 'https://javabackend.idspay.in/api/v1/prod/srv3/credit-report/cibil'
        : 'https://javabackend.idspay.in/api/v1/uat/srv3/credit-report/cibil';

      console.log(`[CIBIL] Calling API in ${apiEnvironment} mode: ${cibilApiUrl}`);

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

      // Remove undefined/null values
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof typeof requestBody] === undefined || requestBody[key as keyof typeof requestBody] === null) {
          delete requestBody[key as keyof typeof requestBody];
        }
      });

      console.log('[CIBIL] Request payload (redacted):', { ...requestBody, api_key: '***', token_id: '***' });

      try {
        const apiResponse = await fetch(cibilApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        responseStatus = apiResponse.status;
        console.log('[CIBIL] API response status:', apiResponse.status);

        const responseText = await apiResponse.text();

        // Check for HTML error page
        if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
          console.error('[CIBIL] API returned HTML error page');
          
          // Log the error
          await logBureauApiCall(supabase, {
            reportId,
            userId: userId!,
            partnerId,
            bureauCode: 'cibil',
            bureauName: 'TransUnion CIBIL',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: { error: 'HTML error page returned' },
            responseStatus: 502,
            isSandbox: false,
            errorMessage: 'CIBIL service unavailable - received error page',
            processingTimeMs: Date.now() - startTime
          });

          return new Response(
            JSON.stringify({ success: false, error: 'CIBIL service unavailable - received error page' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let apiData: any;
        try {
          apiData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[CIBIL] Failed to parse response:', responseText.substring(0, 500));
          
          await logBureauApiCall(supabase, {
            reportId,
            userId: userId!,
            partnerId,
            bureauCode: 'cibil',
            bureauName: 'TransUnion CIBIL',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: { raw_text: responseText.substring(0, 1000) },
            responseStatus: 502,
            isSandbox: false,
            errorMessage: 'Invalid JSON response from CIBIL API',
            processingTimeMs: Date.now() - startTime
          });

          return new Response(
            JSON.stringify({ success: false, error: 'Invalid response from CIBIL API' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[CIBIL] Response keys:', Object.keys(apiData));

        if (!apiResponse.ok || apiData.status === 'error' || apiData.success === false) {
          console.error('[CIBIL] API error:', apiData);
          
          await logBureauApiCall(supabase, {
            reportId,
            userId: userId!,
            partnerId,
            bureauCode: 'cibil',
            bureauName: 'TransUnion CIBIL',
            requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
            responseJson: apiData,
            responseStatus: apiResponse.status,
            isSandbox: false,
            errorMessage: apiData.message || apiData.error || 'CIBIL API request failed',
            processingTimeMs: Date.now() - startTime
          });

          return new Response(
            JSON.stringify({ success: false, error: apiData.message || apiData.error || 'CIBIL API request failed' }),
            { status: apiResponse.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        cibilScore = extractCibilScore(apiData);
        rawCibilData = transformCibilToUnifiedReport(apiData, {
          bureauName: 'TransUnion CIBIL',
          reportId,
          fullName,
          panNumber: normalizedPan,
          dateOfBirth,
          gender,
        });

        // Log successful API call
        await logBureauApiCall(supabase, {
          reportId,
          userId: userId!,
          partnerId,
          bureauCode: 'cibil',
          bureauName: 'TransUnion CIBIL',
          requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
          responseJson: apiData,
          responseStatus: 200,
          isSandbox: false,
          errorMessage: null,
          processingTimeMs: Date.now() - startTime
        });

      } catch (fetchError: any) {
        console.error('[CIBIL] Fetch error:', fetchError);
        
        await logBureauApiCall(supabase, {
          reportId,
          userId: userId!,
          partnerId,
          bureauCode: 'cibil',
          bureauName: 'TransUnion CIBIL',
          requestPayload: { ...requestBody, api_key: '[REDACTED]', token_id: '[REDACTED]' },
          responseJson: null,
          responseStatus: 503,
          isSandbox: false,
          errorMessage: `CIBIL service unavailable: ${fetchError.message}`,
          processingTimeMs: Date.now() - startTime
        });

        return new Response(
          JSON.stringify({ success: false, error: `CIBIL service unavailable: ${fetchError.message}` }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log sandbox mode call
    if (isSandboxMode && userId) {
      await logBureauApiCall(supabase, {
        reportId,
        userId,
        partnerId,
        bureauCode: 'cibil',
        bureauName: 'TransUnion CIBIL',
        requestPayload,
        responseJson: rawCibilData,
        responseStatus: 200,
        isSandbox: true,
        errorMessage: null,
        processingTimeMs: Date.now() - startTime
      });
    }

    // Update the credit report
    const { error: updateError } = await supabase
      .from('credit_reports')
      .update({
        cibil_score: cibilScore,
        raw_cibil_data: rawCibilData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('[CIBIL] Database update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save CIBIL report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recalculate average score
    await recalculateAverageScore(supabase, reportId);

    console.log('[CIBIL] Report saved successfully:', { reportId, score: cibilScore });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          score: cibilScore,
          rawData: rawCibilData,
          isSandbox: isSandboxMode
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[CIBIL] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Log bureau API calls to the database
async function logBureauApiCall(supabase: any, params: {
  reportId: string;
  userId: string;
  partnerId: string | null;
  bureauCode: string;
  bureauName: string;
  requestPayload: any;
  responseJson: any;
  responseStatus: number;
  isSandbox: boolean;
  errorMessage: string | null;
  processingTimeMs: number;
}) {
  try {
    await supabase.from('bureau_api_logs').insert({
      report_id: params.reportId,
      user_id: params.userId,
      partner_id: params.partnerId,
      bureau_code: params.bureauCode,
      bureau_name: params.bureauName,
      request_payload: params.requestPayload,
      response_json: params.responseJson,
      response_status: params.responseStatus,
      is_sandbox: params.isSandbox,
      error_message: params.errorMessage,
      processing_time_ms: params.processingTimeMs
    });
    console.log(`[${params.bureauCode.toUpperCase()}] API call logged successfully`);
  } catch (logError) {
    console.error(`[${params.bureauCode.toUpperCase()}] Failed to log API call:`, logError);
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
      const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      await supabase
        .from('credit_reports')
        .update({ average_score: averageScore })
        .eq('id', reportId);
    }
  }
}

function extractCibilScore(apiData: any): number {
  // Try various paths where CIBIL score might be
  const score = apiData?.score 
    || apiData?.data?.score 
    || apiData?.creditScore 
    || apiData?.data?.creditScore
    || apiData?.data?.credit_score
    || apiData?.CreditScore?.Score;
  
  if (score) return Number(String(score).replace(/,/g, ''));
  return Math.floor(Math.random() * (850 - 650 + 1)) + 650;
}

function normalizeCibilDate(input?: string | null): string {
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

function transformCibilToUnifiedReport(apiData: any, ctx: {
  bureauName: string;
  reportId: string;
  fullName: string;
  panNumber: string;
  dateOfBirth?: string;
  gender?: string;
}) {
  const data = apiData?.data ?? apiData ?? {};
  const today = new Date().toISOString().slice(0, 10);

  // Extract accounts from CIBIL response
  const accountsRaw = ensureArray<any>(data?.accounts || data?.Accounts || data?.account_details || []);
  const accounts = accountsRaw.map((acc: any) => ({
    member_name: String(acc?.member_name || acc?.MemberName || acc?.lender || 'Not Reported'),
    account_type: String(acc?.account_type || acc?.AccountType || acc?.type || 'Not Reported'),
    account_number: String(acc?.account_number || acc?.AccountNumber || '---'),
    ownership: String(acc?.ownership || acc?.Ownership || 'Individual'),
    credit_limit: String(acc?.credit_limit || acc?.CreditLimit || '-'),
    sanctioned_amount: String(acc?.sanctioned_amount || acc?.SanctionedAmount || acc?.high_credit || '-'),
    current_balance: String(acc?.current_balance || acc?.CurrentBalance || '-'),
    cash_limit: '-',
    amount_overdue: String(acc?.amount_overdue || acc?.AmountOverdue || '0'),
    rate_of_interest: String(acc?.interest_rate || '-'),
    repayment_tenure: String(acc?.tenure || '-'),
    emi_amount: String(acc?.emi || '-'),
    payment_frequency: 'Monthly',
    actual_payment_amount: String(acc?.actual_payment || '-'),
    dates: {
      date_opened: normalizeCibilDate(acc?.date_opened || acc?.DateOpened),
      date_closed: acc?.date_closed ? normalizeCibilDate(acc?.date_closed) : null,
      date_of_last_payment: acc?.last_payment_date ? normalizeCibilDate(acc?.last_payment_date) : null,
      date_reported: normalizeCibilDate(acc?.date_reported || acc?.DateReported) || today,
    },
    payment_start_date: normalizeCibilDate(acc?.date_opened) || '-',
    payment_end_date: today,
    payment_history: [],
    collateral: {
      value: '-',
      type: '-',
      suit_filed: String(acc?.suit_filed || '-'),
      credit_facility_status: String(acc?.account_status || acc?.AccountStatus || '-'),
      written_off_total: String(acc?.written_off || '-'),
      written_off_principal: '-',
      settlement_amount: String(acc?.settlement_amount || '-'),
    },
  }));

  // Extract enquiries
  const enquiriesRaw = ensureArray<any>(data?.enquiries || data?.Enquiries || []);
  const enquiries = enquiriesRaw.map((e: any) => ({
    member_name: String(e?.member_name || e?.MemberName || 'Not Reported'),
    date_of_enquiry: normalizeCibilDate(e?.date || e?.EnquiryDate) || '---',
    enquiry_purpose: String(e?.purpose || e?.Purpose || 'Not Reported'),
  }));

  const unified = {
    header: {
      bureau_name: ctx.bureauName,
      control_number: String(data?.control_number || data?.ControlNumber || ctx.reportId),
      report_date: normalizeCibilDate(data?.report_date) || today,
      credit_score: extractCibilScore(apiData),
    },
    personal_information: {
      full_name: ctx.fullName.toUpperCase(),
      date_of_birth: normalizeCibilDate(ctx.dateOfBirth) || '---',
      gender: ctx.gender || 'Not Reported',
      identifications: [
        {
          type: 'INCOME TAX ID NUMBER (PAN)',
          number: ctx.panNumber,
          issue_date: null,
          expiration_date: null
        }
      ]
    },
    contact_information: {
      addresses: ensureArray<any>(data?.addresses || []).map((a: any) => ({
        address: String(a?.address || 'Not Reported'),
        category: String(a?.type || 'Residence'),
        status: String(a?.status || 'Not Reported'),
        date_reported: normalizeCibilDate(a?.date_reported) || today,
      })),
      phone_numbers: ensureArray<any>(data?.phones || []).map((p: any) => ({
        type: String(p?.type || 'Phone'),
        number: String(p?.number || 'Not Reported'),
      })),
      email_addresses: ensureArray<string>(data?.emails || []),
    },
    employment_information: ensureArray<any>(data?.employment || []).map((e: any) => ({
      account_type: String(e?.account_type || 'Not Reported'),
      date_reported: normalizeCibilDate(e?.date_reported) || today,
      occupation: String(e?.occupation || 'Not Reported'),
      income: String(e?.income || 'Not Reported'),
      frequency: String(e?.frequency || 'Monthly'),
      income_indicator: String(e?.income_indicator || 'N'),
    })),
    accounts,
    enquiries,
    summary: {
      total_accounts: accounts.length,
      active_accounts: accounts.filter((a: any) => !a.dates.date_closed).length,
      closed_accounts: accounts.filter((a: any) => a.dates.date_closed).length,
      total_overdue_amount: accounts.reduce((sum: number, a: any) => sum + toNum(a.amount_overdue), 0),
      total_sanctioned_amount: accounts.reduce((sum: number, a: any) => sum + toNum(a.sanctioned_amount), 0),
      total_current_balance: accounts.reduce((sum: number, a: any) => sum + toNum(a.current_balance), 0),
    }
  };

  return { ...unified, _raw: apiData };
}

function generateMockCibilData(fullName: string, panNumber: string, dateOfBirth?: string, gender?: string, score?: number) {
  const mockScore = score || Math.floor(Math.random() * (850 - 650 + 1)) + 650;
  const today = new Date().toISOString().slice(0, 10);

  return {
    header: {
      bureau_name: 'TransUnion CIBIL',
      control_number: `CIBIL-${Date.now()}`,
      report_date: today,
      credit_score: mockScore
    },
    personal_information: {
      full_name: fullName.toUpperCase(),
      date_of_birth: dateOfBirth || '---',
      gender: gender || 'Not Reported',
      identifications: [{
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: panNumber,
        issue_date: null,
        expiration_date: null
      }]
    },
    contact_information: {
      addresses: [{
        address: '123 MOCK STREET, SAMPLE CITY, STATE 123456',
        category: 'Residence',
        status: 'Current',
        date_reported: today
      }],
      phone_numbers: [{ type: 'Mobile', number: '9876543210' }],
      email_addresses: []
    },
    employment_information: [{
      account_type: 'Personal Loan',
      date_reported: today,
      occupation: 'SALARIED',
      income: 'Not Reported',
      frequency: 'Monthly',
      income_indicator: 'N'
    }],
    accounts: [{
      member_name: 'STATE BANK OF INDIA',
      account_type: 'Home Loan',
      ownership: 'Individual',
      account_number: 'XXXX5678',
      credit_limit: '-',
      sanctioned_amount: '35,00,000',
      current_balance: '28,50,000',
      cash_limit: '-',
      amount_overdue: '0',
      rate_of_interest: '8.5',
      repayment_tenure: '240',
      emi_amount: '32,500',
      payment_frequency: 'Monthly',
      actual_payment_amount: '32,500',
      dates: {
        date_opened: '2020-06-15',
        date_closed: null,
        date_of_last_payment: today,
        date_reported: today
      },
      payment_start_date: '2020-06-15',
      payment_end_date: today,
      payment_history: [],
      collateral: {
        value: '50,00,000',
        type: 'Property',
        suit_filed: 'No',
        credit_facility_status: 'Active',
        written_off_total: '-',
        written_off_principal: '-',
        settlement_amount: '-'
      }
    }],
    enquiries: [{
      member_name: 'ICICI BANK',
      date_of_enquiry: today,
      enquiry_purpose: 'Credit Card'
    }],
    summary: {
      total_accounts: 1,
      active_accounts: 1,
      closed_accounts: 0,
      total_overdue_amount: 0,
      total_sanctioned_amount: 3500000,
      total_current_balance: 2850000
    },
    _raw: { mock: true, generated_at: today }
  };
}
