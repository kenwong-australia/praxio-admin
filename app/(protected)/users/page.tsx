'use client';

import { useState, useEffect } from 'react';
import { getUsers, getUserStats } from '@/app/actions';
import { User, UserFilters, UserStats } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Users, UserCheck, TrendingUp, DollarSign, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 25,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersResult, statsResult] = await Promise.all([
        getUsers(filters),
        getUserStats({ fromISO: filters.fromISO, toISO: filters.toISO }),
      ]);
      setUsers(usersResult.rows);
      setTotal(usersResult.total);
      setStats(statsResult);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getStatusBadge = (user: User) => {
    if (user.stripe_subscription_status === 'active') {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    }
    if (user.stripe_subscription_status === 'trialing') {
      return <Badge className="bg-blue-500 text-white">Trial</Badge>;
    }
    if (user.stripe_subscription_status === 'canceled') {
      return <Badge variant="destructive">Canceled</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-500 text-white',
      user: 'bg-blue-500 text-white',
      premium: 'bg-purple-500 text-white',
    };
    return <Badge className={colors[role] || 'bg-gray-500 text-white'}>{role}</Badge>;
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage and monitor user accounts</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Signups</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newSignups}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paidUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Chats/User</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgChatsPerUser}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userEngagement}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by email..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select
                value={filters.role || ''}
                onValueChange={(value) => handleFilterChange('role', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Plan</label>
              <Select
                value={filters.plan || ''}
                onValueChange={(value) => handleFilterChange('plan', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">State</label>
              <Select
                value={filters.state || ''}
                onValueChange={(value) => handleFilterChange('state', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All states</SelectItem>
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="TAS">TAS</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                  <SelectItem value="NT">NT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({total})</CardTitle>
          <CardDescription>
            Showing {users.length} of {total} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading users...</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Chats</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photo_url} />
                            <AvatarFallback>
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.display_name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.email}</div>
                        {user.email_verified && (
                          <Badge variant="outline" className="text-xs">Verified</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.selected_plan || 'Free'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{user.number_chats || 0}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(user.created_time)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(user.last_activity)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {filters.page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={filters.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={filters.page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
