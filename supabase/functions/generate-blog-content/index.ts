import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, slug } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating content for title:", title, "slug:", slug);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional content writer. Generate concise, engaging content. Respond ONLY with valid JSON, no markdown formatting.",
          },
          {
            role: "user",
            content: `For the blog title "${title}", generate:
1. A SHORT blog content (exactly 50 words, simple, tight, direct)
2. Related search suggestions (1-6 items, each exactly 5 words)

Respond in this exact JSON format:
{
  "content": "Your 50 word blog content here...",
  "relatedSearches": ["Five word search term one", "Five word search term two", "Five word search term three"]
}

Generate 4-6 related search suggestions that are relevant to the title.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const rawContent = data.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error("No content generated");
    }

    // Parse the JSON response
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      const cleanContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", rawContent);
      // Fallback: return raw content as blog content
      return new Response(
        JSON.stringify({ content: rawContent, relatedSearches: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        content: parsedContent.content || rawContent,
        relatedSearches: parsedContent.relatedSearches || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating blog content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
