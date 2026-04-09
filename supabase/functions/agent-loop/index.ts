import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
    userId: string;
    message: string;
    conversationId?: string;
}

/**
 * Agent Loop Edge Function
 * Handles multi-step reasoning and tool chaining for complex user queries.
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, message, conversationId }: RequestPayload = await req.json();

    if (!userId || !message) {
      throw new Error("Missing required fields: userId and message");
    }

    // 1. Retrieve Secret & Context
    const { data: conn } = await supabaseClient
      .from("user_connections")
      .select("refresh_token")
      .eq("user_id", userId)
      .eq("provider", "gemini")
      .maybeSingle();

    const apiKey = conn?.refresh_token || Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          handled: false, 
          error: "Gemini API key not configured for user.",
          intent: "redirect_setup"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch Memory (Conversation + Episodic)
    const [{ data: history }, { data: episodes }] = await Promise.all([
      supabaseClient
        .from("conversation_memory")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseClient
        .from("episodic_memory")
        .select("episode_type, summary, details, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    // 3. Construct Intelligent Prompt
    const systemPrompt = `You are the OS Bot Agent Loop. You handle complex, multi-step real estate CRM tasks.
Your goal is to decompose the user's request into a plan of sequential tool calls.

AVAILABLE TOOLS:
1. create_lead: { name: string, phone?: string, email?: string, propertyAddress?: string, notes?: string }
2. create_task: { title: string, priority: "low"|"medium"|"high"|"urgent", dueDate?: string }
3. send_sms: { to: string (name or phone), message: string }
4. update_lead: { leadId: string, status?: string, ...fields }
5. navigate: { path: string }

RESPONSE FORMAT (Strict JSON):
{
  "handled": true,
  "reasoning": "Explain your sequential plan clearly.",
  "toolCalls": [
    { "toolName": "name", "params": { ... } }
  ]
}

If the request is simple and doesn't need multi-step planning, set "handled": false.`;

    const userPrompt = `
User ID: ${userId}
Message: "${message}"

Recent History:
${JSON.stringify(history?.reverse())}

Recent Episodic Outcomes:
${JSON.stringify(episodes)}

Analyze the message and return the JSON plan.`;

    // 4. Call Gemini 2.0 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      }
    );

    if (!geminiRes.ok) {
        const err = await geminiRes.text();
        throw new Error(`Gemini API Error: ${err}`);
    }

    const geminiData = await geminiRes.json();
    const textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) throw new Error("Empty response from AI");

    const parsedResult = JSON.parse(textResult);

    // 5. Build Final Response
    return new Response(
      JSON.stringify({
        ...parsedResult,
        context: {
          historyCount: history?.length || 0,
          episodeCount: episodes?.length || 0,
          model: "gemini-2.0-flash"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Agent Loop Error (Detailed):", {
      message: error.message,
      stack: error.stack,
      userId
    });
    return new Response(
      JSON.stringify({ 
        handled: false, 
        error: error.message,
        details: "Check Edge Function logs for stack trace."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
