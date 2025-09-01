import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, params } = await req.json();

    if (!type || !params) {
      throw new Error("Request body must include 'type' and 'params'.");
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    let result;

    switch (type) {
      case 'generateContent': {
        const { model = 'gpt-4o', contents, config } = params;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: config?.systemInstruction || 'You are a helpful AI assistant.'
              },
              {
                role: 'user',
                content: contents
              }
            ],
            response_format: config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined,
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content received from OpenAI API');
        }

        result = {
          text: content,
          usage: data.usage
        };
        break;
      }

      case 'generateImages': {
        const { prompt, config } = params;
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            n: config?.numberOfImages || 1,
            size: config?.aspectRatio === '16:9' ? '1792x1024' : 
                  config?.aspectRatio === '9:16' ? '1024x1792' : 
                  config?.aspectRatio === '1:1' ? '1024x1024' : '1024x1024',
            response_format: 'b64_json',
            quality: 'standard'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI Images API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        result = {
          generatedImages: data.data.map((img: any) => ({
            image: {
              imageBytes: img.b64_json
            }
          }))
        };
        break;
      }

      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OpenAI Proxy Error:', error);
    
    return new Response(JSON.stringify({ 
      error: { 
        message: error.message,
        code: error.message.includes('rate limit') ? 429 : 
              error.message.includes('overloaded') ? 503 : 500
      } 
    }), {
      status: error.message.includes('rate limit') ? 429 : 
              error.message.includes('overloaded') ? 503 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
