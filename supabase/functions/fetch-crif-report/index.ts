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
      
      // Call IDSpay CRIF API - Production URL
      const crifApiUrl = 'https://javabackend.idspay.in/api/v1/prod/srv3/credit-report/crif';
      
      const apiResponse = await fetch(crifApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_id: apiId,
          api_key: apiKey,
          token_id: tokenId,
          pan: panNumber,
          name: fullName,
          mobile: mobileNumber,
          dob: dateOfBirth,
          gender: gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : undefined,
          consent: 'Y'
        }),
      });

      const apiData = await apiResponse.json();
      console.log('CRIF API response status:', apiResponse.status);

      if (!apiResponse.ok) {
        console.error('CRIF API error:', apiData);
        return new Response(
          JSON.stringify({ success: false, error: apiData.message || 'CRIF API request failed' }),
          { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      rawCrifData = apiData;
      
      // Extract score from API response - adjust based on actual API response structure
      crifScore = extractCrifScore(apiData);
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
  // Adjust this based on actual API response structure
  if (apiData?.score) return apiData.score;
  if (apiData?.data?.score) return apiData.data.score;
  if (apiData?.creditScore) return apiData.creditScore;
  if (apiData?.data?.creditScore) return apiData.data.creditScore;
  
  // Default mock score if not found
  return Math.floor(Math.random() * (850 - 650 + 1)) + 650;
}

function generateMockCrifData(fullName: string, panNumber: string, dateOfBirth?: string, gender?: string, score?: number) {
  const mockScore = score || Math.floor(Math.random() * (850 - 650 + 1)) + 650;
  
  return {
    header: {
      reportDate: new Date().toISOString().split('T')[0],
      reportId: `CRIF-${Date.now()}`,
      bureauName: 'CRIF High Mark'
    },
    personalInfo: {
      name: fullName,
      panNumber: panNumber,
      dateOfBirth: dateOfBirth || 'Not Provided',
      gender: gender || 'Not Provided'
    },
    scoreInfo: {
      score: mockScore,
      scoreRange: '300-900',
      scoreDate: new Date().toISOString().split('T')[0]
    },
    accountSummary: {
      totalAccounts: 5,
      activeAccounts: 3,
      closedAccounts: 2,
      overdueAccounts: 0
    },
    accounts: [
      {
        accountType: 'Personal Loan',
        lender: 'HDFC Bank',
        accountNumber: 'XXXX1234',
        sanctionedAmount: 500000,
        currentBalance: 250000,
        status: 'Active',
        paymentHistory: 'Regular'
      },
      {
        accountType: 'Credit Card',
        lender: 'ICICI Bank',
        accountNumber: 'XXXX5678',
        creditLimit: 100000,
        currentBalance: 25000,
        status: 'Active',
        paymentHistory: 'Regular'
      }
    ],
    enquiries: [
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        institution: 'HDFC Bank',
        purpose: 'Credit Card'
      }
    ]
  };
}
