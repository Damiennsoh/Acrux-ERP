import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect to auth on root - the dashboard layout will check auth status
  // and redirect to auth if needed, or to dashboard if authenticated
  redirect('/auth');
}
