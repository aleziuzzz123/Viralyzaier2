import React, { useState } from 'react';
import { invokeEdgeFunction } from '../services/supabaseService';

export const ShotstackDebugger: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const closeDebugger = () => {
        // This will be handled by the parent component
        window.location.reload();
    };

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testSupabaseConnection = async () => {
        setIsLoading(true);
        addLog('🔍 Testing Supabase connection...');
        
        try {
            const result = await invokeEdgeFunction('shotstack-studio-token', {});
            addLog(`✅ Supabase function call successful: ${JSON.stringify(result)}`);
        } catch (error: any) {
            addLog(`❌ Supabase function call failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const testShotstackImport = async () => {
        setIsLoading(true);
        addLog('📦 Testing Shotstack Studio SDK import...');
        
        try {
            const shotstackModule = await import('@shotstack/shotstack-studio');
            addLog(`✅ Shotstack Studio SDK imported successfully`);
            addLog(`📋 Available exports: ${Object.keys(shotstackModule).join(', ')}`);
            
            const { Canvas, Controls, Edit, Timeline } = shotstackModule;
            
            if (Edit) addLog('✅ Edit component available');
            if (Canvas) addLog('✅ Canvas component available');
            if (Timeline) addLog('✅ Timeline component available');
            if (Controls) addLog('✅ Controls component available');
            
        } catch (error: any) {
            addLog(`❌ Shotstack Studio SDK import failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const testComponentInitialization = async () => {
        setIsLoading(true);
        addLog('🔧 Testing component initialization...');
        
        try {
            const shotstackModule = await import('@shotstack/shotstack-studio');
            const { Canvas, Controls, Edit, Timeline } = shotstackModule;
            
            const edit = new Edit();
            addLog('✅ Edit component initialized');
            
            const size = { width: 1920, height: 1080 };
            const canvas = new Canvas(size, edit);
            addLog('✅ Canvas component initialized');
            
            const timeline = new Timeline();
            addLog('✅ Timeline component initialized');
            
            const controls = new Controls();
            addLog('✅ Controls component initialized');
            
            addLog('🎉 All components initialized successfully!');
            
        } catch (error: any) {
            addLog(`❌ Component initialization failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">🧪 Shotstack Studio SDK Debugger</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={clearLogs}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Clear Logs
                        </button>
                        <button 
                            onClick={closeDebugger}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={testSupabaseConnection}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Test Supabase
                    </button>
                    <button 
                        onClick={testShotstackImport}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        Test Import
                    </button>
                    <button 
                        onClick={testComponentInitialization}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                    >
                        Test Components
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">Click a test button to start debugging...</div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} className="mb-1">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
