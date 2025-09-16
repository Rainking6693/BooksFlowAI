import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  generateAuthUrl, 
  exchangeCodeForTokens, 
  getCompanyInfo,
  storeQBConnection 
} from '@/lib/integrations/quickbooks'
import { logger } from '@/lib/logger'
import { ValidationError, QuickBooksError } from '@/lib/errors'

/**
 * Initiate QuickBooks OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // Generate state parameter for security
    const state = `${accountantId}-${Date.now()}-${Math.random().toString(36).substring(2)}`
    
    // Store state in session or database for verification
    // For now, we'll include accountantId in the state
    
    // Generate QuickBooks authorization URL
    const authUrl = generateAuthUrl(state)

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      message: 'Redirect user to authUrl to complete QuickBooks authorization'
    })

  } catch (error) {
    console.error('QuickBooks auth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authorization' },
      { status: 500 }
    )
  }
}

/**
 * Handle QuickBooks OAuth callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, realmId, state, error: oauthError } = body

    // Check for OAuth errors
    if (oauthError) {
      console.error('QuickBooks OAuth error:', oauthError)
      return NextResponse.json(
        { error: `QuickBooks authorization failed: ${oauthError}` },
        { status: 400 }
      )
    }

    // Validate required parameters
    if (!code || !realmId || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      )
    }

    // Extract accountant ID from state
    const accountantId = state.split('-')[0]
    if (!accountantId) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    // Verify accountant exists
    const { data: accountant, error: accountantError } = await supabase
      .from('accountants')
      .select('id, user_id')
      .eq('id', accountantId)
      .single()

    if (accountantError || !accountant) {
      return NextResponse.json(
        { error: 'Accountant not found' },
        { status: 404 }
      )
    }

    try {
      // Exchange authorization code for tokens
      logger.info('Starting QuickBooks OAuth token exchange', {
        accountantId,
        realmId,
        operation: 'oauth_token_exchange'
      })
      const tokens = await exchangeCodeForTokens(code, realmId)

      // Get company information
      logger.info('Fetching QuickBooks company information', {
        accountantId,
        companyId: tokens.companyId,
        operation: 'fetch_company_info'
      })
      const companyInfo = await getCompanyInfo(tokens.accessToken, tokens.companyId)

      // Store connection in database
      logger.info('Storing QuickBooks connection', {
        accountantId,
        companyName: companyInfo.name,
        operation: 'store_qb_connection'
      })
      await storeQBConnection(accountantId, tokens, companyInfo)

      // Update accountant's QuickBooks connection status
      await supabase
        .from('accountants')
        .update({ quickbooks_connected: true })
        .eq('id', accountantId)

      // Log successful connection
      await supabase.from('activity_logs').insert({
        user_id: accountant.user_id,
        action: 'QUICKBOOKS_CONNECT',
        resource_type: 'quickbooks_connection',
        resource_id: realmId,
        new_values: {
          company_name: companyInfo.name,
          company_id: tokens.companyId,
          connected_at: new Date().toISOString()
        }
      })

      return NextResponse.json({
        success: true,
        companyInfo: {
          name: companyInfo.name,
          id: companyInfo.id,
          currency: companyInfo.currency
        },
        message: `Successfully connected to ${companyInfo.name}`
      })

    } catch (tokenError) {
      console.error('Token exchange error:', tokenError)
      return NextResponse.json(
        { 
          error: 'Failed to complete QuickBooks authorization',
          details: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('QuickBooks OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error during QuickBooks authorization' },
      { status: 500 }
    )
  }
}

/**
 * Disconnect QuickBooks integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // Get accountant profile
    const { data: accountant, error: accountantError } = await supabase
      .from('accountants')
      .select('id, user_id')
      .eq('id', accountantId)
      .single()

    if (accountantError || !accountant) {
      return NextResponse.json(
        { error: 'Accountant not found' },
        { status: 404 }
      )
    }

    // Remove QuickBooks connection
    const { error: deleteError } = await supabase
      .from('quickbooks_connections')
      .delete()
      .eq('accountant_id', accountantId)

    if (deleteError) {
      console.error('Error deleting QuickBooks connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect QuickBooks' },
        { status: 500 }
      )
    }

    // Update accountant's connection status
    await supabase
      .from('accountants')
      .update({ quickbooks_connected: false })
      .eq('id', accountantId)

    // Log disconnection
    await supabase.from('activity_logs').insert({
      user_id: accountant.user_id,
      action: 'QUICKBOOKS_DISCONNECT',
      resource_type: 'quickbooks_connection',
      resource_id: accountantId,
      new_values: {
        disconnected_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'QuickBooks integration disconnected successfully'
    })

  } catch (error) {
    console.error('QuickBooks disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error during QuickBooks disconnection' },
      { status: 500 }
    )
  }
}