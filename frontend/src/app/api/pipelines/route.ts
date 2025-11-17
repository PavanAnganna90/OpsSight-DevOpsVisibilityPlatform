/**
 * Pipelines API Route
 * Example API route using Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/pipelines
 * Fetch all pipelines
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerAdminClient();
    
    // Query pipelines from Supabase
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pipelines', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      pipelines: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipelines
 * Create a new pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerAdminClient();
    
    const { data, error } = await supabase
      .from('pipelines')
      .insert(body)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create pipeline', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ pipeline: data }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

