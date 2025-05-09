'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type ScoredPost } from '@/lib/scoringUtils';

interface DashboardProps {
  userEmail: string;
}

interface AnalysisResult {
  message?: string;
  processedPosts?: ScoredPost[]; 
  error?: string;
}

export default function DashboardClient({ userEmail }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const runAnalysis = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/analysis/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data: AnalysisResult = await response.json();
      setResult(data);
      console.log('Analysis result:', data);
    } catch (error) {
      console.error('Error running analysis:', error);
      setResult({ error: 'Failed to run analysis' }); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Meta Insights Dashboard</h1>
      <p className="mb-4">Logged in as: {userEmail}</p>
      
      <div className="mb-6">
        <Button 
          onClick={runAnalysis}
          disabled={isLoading}
        >
          {isLoading ? 'Running Analysis...' : 'Run Meta Analysis'}
        </Button>
      </div>
      
      {result && (
        <div className="p-4 border rounded-md bg-muted">
          <h2 className="font-semibold mb-2">Analysis Result:</h2>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 