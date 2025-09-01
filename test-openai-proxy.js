// Simple test script to verify OpenAI proxy is working
const SUPABASE_URL = 'https://wpgrfukcnpcoyruymxdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZ3JmdWtjbnBjbyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI1MTI5NzQwLCJleHAiOjIwNDA3MDU3NDB9.bbddcb46602924f353d0cc2390b4263015652199bef6';

async function testOpenAIProxy() {
    console.log('🧪 Testing OpenAI Proxy...');
    
    try {
        // Test 1: Health check
        console.log('\n1. Testing health check...');
        const healthResponse = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check passed:', healthData);
        } else {
            console.log('❌ Health check failed:', healthResponse.status, await healthResponse.text());
        }
        
        // Test 2: Test endpoint
        console.log('\n2. Testing OpenAI API connectivity...');
        const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'test',
                params: {}
            })
        });
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ OpenAI API test passed:', testData);
        } else {
            console.log('❌ OpenAI API test failed:', testResponse.status, await testResponse.text());
        }
        
        // Test 3: Simple content generation
        console.log('\n3. Testing content generation...');
        const contentResponse = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'generateContent',
                params: {
                    model: 'gpt-4o',
                    contents: 'Say "Hello, this is a test!"',
                    config: {
                        responseMimeType: 'application/json'
                    }
                }
            })
        });
        
        if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            console.log('✅ Content generation passed:', contentData);
        } else {
            console.log('❌ Content generation failed:', contentResponse.status, await contentResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testOpenAIProxy();
