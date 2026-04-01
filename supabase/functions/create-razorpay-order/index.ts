import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, reportId, currency = "INR", userId } = await req.json();

    if (!amount || !reportId) {
      return new Response(
        JSON.stringify({ error: "amount and reportId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order on Razorpay
    const amountInPaise = Math.round(amount * 100);
    const orderPayload = {
      amount: amountInPaise,
      currency,
      receipt: reportId,
      notes: {
        report_id: reportId,
        user_id: userId || "",
      },
    };

    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const razorpayData = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay order creation failed:", razorpayData);
      return new Response(
        JSON.stringify({ error: "Failed to create Razorpay order", details: razorpayData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with razorpay order id
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("transactions")
      .update({
        payment_reference: razorpayData.id,
        payment_method: "razorpay",
        metadata: { razorpay_order_id: razorpayData.id },
      })
      .eq("report_id", reportId)
      .eq("status", "pending");

    return new Response(
      JSON.stringify({
        order_id: razorpayData.id,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        key_id: RAZORPAY_KEY_ID,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
