import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://prnnjpvsssmasnvwohmo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybm5qcHZzc3NtYXNudndvaG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDIwODYsImV4cCI6MjA4ODg3ODA4Nn0.c0GwZWXBTdrGwFS5JoZx8DuoXLTT0pvh9wQcbYo4D2c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);