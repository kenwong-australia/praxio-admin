'use client';

import { useState, useEffect, useRef } from 'react';
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
import { formatDistanceToNow, format } from 'date-fns';
import { verifyEmailByEmail } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import CsvDownloadButton from '@/components/CsvDownloadButton';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 25,
  });

  // Request ID tracking prevents race conditions
  // Only applies results from the most recent request
  const requestIdRef = useRef(0);

  const loadUsers = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      console.log('Loading users with filters:', filters);
      const [usersResult, statsResult] = await Promise.all([
        getUsers(filters),
        getUserStats({ fromISO: filters.fromISO, toISO: filters.toISO }),
      ]);
      // Only apply the latest request's result
      if (requestId !== requestIdRef.current) return;
      console.log('Users result:', usersResult);
      console.log('Stats result:', statsResult);
      // Client-side filtering as backup to server-side filters
      // Handles edge cases where server filters might miss data
      let rows = usersResult.rows as User[];
      if ((filters as any).status) {
        const s = String((filters as any).status).trim().toLowerCase();
        rows = rows.filter(u => (u.stripe_subscription_status || '').toString().trim().toLowerCase() === s);
      }
      if (filters.plan) {
        const p = String(filters.plan);
        if (p.toUpperCase() === 'N/A') {
          rows = rows.filter(u => (u.selected_frequency || '') === '');
        } else {
          rows = rows.filter(u => (u.selected_frequency || '').toString().trim().toLowerCase() === p.toLowerCase());
        }
      }
      if (filters.role) {
        rows = rows.filter(u => (u.role || '') === filters.role);
      }
      setUsers(rows);
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

  const formatDateShort = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return format(date, 'dd/MM/yy');
  };

  const getStatusBadge = (user: User) => {
    const status = (user.stripe_subscription_status || '').trim().toLowerCase();
    if (status === 'active') {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    }
    if (status === 'trialing') {
      return <Badge className="bg-blue-500 text-white">Trial</Badge>;
    }
    if (status === 'canceled') {
      return <Badge variant="destructive">Canceled</Badge>;
    }
    // Show N/A for null, empty, or unknown statuses instead of "Free"
    return <Badge variant="outline">N/A</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-500 text-white',
      user: 'bg-blue-500 text-white',
      premium: 'bg-purple-500 text-white',
    };
    return <Badge className={colors[role] || 'bg-gray-500 text-white'}>{role}</Badge>;
  };

  const totalPages = 1; // no pagination while fetching full dataset

  return (
    <div className="p-8">
      <div className="max-w-none mx-4 space-y-6">
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
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.userEngagement}%</div>
                <div className="text-xs text-muted-foreground mt-1">Active Users / Total Users</div>
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
                <CardTitle className="text-sm font-medium">New Signups (30d)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newSignups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion (30d)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversion ?? 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">Active New Signups / New Signups</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Active</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.paidUsers}</div>
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
                  value={filters.role || 'all'}
                  onValueChange={(value) => handleFilterChange('role', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="all roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all roles</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="regular">regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Plan (Frequency)</label>
                <Select
                  value={filters.plan || 'all'}
                  onValueChange={(value) => handleFilterChange('plan', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="all frequencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all</SelectItem>
                    <SelectItem value="monthly">monthly</SelectItem>
                    <SelectItem value="yearly">yearly</SelectItem>
                    <SelectItem value="N/A">n/a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={(filters as any).status || 'all'}
                  onValueChange={(value) => handleFilterChange('status' as any, value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="all status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all</SelectItem>
                    <SelectItem value="trialing">trialing</SelectItem>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="canceled">canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users ({total})</CardTitle>
                <CardDescription>
                  Showing {users.length} of {total} users
                </CardDescription>
              </div>
              <CsvDownloadButton rows={users} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading users...</div>
              </div>
            ) : (
              <>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Email Verified</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>ABN</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Last Chat</TableHead>
                      <TableHead>Chats</TableHead>
                      <TableHead>In Supabase?</TableHead>
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
                        </TableCell>
                        <TableCell>
                          {user.email_verified ? (
                            <Badge className="bg-green-500 text-white">Verified</Badge>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Badge variant="outline" className="cursor-pointer">Not Verified</Badge>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark email as verified?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will set the email verification for {user.email} to verified in Firebase Auth.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      const res = await verifyEmailByEmail({ uid: user.uid, email: user.email });
                                      if ((res as any)?.ok) {
                                        router.refresh();
                                      } else {
                                        alert((res as any)?.error || 'Failed to verify email');
                                      }
                                    }}
                                  >
                                    Confirm
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{user.phone_number || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {user.abn_num || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(user.created_time)}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.selected_frequency?.trim() || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(user.latest_chat_created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{user.supabase_chat_count ?? 0}</div>
                        </TableCell>
                        <TableCell>
                          {user.in_supabase ? (
                            <Badge className="bg-green-500 text-white">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination hidden while showing full dataset */}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
