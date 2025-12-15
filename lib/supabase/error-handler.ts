import { NextResponse } from 'next/server';

export function handleSupabaseError(error: any, context: string): NextResponse {
  console.error(`Supabase error in ${context}:`, error);

  // Check if it's a table not found error (migrations not applied)
  if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
    return NextResponse.json(
      {
        error: 'Database tables not found. Please apply migrations in Supabase.',
        details: 'Run the SQL migrations from supabase/migrations/ in your Supabase dashboard.',
      },
      { status: 503 }
    );
  }

  // Check if it's a connection error
  if (error?.message?.includes('connect') || error?.code === 'ECONNREFUSED') {
    return NextResponse.json(
      {
        error: 'Database connection failed. Please check your Supabase credentials.',
      },
      { status: 503 }
    );
  }

  // Generic error
  return NextResponse.json(
    {
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    },
    { status: 500 }
  );
}

