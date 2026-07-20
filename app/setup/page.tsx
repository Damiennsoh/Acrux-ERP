'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  const envExample = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">FinManage Pro Setup</h1>
          <p className="text-muted-foreground">
            Configure Supabase credentials to get started
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Supabase environment variables are missing. The application operates in strict offline-only mode until configured.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create a Supabase Project</CardTitle>
            <CardDescription>
              Create a new project on Supabase to enable cloud synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
              <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
              <li>Click "New Project"</li>
              <li>Enter your project name and database password</li>
              <li>Wait for the database to provision</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Environment Variables</CardTitle>
            <CardDescription>
              Update your .env.local file or platform settings with your Supabase keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-50">
                <code>{envExample}</code>
              </pre>
              <Button onClick={handleCopy} size="sm" variant="outline" className="absolute right-2 top-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Run SQL Schema Migrations</CardTitle>
            <CardDescription>
              Set up your database tables and offline-sync triggers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
              <li>In your Supabase dashboard, go to the SQL Editor</li>
              <li>Copy the contents of <code className="bg-slate-100 px-2 py-1 rounded">supabase_schema.sql</code> located in the root directory</li>
              <li>Run the query to create tables, triggers, and Row Level Security policies</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
