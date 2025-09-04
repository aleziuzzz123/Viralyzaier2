import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  console.log('OpenAI Proxy received request:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const keyPrefix = openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'NOT_FOUND';
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      hasApiKey: !!openaiApiKey,
      keyPrefix: keyPrefix,
      timestamp: new Date().toISOString(),
      environment: 'production'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, params } = await req.json();
    console.log('OpenAI Proxy Request:', { type, params: { ...params, contents: typeof params?.contents === 'string' ? params.contents.substring(0, 100) + '...' : params?.contents } });

    if (!type || !params) {
      throw new Error("Request body must include 'type' and 'params'.");
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API Key found:', !!openaiApiKey);
    console.log('Available environment variables:', Object.keys(Deno.env.toObject()).filter(key => key.includes('OPENAI') || key.includes('API')));
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not found. Available env vars:', Object.keys(Deno.env.toObject()));
      throw new Error('OpenAI API key not found in environment variables. Please check your Supabase Edge Function secrets.');
    }
    
    // Validate API key format
    if (!openaiApiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format. Key should start with "sk-"');
      console.error('Current key format:', openaiApiKey.substring(0, 20) + '...');
      throw new Error('Invalid OpenAI API key format. Please check that you have the correct OpenAI API key.');
    }
    
    console.log('API key validation passed, key starts with:', openaiApiKey.substring(0, 10) + '...');

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
          console.error('OpenAI API Error:', { status: response.status, errorData, statusText: response.statusText });
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
        
        console.log('Generating image with prompt:', prompt.substring(0, 100) + '...');
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config?.model || 'dall-e-3',
            prompt: prompt,
            n: config?.numberOfImages || 1,
            size: config?.aspectRatio === '16:9' ? '1792x1024' : 
                  config?.aspectRatio === '9:16' ? '1024x1792' : 
                  config?.aspectRatio === '1:1' ? '1024x1024' : '1792x1024',
            quality: config?.quality || 'standard',
            response_format: 'b64_json'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('OpenAI Images API Error:', { status: response.status, errorData, statusText: response.statusText });
          throw new Error(`OpenAI Images API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Image generation successful, received', data.data.length, 'images');
        
        result = {
          generatedImages: data.data.map((img: any) => ({
            image: {
              imageBytes: img.b64_json
            }
          }))
        };
        break;
      }

      case 'test': {
        // Simple test endpoint to verify OpenAI API is working
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          }
        });

        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          throw new Error(`OpenAI API test failed: ${testResponse.status} - ${errorData.error?.message || testResponse.statusText}`);
        }

        const models = await testResponse.json();
        result = {
          status: 'success',
          message: 'OpenAI API is working',
          availableModels: models.data.length,
          timestamp: new Date().toISOString()
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
