'use client';

import { useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { testCreateUser, testGetUser, testDeleteUser, runTestAuthFlow, type TestResult } from "./actions";

export default function TestAuthPage() {
  const { user, isLoaded } = useUser();
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: () => Promise<TestResult>) {
    try {
      setError(null);
      const actionResult = await action();
      setResult(actionResult);
      
      if (!actionResult.success) {
        setError(actionResult.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    }
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Auth Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Current Auth State:</h2>
          <pre className="bg-white p-2 rounded">
            {JSON.stringify({
              userId: user?.id,
              email: user?.emailAddresses[0]?.emailAddress,
              firstName: user?.firstName,
              lastName: user?.lastName,
              username: user?.username,
            }, null, 2)}
          </pre>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {result?.success && (
          <div className="p-4 bg-green-100 text-green-700 rounded">
            <div className="font-semibold mb-2">{result.message}</div>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={() => handleAction(testCreateUser)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Create User
          </button>

          {user?.id && (
            <>
              <button 
                onClick={() => handleAction(() => testGetUser(user.id))}
                className="block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Test Get User
              </button>

              <button 
                onClick={() => handleAction(() => testDeleteUser(user.id))}
                className="block bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Test Delete User
              </button>
            </>
          )}

          <button 
            onClick={() => handleAction(runTestAuthFlow)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Test Full Auth Flow
          </button>
        </div>
      </div>
    </div>
  );
} 