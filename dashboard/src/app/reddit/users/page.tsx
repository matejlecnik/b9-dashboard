'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings,
  Crown,
  Mail,
  Activity,
  UserCheck,
  Key
} from 'lucide-react'

export default function UsersPage() {
  return (
    <DashboardLayout
      title="User Management"
      subtitle="Manage team members, roles, and permissions for your categorization workflow"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Coming Soon Banner */}
        <Card className="border-2 border-b9-pink/20 bg-gradient-to-r from-b9-pink/5 to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <Users className="h-6 w-6 text-b9-pink" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Team Management System</h3>
                  <p className="text-gray-600">Complete user management and role-based access control</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-b9-pink text-white border-b9-pink">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Feature Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* User Management */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-gray-700" />
                <CardTitle className="text-base">User Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Add, edit, and manage team members with comprehensive user profiles and activity tracking.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Add/remove team members</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>User profile management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Activity monitoring</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Role-Based Access */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-base">Role-Based Access</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Define custom roles and permissions for different levels of access to categorization features.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Custom role creation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Permission management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Access control policies</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-base">Team Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Track individual and team performance metrics, productivity scores, and quality ratings.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Individual performance metrics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Quality score tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Productivity analytics</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* User Permissions */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-gray-700" />
                <CardTitle className="text-base">Granular Permissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Fine-grained permission control for categorization, bulk actions, and administrative functions.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Categorization permissions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Bulk action controls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Admin function access</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* User Authentication */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-gray-800" />
                <CardTitle className="text-base">Authentication</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Secure authentication methods including SSO, MFA, and session management.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Single Sign-On (SSO)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Multi-factor authentication</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Session management</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Team Collaboration */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">Team Collaboration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Communication tools, notifications, and collaboration features for effective teamwork.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Team notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Task assignments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Comment system</span>
                </li>
              </ul>
            </CardContent>
          </Card>

        </div>

        {/* Sample User Table Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Management Preview</span>
            </CardTitle>
            <CardDescription>
              Example of how the user management interface will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Last Active</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 opacity-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-b9-pink/20 rounded-full flex items-center justify-center">
                          <Crown className="h-4 w-4 text-b9-pink" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">John Admin</div>
                          <div className="text-sm text-gray-500">john@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-gray-100 text-gray-900">Administrator</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-pink-100 text-pink-800">Active</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">2 hours ago</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div className="w-14 h-2 bg-pink-500 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">95%</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 opacity-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Settings className="h-4 w-4 text-gray-700" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Sarah Manager</div>
                          <div className="text-sm text-gray-500">sarah@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-gray-100 text-gray-800">Manager</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-pink-100 text-pink-800">Active</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">30 minutes ago</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div className="w-12 h-2 bg-b9-pink rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">87%</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="opacity-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Mike Categorizer</div>
                          <div className="text-sm text-gray-500">mike@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">Categorizer</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-gray-100 text-gray-800">Away</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">1 day ago</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div className="w-10 h-2 bg-gray-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">76%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-black">Ready to manage your team effectively?</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The User Management system will provide comprehensive tools for managing team members, 
                roles, permissions, and tracking performance across your categorization workflow.
              </p>
              <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
                <Users className="h-4 w-4 mr-2" />
                User Management
                <Badge variant="secondary" className="ml-2 bg-gray-400 text-white text-xs">
                  Coming Soon
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
