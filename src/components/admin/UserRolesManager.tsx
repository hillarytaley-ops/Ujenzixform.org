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
import { supabase } from "@/integrations/supabase/client";
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
  Users,
  Building2,
  Store,
  Truck,
  ShoppingBag,
  HardHat
} from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-500' },
  { value: 'supplier', label: 'Supplier', icon: Store, color: 'bg-amber-500' },
  { value: 'delivery_provider', label: 'Delivery Provider', icon: Truck, color: 'bg-purple-500' },
  { value: 'private_client', label: 'Private Builder', icon: ShoppingBag, color: 'bg-green-500' },
  { value: 'professional_builder', label: 'Professional Builder', icon: HardHat, color: 'bg-blue-500' },
];

export const UserRolesManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_all_users_with_roles');
      if (rpcError) throw rpcError;

      const combinedUsers: UserWithRole[] = (rpcData || []).map((row: { user_id: string; role: string; created_at: string; full_name?: string; email?: string }) => ({
        id: row.user_id,
        email: row.email || row.full_name || `User ${row.user_id?.slice(0, 8)}...`,
        role: row.role,
        created_at: row.created_at,
        full_name: row.full_name || undefined,
      }));

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
      // Update the user's role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', editingUser.id);

      if (error) throw error;

      toast({
        title: "✅ Role Updated",
        description: `${editingUser.email} is now a ${newRole}`,
      });

      // Refresh the list
      await fetchUsers();
      setEditingUser(null);
      setNewRole("");
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
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
    count: users.filter(u => u.role === role.value).length
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
            View and edit user roles. Changes take effect immediately.
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
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setNewRole(user.role);
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
                                  disabled={updating || newRole === user.role}
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
    </div>
  );
};

export default UserRolesManager;

