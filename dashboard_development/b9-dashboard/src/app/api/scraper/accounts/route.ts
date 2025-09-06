import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // Read from the main project config directory
    const cfgPath = path.join(process.cwd(), '..', '..', 'config', 'accounts_config.json')
    const raw = await readFile(cfgPath, 'utf-8')
    const json = JSON.parse(raw)
    
    const accounts = Array.isArray(json.reddit_accounts) ? json.reddit_accounts : []
    const proxies = Array.isArray(json.proxies) ? json.proxies : []
    
    const total = accounts.length
    const active = accounts.filter((a: { enabled?: boolean }) => a?.enabled).length
    const details = accounts.map((a: { username?: string; enabled?: boolean }) => ({
      username: a.username || 'unknown',
      status: a.enabled ? 'active' : 'disabled'
    }))

    // Add proxy information
    const proxyStatus = {
      total: proxies.length,
      active: proxies.filter((p: { enabled?: boolean }) => p?.enabled !== false).length,
      details: proxies.map((p: { host?: string; port?: number; enabled?: boolean }) => ({
        host: p.host || 'unknown',
        port: p.port || 0,
        status: p.enabled !== false ? 'active' : 'disabled'
      }))
    }
    
    return NextResponse.json({ 
      accounts: { total, active, details },
      proxies: proxyStatus
    })
  } catch (error) {
    console.error('Error reading accounts config:', error)
    return NextResponse.json({ 
      accounts: { total: 0, active: 0, details: [] },
      proxies: { total: 0, active: 0, details: [] }
    })
  }
}


