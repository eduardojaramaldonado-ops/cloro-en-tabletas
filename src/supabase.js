import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uairiazpsqsnmuklsxei.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhaXJpYXpwc3Fzbm11a2xzeGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzE3ODcsImV4cCI6MjA4OTcwNzc4N30.nhSE5mRD-4Zmeg7w4eQJf7jpCbFoWldPrJDZMB3Drjk'

export const supabase = createClient(supabaseUrl, supabaseKey)