import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const cfgPath = path.join(process.cwd(), 'config', 'accounts_config.json')
    const raw = await readFile(cfgPath, 'utf-8')
    const json = JSON.parse(raw)
    const accounts = Array.isArray(json.reddit_accounts) ? json.reddit_accounts : []
    const total = accounts.length
    const active = accounts.filter((a: { enabled?: boolean }) => a?.enabled).length
    const details = accounts.map((a: { username?: string; enabled?: boolean }) => ({
      username: a.username || 'unknown',
      status: a.enabled ? 'active' : 'disabled'
    }))
    return NextResponse.json({ total, active, details })
  } catch {
    return NextResponse.json({ total: 0, active: 0, details: [] })
  }
}


