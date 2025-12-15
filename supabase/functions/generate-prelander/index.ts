import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webResultTitle, webResultDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating prelander for:', webResultTitle);

    const systemPrompt = `You are a marketing expert that creates compelling pre-landing page content. Generate content that is persuasive and encourages users to enter their email. Always respond in valid JSON format only.`;

    const userPrompt = `Create pre-landing page content for this web result:
Title: ${webResultTitle}
Description: ${webResultDescription || 'N/A'}

Generate a JSON object with these exact fields:
- headline_text: A compelling headline (max 10 words)
- description_text: Persuasive description encouraging email signup (max 30 words)
- button_text: Call-to-action button text (2-4 words)
- email_placeholder: Email field placeholder text

Respond with ONLY valid JSON, no markdown, no explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    console.log('Raw AI response:', content);

    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let generatedContent;
    try {
      generatedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback content
      generatedContent = {
        headline_text: `Unlock ${webResultTitle} Benefits`,
        description_text: 'Join thousands of users who are already benefiting. Enter your email to get exclusive access.',
        button_text: 'Get Started Now',
        email_placeholder: 'Enter your email address'
      };
    }

    // Generate a relevant image using Unsplash based on the title
    const searchTerms = webResultTitle.toLowerCase().split(' ').slice(0, 2).join(',');
    const mainImageUrl = `https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=60`;

    return new Response(JSON.stringify({
      ...generatedContent,
      main_image_url: mainImageUrl,
      logo_url: '',
      button_color: '#00b4d8',
      background_color: '#0a0f1c',
      background_image_url: ''
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-prelander:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
