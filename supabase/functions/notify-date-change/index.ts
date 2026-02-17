import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DateChangeRequest {
  workOrderId: string;
  title: string;
  oldDate: string;
  newDate: string;
  reason: string;
  department: string;
  requestorName: string;
  requestorEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dateChangeData: DateChangeRequest = await req.json();
    
    console.log('Received date change notification:', dateChangeData);

    // Send webhook notification to n8n
    const webhookUrl = 'https://treymccormick.app.n8n.cloud/webhook/7d719d86-449c-4494-8dbb-a1de582b4179';
    
    const webhookPayload = {
      event: 'work_request_date_changed',
      timestamp: new Date().toISOString(),
      data: {
        work_order_id: dateChangeData.workOrderId,
        title: dateChangeData.title,
        old_date: dateChangeData.oldDate,
        new_date: dateChangeData.newDate,
        reason: dateChangeData.reason,
        department: dateChangeData.department,
        requestor_name: dateChangeData.requestorName,
        requestor_email: dateChangeData.requestorEmail,
        changed_at: new Date().toISOString()
      }
    };

    console.log('Sending webhook payload:', webhookPayload);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('Webhook response status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      console.error('Webhook call failed:', await webhookResponse.text());
      throw new Error(`Webhook call failed with status: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Date change notification sent successfully',
      webhookResponse: webhookResult 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in notify-date-change function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);