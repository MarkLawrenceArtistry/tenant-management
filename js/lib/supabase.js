// This script assumes the Supabase library has been loaded globally via a <script> tag.

const SUPABASE_URL = 'https://lrlepetlhzpffipbcyks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybGVwZXRsaHpwZmZpcGJjeWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTI5MTcsImV4cCI6MjA3MzIyODkxN30.N1qpIS448f1NhOxvePD8KuE7W2V--gW1s4sYxnDvU9g';

// Use the globally available supabase object to create the client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);