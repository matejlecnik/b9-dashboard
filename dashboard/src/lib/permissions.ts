
import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export interface DashboardInfo {
  dashboard_id: string
  name: string
  path: string
  icon: string
  description: string | null
  permissions: {
    read: boolean
    write: boolean
    admin: boolean
  }
  display_order: number
}

export interface UserPermissions {
  read: boolean
  write: boolean
  admin: boolean
}

type GetUserDashboardsRow = {
  dashboard_id: string
  name: string
  path: string
  icon: string
  description: string | null
  permissions?: UserPermissions
  display_order: number
}

/**
 * Check if a user has access to a specific dashboard
 */
export async function checkDashboardAccess(
  userEmail: string,
  dashboardId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.error('Supabase client not available')
      return false
    }

    const { data, error } = await supabase
      .rpc('check_dashboard_access', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId
      })

    if (error) {
      logger.error('Error checking dashboard access:', error)
      return false
    }

    return data || false
  } catch (error) {
    logger.error('Failed to check dashboard access:', error)
    return false
  }
}

/**
 * Get all dashboards accessible to a user
 */
export async function getUserDashboards(
  userEmail: string
): Promise<DashboardInfo[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.error('Supabase client not available')
      return []
    }

    const { data, error } = await supabase
      .rpc('get_user_dashboards', {
        p_user_email: userEmail
      })

    if (error) {
      logger.error('Error fetching user dashboards:', error)
      return []
    }

    const rows = (data || []) as GetUserDashboardsRow[]
    return rows.map((item) => ({
      dashboard_id: item.dashboard_id,
      name: item.name,
      path: item.path,
      icon: item.icon,
      description: item.description,
      permissions: item.permissions || { read: false, write: false, admin: false },
      display_order: item.display_order
    }))
  } catch (error) {
    logger.error('Failed to get user dashboards:', error)
    return []
  }
}

/**
 * Get specific permissions for a user on a dashboard
 */
export async function getUserPermissions(
  userEmail: string,
  dashboardId: string
): Promise<UserPermissions> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.error('Supabase client not available')
      return { read: false, write: false, admin: false }
    }

    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId
      })

    if (error) {
      logger.error('Error fetching user permissions:', error)
      return { read: false, write: false, admin: false }
    }

    return data || { read: false, write: false, admin: false }
  } catch (error) {
    logger.error('Failed to get user permissions:', error)
    return { read: false, write: false, admin: false }
  }
}

/**
 * Check if user has a specific permission level
 */
export async function checkPermissionLevel(
  userEmail: string,
  dashboardId: string,
  permissionLevel: 'read' | 'write' | 'admin'
): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      logger.error('Supabase client not available')
      return false
    }

    const { data, error } = await supabase
      .rpc('check_permission_level', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId,
        p_permission_level: permissionLevel
      })

    if (error) {
      logger.error('Error checking permission level:', error)
      return false
    }

    return data || false
  } catch (error) {
    logger.error('Failed to check permission level:', error)
    return false
  }
}

/**
 * Get the dashboard ID from the current path
 */
export function getDashboardFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)

  // Check for known dashboard paths
  const dashboards = ['reddit', 'instagram', 'models', 'tracking', 'monitor']

  if (segments.length > 0 && dashboards.includes(segments[0])) {
    return segments[0]
  }

  return null
}

/**
 * Icons map for dashboard icons
 */
export const dashboardIcons: Record<string, unknown> = {
  MessageCircle: '💬',
  Instagram: '📷',
  Users: '👥',
  Activity: '📊',
  Monitor: '🖥️'
}

// Client-side compatible functions (use browser Supabase client)

/**
 * Get all dashboards accessible to a user (client-side version)
 */
export async function getUserDashboardsClient(
  userEmail: string
): Promise<DashboardInfo[]> {
  try {
    if (!supabase) {
      logger.error('Supabase client not available')
      return []
    }

    const { data, error } = await supabase
      .rpc('get_user_dashboards', {
        p_user_email: userEmail
      })

    if (error) {
      logger.error('Error fetching user dashboards:', error)
      return []
    }

    const rows = (data || []) as GetUserDashboardsRow[]
    return rows.map((item) => ({
      dashboard_id: item.dashboard_id,
      name: item.name,
      path: item.path,
      icon: item.icon,
      description: item.description,
      permissions: item.permissions || { read: false, write: false, admin: false },
      display_order: item.display_order
    }))
  } catch (error) {
    logger.error('Failed to get user dashboards:', error)
    return []
  }
}

/**
 * Check if a user has access to a specific dashboard (client-side version)
 */
export async function checkDashboardAccessClient(
  userEmail: string,
  dashboardId: string
): Promise<boolean> {
  try {
    if (!supabase) {
      logger.error('Supabase client not available')
      return false
    }

    const { data, error } = await supabase
      .rpc('check_dashboard_access', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId
      })

    if (error) {
      logger.error('Error checking dashboard access:', error)
      return false
    }

    return data || false
  } catch (error) {
    logger.error('Failed to check dashboard access:', error)
    return false
  }
}

/**
 * Get specific permissions for a user on a dashboard (client-side version)
 */
export async function getUserPermissionsClient(
  userEmail: string,
  dashboardId: string
): Promise<UserPermissions> {
  try {
    if (!supabase) {
      logger.error('Supabase client not available')
      return { read: false, write: false, admin: false }
    }

    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId
      })

    if (error) {
      logger.error('Error fetching user permissions:', error)
      return { read: false, write: false, admin: false }
    }

    return data || { read: false, write: false, admin: false }
  } catch (error) {
    logger.error('Failed to get user permissions:', error)
    return { read: false, write: false, admin: false }
  }
}

/**
 * Check if user has a specific permission level (client-side version)
 */
export async function checkPermissionLevelClient(
  userEmail: string,
  dashboardId: string,
  permissionLevel: 'read' | 'write' | 'admin'
): Promise<boolean> {
  try {
    if (!supabase) {
      logger.error('Supabase client not available')
      return false
    }

    const { data, error } = await supabase
      .rpc('check_permission_level', {
        p_user_email: userEmail,
        p_dashboard_id: dashboardId,
        p_permission_level: permissionLevel
      })

    if (error) {
      logger.error('Error checking permission level:', error)
      return false
    }

    return data || false
  } catch (error) {
    logger.error('Failed to check permission level:', error)
    return false
  }
}