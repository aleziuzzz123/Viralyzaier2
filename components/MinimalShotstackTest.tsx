import React, { useEffect, useState } from 'react';

const MinimalShotstackTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    const testShotstackSDK = async () => {
      try {
        addLog('🚀 Starting Shotstack SDK test...');
        
        // Test 1: Check if we can import the SDK
        addLog('📦 Testing SDK import...');
        try {
          const { Edit, Canvas, Controls, Timeline } = await import("@shotstack/shotstack-studio");
          addLog('✅ SDK import successful');
          
          // Test 2: Check if classes are available
          addLog('🔍 Testing class availability...');
          if (typeof Edit === 'undefined') {
            throw new Error('Edit class not available');
          }
          if (typeof Canvas === 'undefined') {
            throw new Error('Canvas class not available');
          }
          if (typeof Timeline === 'undefined') {
            throw new Error('Timeline class not available');
          }
          if (typeof Controls === 'undefined') {
            throw new Error('Controls class not available');
          }
          addLog('✅ All classes available');
          
          // Test 3: Try to create an Edit instance
          addLog('🔧 Testing Edit instance creation...');
          const edit = new Edit({ width: 1280, height: 720 }, '#000000');
          addLog('✅ Edit instance created');
          
          // Test 4: Try to load the edit
          addLog('⏳ Testing Edit loading...');
          await edit.load();
          addLog('✅ Edit loaded successfully');
          
          setStatus('✅ All tests passed!');
          addLog('🎉 Shotstack SDK test completed successfully!');
          
        } catch (importError) {
          addLog(`❌ SDK import failed: ${importError}`);
          throw importError;
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        addLog(`❌ Test failed: ${errorMessage}`);
        setError(errorMessage);
        setStatus('❌ Test failed');
      }
    };

    testShotstackSDK();
  }, []);

  return (
    <div className="h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Minimal Shotstack SDK Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Status</h2>
          <p className={`text-lg ${status.includes('✅') ? 'text-green-400' : status.includes('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
            {status}
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded">
              <h3 className="font-semibold text-red-300">Error Details:</h3>
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
          <div className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User Agent:</strong>
              <p className="text-gray-300 break-all">{navigator.userAgent}</p>
            </div>
            <div>
              <strong>Window Location:</strong>
              <p className="text-gray-300">{window.location.href}</p>
            </div>
            <div>
              <strong>Document Ready State:</strong>
              <p className="text-gray-300">{document.readyState}</p>
            </div>
            <div>
              <strong>Window Object:</strong>
              <p className="text-gray-300">{typeof window}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimalShotstackTest;
