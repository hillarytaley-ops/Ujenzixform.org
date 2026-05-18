import { readAuthUserIdSync, readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  RefreshCw, 
  UserCog, 
  Shield, 
  Loader2,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Users,
  Building2,
  Store,
  Truck,
  ShoppingBag,
  HardHat,
  PauseCircle,
  Play,
} from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
  is_paused?: boolean;
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-500' },
  { value: 'supplier', label: 'Supplier', icon: Store, color: 'bg-amber-500' },
  { value: 'delivery_provider', label: 'Delivery Provider', icon: Truck, color: 'bg-purple-500' },
  { value: 'private_client', label: 'Private Builder', icon: ShoppingBag, color: 'bg-green-500' },
  { value: 'professional_builder', label: 'CO/Contractor', icon: HardHat, color: 'bg-blue-500' },
];

/** user_roles.role is often `delivery`; UI and some code use `delivery_provider` */
function isDeliveryRole(role: string): boolean {
  const r = (role || '').toLowerCase().trim();
  return r === 'delivery' || r === 'delivery_provider';
}

function userMatchesRoleFilter(userRole: string, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'delivery_provider') return isDeliveryRole(userRole);
  return userRole === filter;
}

function roleCountForCard(roleValue: string, allUsers: UserWithRole[]): number {
  if (roleValue === 'delivery_provider') {
    return allUsers.filter((u) => isDeliveryRole(u.role)).length;
  }
  return allUsers.filter((u) => u.role === roleValue).length;
}

/** Compare saved role string vs Select value (delivery ↔ delivery_provider) */
function rolesEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  return isDeliveryRole(a) && isDeliveryRole(b);
}

export const UserRolesManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<UserWithRole | null>(null);
  const [pausing, setPausing] = useState(false);
  const { toast } = useToast();
  const currentUserId = readAuthUserIdSync();

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    try {
      const storedSession = readPersistedAuthRawStringSync();
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed?.access_token) {
          headers['Authorization'] = `Bearer ${parsed.access_token}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return headers;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const rolesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?select=user_id,role,created_at&order=created_at.desc`,
        { headers: getAuthHeaders() }
      );
      if (!rolesResponse.ok) throw new Error(`HTTP ${rolesResponse.status}`);
      const roles: { user_id: string; role: string; created_at: string }[] = await rolesResponse.json();

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      let profilesMap: Record<string, { full_name?: string; email?: string; is_paused?: boolean }> = {};
      if (userIds.length > 0) {
        const inFilter = userIds.join(",");
        const profilesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=user_id,full_name,email,is_paused&user_id=in.(${inFilter})`,
          { headers: getAuthHeaders() }
        );
        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json();
          (profilesData || []).forEach(
            (p: { user_id: string; full_name?: string; email?: string; is_paused?: boolean }) => {
              profilesMap[p.user_id] = {
                full_name: p.full_name,
                email: p.email,
                is_paused: p.is_paused === true,
              };
            }
          );
        }
      }

      const combinedUsers: UserWithRole[] = roles.map((r) => {
        const p = profilesMap[r.user_id];
        return {
          id: r.user_id,
          email: p?.email || p?.full_name || `User ${r.user_id.slice(0, 8)}...`,
          role: r.role,
          created_at: r.created_at,
          full_name: p?.full_name,
          is_paused: p?.is_paused ?? false,
        };
      });

      setUsers(combinedUsers);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      const msg = (error as { message?: string })?.message ?? 'Failed to fetch users';
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async () => {
    if (!editingUser || !newRole) return;

    setUpdating(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${editingUser.id}`,
        {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Prefer": "return=minimal" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      toast({
        title: "✅ Role Updated",
        description: `${editingUser.email} is now a ${newRole}`,
      });

      // Refresh the list
      await fetchUsers();
      setEditingUser(null);
      setNewRole("");
    } catch (error: unknown) {
      console.error('Error updating role:', error);
      const msg = (error as { message?: string })?.message ?? "Failed to update role";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPauseUser = async () => {
    if (!pauseTarget) return;
    const nextPaused = !pauseTarget.is_paused;
    setPausing(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_set_user_paused`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          p_target_user_id: pauseTarget.id,
          p_paused: nextPaused,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
      if (!res.ok) {
        const msg =
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      toast({
        title: nextPaused ? "Account paused" : "Account resumed",
        description: nextPaused
          ? `${pauseTarget.email} cannot access dashboards until resumed.`
          : `${pauseTarget.email} can sign in and use their dashboard again.`,
      });
      setPauseTarget(null);
      await fetchUsers();
    } catch (error: unknown) {
      console.error("Error updating pause state:", error);
      const msg = (error as { message?: string })?.message ?? "Failed to update account status";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setPausing(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const headers = { ...getAuthHeaders(), apikey: SUPABASE_ANON_KEY };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: deleteTarget.id }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (res.status === 404) {
        toast({
          title: "Delete service unavailable",
          description:
            "Deploy the admin-delete-user Edge Function: supabase functions deploy admin-delete-user",
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }
      toast({
        title: "User deleted",
        description: `${deleteTarget.email} has been permanently removed.`,
      });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      const msg = (error as { message?: string })?.message ?? "Failed to delete user";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = userMatchesRoleFilter(user.role, roleFilter);
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const lookupKey = isDeliveryRole(role) ? 'delivery_provider' : role;
    const roleConfig = AVAILABLE_ROLES.find(r => r.value === lookupKey);
    if (!roleConfig) return <Badge variant="outline">{role}</Badge>;
    
    const Icon = roleConfig.icon;
    return (
      <Badge className={`${roleConfig.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {roleConfig.label}
      </Badge>
    );
  };

  const roleCounts = AVAILABLE_ROLES.map(role => ({
    ...role,
    count: roleCountForCard(role.value, users)
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {roleCounts.map(role => {
          const Icon = role.icon;
          return (
            <Card key={role.value} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setRoleFilter(role.value)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${role.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-2xl font-bold">{role.count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{role.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            View and edit user roles, pause accounts (blocks dashboard access), or permanently delete a user. Changes
            take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {AVAILABLE_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.is_paused ? (
                            <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">
                              <PauseCircle className="h-3 w-3 mr-1" />
                              Paused
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={
                              user.is_paused
                                ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                                : "border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                            }
                            disabled={!currentUserId || user.id === currentUserId}
                            title={
                              user.id === currentUserId
                                ? "You cannot pause your own account"
                                : user.is_paused
                                  ? "Resume dashboard access"
                                  : "Pause dashboard access"
                            }
                            onClick={() => setPauseTarget(user)}
                          >
                            {user.is_paused ? (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </>
                            ) : (
                              <>
                                <PauseCircle className="h-4 w-4 mr-1" />
                                Pause
                              </>
                            )}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setNewRole(isDeliveryRole(user.role) ? 'delivery_provider' : user.role);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Role</DialogTitle>
                                <DialogDescription>
                                  Change the role for {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Label htmlFor="role">New Role</Label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AVAILABLE_ROLES.map(role => (
                                      <SelectItem key={role.value} value={role.value}>
                                        <div className="flex items-center gap-2">
                                          <role.icon className="h-4 w-4" />
                                          {role.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-2">
                                  Current role: <strong>{user.role}</strong>
                                </p>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingUser(null)}>
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleUpdateRole}
                                  disabled={updating || rolesEquivalent(newRole, user.role)}
                                >
                                  {updating ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/40 hover:bg-destructive/10"
                            disabled={!currentUserId || user.id === currentUserId}
                            title={
                              user.id === currentUserId
                                ? "You cannot delete your own account here"
                                : "Permanently delete this user"
                            }
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={pauseTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pausing) setPauseTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pauseTarget?.is_paused ? "Resume account?" : "Pause account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pauseTarget ? (
                pauseTarget.is_paused ? (
                  <>
                    <strong>{pauseTarget.full_name || pauseTarget.email}</strong> ({pauseTarget.email}) will be able
                    to sign in and use their dashboard again.
                  </>
                ) : (
                  <>
                    <strong>{pauseTarget.full_name || pauseTarget.email}</strong> ({pauseTarget.email}) will be
                    blocked from dashboards and hidden from the public supplier feed until resumed. Their login is not
                    deleted.
                  </>
                )
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pausing}>Cancel</AlertDialogCancel>
            <Button
              variant={pauseTarget?.is_paused ? "default" : "secondary"}
              className={pauseTarget?.is_paused ? "" : "bg-amber-600 hover:bg-amber-700 text-white"}
              disabled={pausing}
              onClick={() => void handleConfirmPauseUser()}
            >
              {pausing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : pauseTarget?.is_paused ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <PauseCircle className="h-4 w-4 mr-2" />
              )}
              {pauseTarget?.is_paused ? "Resume account" : "Pause account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This removes <strong>{deleteTarget.full_name || deleteTarget.email}</strong> (
                  {deleteTarget.email}) including their login and associated data subject to database rules.
                  This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDeleteUser()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRolesManager;

