'use client';

import { useState } from 'react';

export default function TestFirebasePage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFirebase = async () => {
    setLoading(true);
    setResult('Testing Firebase connection...\n');
    
    try {
      const response = await fetch('/api/test-firebase', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(prev => prev + `Response: ${JSON.stringify(data, null, 2)}\n`);
    } catch (error) {
      setResult(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Firebase Connection Test</h1>
      <button 
        onClick={testFirebase}
        disabled={loading}
        className="px-3 py-1.5 text-xs h-8 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Firebase Connection'}
      </button>
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
        {result}
      </pre>
    </div>
  );
}
