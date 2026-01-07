import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Type helper for tables not yet in generated types
const db = supabase as any;
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Shield,
  Trash2,
  Edit,
  Key,
  Mail,
  User,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";
import { logActivity } from "@/utils/activityLogger";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  staff_code: string; // Unique staff code for admin login (UJPRO-YYYY-NNNN)
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login?: string;
  created_by?: string;
}

import { STAFF_ROLES as ROLE_CONFIG, getAllStaffRoles, TAB_METADATA, AdminTab } from '@/config/staffPermissions';

// Get all roles for selection
const STAFF_ROLES = getAllStaffRoles().map(role => ({
  value: role.id,
  label: role.name,
  description: role.description,
  color: role.color,
  allowedTabs: role.allowedTabs
}));

export const StaffManagement = () => {
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  
  // Form state
  const [newStaff, setNewStaff] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'support',
    password: ''
  });

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaff(prev => ({ ...prev, password }));
    return password;
  };

  /**
   * Generate unique staff code in format: UJPRO-YYYY-NNNN
   * Where YYYY is the current year and NNNN is a sequential number
   */
  const generateStaffCode = async (): Promise<string> => {
    const year = new Date().getFullYear();
    
    try {
      // Get the highest existing staff code number for this year
      const { data: existingStaff } = await db
        .from('admin_staff')
        .select('staff_code')
        .like('staff_code', `UJPRO-${year}-%`)
        .order('staff_code', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      
      if (existingStaff && existingStaff.length > 0 && existingStaff[0].staff_code) {
        // Extract the number from the last staff code
        const lastCode = existingStaff[0].staff_code;
        const match = lastCode.match(/UJPRO-\d{4}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format: UJPRO-YYYY-NNNN (e.g., UJPRO-2025-0001)
      const staffCode = `UJPRO-${year}-${nextNumber.toString().padStart(4, '0')}`;
      console.log('📝 Generated staff code:', staffCode);
      return staffCode;
    } catch (error) {
      console.error('Error generating staff code:', error);
      // Fallback: generate a random code
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      return `UJPRO-${year}-${randomNum}`;
    }
  };

  // Fetch staff members
  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      // Try to fetch with all columns including staff_code
      let { data, error } = await db
        .from('admin_staff')
        .select('id, email, full_name, phone, role, staff_code, status, created_at, last_login, created_by')
        .order('created_at', { ascending: false });

      // If staff_code column doesn't exist, fetch without it
      if (error && error.message?.includes('staff_code')) {
        console.log('📝 staff_code column not found, fetching without it...');
        const result = await db
          .from('admin_staff')
          .select('id, email, full_name, phone, role, status, created_at, last_login, created_by')
          .order('created_at', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching staff:', error);
        // If table doesn't exist, show empty state
        setStaffMembers([]);
      } else {
        // Add empty staff_code if not present
        const staffWithCode = (data || []).map((staff: any) => ({
          ...staff,
          staff_code: staff.staff_code || null
        }));
        setStaffMembers(staffWithCode);
        console.log('👥 Loaded', staffWithCode.length, 'staff members');
      }
    } catch (err) {
      console.error('Staff fetch error:', err);
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  // State for generated staff code
  const [generatedStaffCode, setGeneratedStaffCode] = useState('');

  // Create new staff member
  const handleCreateStaff = async () => {
    if (!newStaff.email || !newStaff.full_name || !newStaff.password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields."
      });
      return;
    }

    if (newStaff.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 8 characters."
      });
      return;
    }

    setCreating(true);
    try {
      // 1. Generate unique staff code
      const staffCode = await generateStaffCode();
      console.log('📝 Staff code generated:', staffCode);

      // 2. Create auth user (password is used for Supabase auth if needed)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email.trim().toLowerCase(),
        password: newStaff.password,
        options: {
          data: {
            full_name: newStaff.full_name,
            role: 'staff',
            staff_role: newStaff.role,
            staff_code: staffCode
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 3. Add to admin_staff table with staff_code
      // Try with staff_code first, fallback without it if column doesn't exist
      let staffError = null;
      
      try {
        const { error } = await db
          .from('admin_staff')
          .insert({
            id: authData.user.id,
            email: newStaff.email.trim().toLowerCase(),
            full_name: newStaff.full_name,
            phone: newStaff.phone || null,
            role: newStaff.role,
            staff_code: staffCode,
            status: 'active',
            created_by: (await supabase.auth.getUser()).data.user?.email || 'admin'
          });
        staffError = error;
        
        // If staff_code column doesn't exist, try without it
        if (error && error.message?.includes('staff_code')) {
          console.log('📝 staff_code column not found, inserting without it...');
          const { error: fallbackError } = await db
            .from('admin_staff')
            .insert({
              id: authData.user.id,
              email: newStaff.email.trim().toLowerCase(),
              full_name: newStaff.full_name,
              phone: newStaff.phone || null,
              role: newStaff.role,
              status: 'active',
              created_by: (await supabase.auth.getUser()).data.user?.email || 'admin'
            });
          staffError = fallbackError;
        }
      } catch (err) {
        console.error('Staff table insert error:', err);
      }

      if (staffError) {
        console.error('Staff table insert error:', staffError);
        // Continue anyway - auth user created
      }

      // 4. Log activity
      await logActivity({
        action: 'staff_created',
        category: 'admin',
        details: `Created new staff member: ${newStaff.full_name} (${newStaff.email}) with role: ${newStaff.role}, staff code: ${staffCode}`,
        metadata: { staff_email: newStaff.email, staff_role: newStaff.role, staff_code: staffCode }
      });

      // Store generated credentials for display
      setGeneratedPassword(newStaff.password);
      setGeneratedStaffCode(staffCode);
      setShowGeneratedPassword(true);

      toast({
        title: "✅ Staff Member Created",
        description: `Account created for ${newStaff.full_name}. Save the credentials!`,
        duration: 10000
      });

      // Reset form but keep dialog open to show credentials
      setNewStaff({
        email: '',
        full_name: '',
        phone: '',
        role: 'support',
        password: ''
      });

      fetchStaffMembers();
    } catch (error: any) {
      console.error('Create staff error:', error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create staff account."
      });
    } finally {
      setCreating(false);
    }
  };

  // Update staff status
  const updateStaffStatus = async (staffId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const { error } = await db
        .from('admin_staff')
        .update({ status: newStatus })
        .eq('id', staffId);

      if (error) throw error;

      const staff = staffMembers.find(s => s.id === staffId);
      await logActivity({
        action: 'staff_status_changed',
        category: 'admin',
        details: `Changed staff status: ${staff?.email} → ${newStatus}`,
        metadata: { staff_id: staffId, new_status: newStatus }
      });

      toast({
        title: "Status Updated",
        description: `Staff member status changed to ${newStatus}.`
      });

      fetchStaffMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
    }
  };

  // Delete staff member
  const deleteStaffMember = async (staffId: string, email: string) => {
    try {
      const { error } = await db
        .from('admin_staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      await logActivity({
        action: 'staff_deleted',
        category: 'admin',
        details: `Deleted staff member: ${email}`,
        metadata: { staff_id: staffId, staff_email: email }
      });

      toast({
        title: "Staff Member Removed",
        description: `${email} has been removed from staff.`
      });

      fetchStaffMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message
      });
    }
  };

  // Copy password to clipboard
  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard."
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-600"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-600"><UserX className="h-3 w-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-600',
      manager: 'bg-blue-600',
      moderator: 'bg-indigo-600',
      support: 'bg-teal-600',
      viewer: 'bg-gray-600'
    };
    return <Badge className={colors[role] || 'bg-gray-600'}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                Staff Management
              </CardTitle>
              <CardDescription className="text-gray-400">
                Create and manage admin dashboard staff accounts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStaffMembers}
                className="border-slate-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Staff Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Staff Account</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Create a new staff member account with dashboard access.
                    </DialogDescription>
                  </DialogHeader>

                  {showGeneratedPassword ? (
                    // Show generated credentials (staff code + password)
                    <div className="space-y-4 py-4">
                      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <span className="text-green-400 font-medium">Account Created Successfully!</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">
                          Save these credentials securely. They won't be shown again.
                        </p>
                        
                        {/* Staff Code - This is what they use to sign in */}
                        <div className="mb-3">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            🔐 Staff Code (for Admin Portal login)
                          </Label>
                          <div className="bg-slate-800 rounded p-3 flex items-center justify-between">
                            <code className="text-green-400 font-mono text-lg">
                              {generatedStaffCode}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedStaffCode);
                                toast({ title: "Copied!", description: "Staff code copied to clipboard." });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Password - For Supabase auth if needed */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-1 block">
                            🔑 Password (backup authentication)
                          </Label>
                          <div className="bg-slate-800 rounded p-3 flex items-center justify-between">
                            <code className="text-yellow-400 font-mono">
                              {showPassword ? generatedPassword : '••••••••••••'}
                            </code>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyPassword}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Instructions */}
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                        <p className="text-blue-300 text-sm">
                          <strong>📋 Instructions for new staff:</strong>
                        </p>
                        <ol className="text-gray-300 text-xs mt-2 space-y-1 list-decimal list-inside">
                          <li>Go to <code className="text-blue-400">/admin-login</code></li>
                          <li>Enter their work email address</li>
                          <li>Enter the Staff Code: <code className="text-green-400">{generatedStaffCode}</code></li>
                        </ol>
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={() => {
                          setShowGeneratedPassword(false);
                          setGeneratedPassword('');
                          setGeneratedStaffCode('');
                          setShowCreateDialog(false);
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    // Create form
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="John Doe"
                            value={newStaff.full_name}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, full_name: e.target.value }))}
                            className="pl-10 bg-slate-800 border-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                          <Input
                            type="email"
                            placeholder="staff@company.com"
                            value={newStaff.email}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10 bg-slate-800 border-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="+254 7XX XXX XXX"
                            value={newStaff.phone}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                            className="pl-10 bg-slate-800 border-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Role *</Label>
                        <Select
                          value={newStaff.role}
                          onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {STAFF_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-xs text-gray-400">{role.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Password *</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Min 8 characters"
                              value={newStaff.password}
                              onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))}
                              className="pl-10 pr-10 bg-slate-800 border-slate-600"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generatePassword}
                            className="border-slate-600"
                          >
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showGeneratedPassword && (
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="border-slate-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateStaff}
                        disabled={creating}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Account
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Staff List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-400" />
            Staff Members ({staffMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No staff members yet.</p>
              <p className="text-sm">Click "Add Staff Member" to create the first account.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Staff Code</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">
                      {staff.full_name}
                    </TableCell>
                    <TableCell className="text-gray-300">{staff.email}</TableCell>
                    <TableCell>
                      <code className="text-green-400 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                        {staff.staff_code || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>{getRoleBadge(staff.role)}</TableCell>
                    <TableCell>{getStatusBadge(staff.status)}</TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(staff.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={staff.status}
                          onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                            updateStaffStatus(staff.id, value)
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8 bg-slate-800 border-slate-600 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-8">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Remove Staff Member?</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                This will remove {staff.full_name} ({staff.email}) from the staff list.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-800 border-slate-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteStaffMember(staff.id, staff.email)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Role Permissions & Dashboard Access
          </CardTitle>
          <CardDescription className="text-gray-400">
            Each role has access to specific dashboard tabs based on their responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {STAFF_ROLES.map((role) => (
              <div key={role.value} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={role.color}>{role.label}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {role.allowedTabs.length} tabs accessible
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{role.description}</p>
                
                {/* Show accessible tabs */}
                <div className="flex flex-wrap gap-1">
                  {role.allowedTabs.map((tab: string) => {
                    const tabMeta = TAB_METADATA[tab as AdminTab];
                    return (
                      <Badge 
                        key={tab} 
                        variant="outline" 
                        className="text-xs bg-slate-700/50 border-slate-600 text-gray-300"
                      >
                        {tabMeta?.name || tab}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;

