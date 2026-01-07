import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Mail, 
  Edit, 
  Eye, 
  Save, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Camera,
  Shield,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body: string;
  available_variables: string[];
  is_active: boolean;
  priority: string;
  created_at: string;
  updated_at: string;
}

export const EmailTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active, updated_at: new Date().toISOString() })
        .eq('id', template.id);

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));
      
      toast.success(`Template ${template.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate || !editedTemplate) return;
    
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editedTemplate.subject,
          html_body: editedTemplate.html_body,
          text_body: editedTemplate.text_body,
          priority: editedTemplate.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? { ...t, ...editedTemplate } : t
      ));
      
      toast.success('Template saved successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const getTemplateIcon = (key: string) => {
    if (key.includes('camera')) return <Camera className="h-4 w-4" />;
    if (key.includes('delivery')) return <Truck className="h-4 w-4" />;
    if (key.includes('security')) return <Shield className="h-4 w-4" />;
    if (key.includes('access')) return <CheckCircle className="h-4 w-4" />;
    return <Mail className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const openPreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
    setEditMode(false);
  };

  const openEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({
      subject: template.subject,
      html_body: template.html_body,
      text_body: template.text_body,
      priority: template.priority
    });
    setEditMode(true);
    setPreviewMode(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage notification email templates
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Templates List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No email templates found</p>
              <p className="text-sm">Run the migration to create default templates</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {getTemplateIcon(template.template_key)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.template_name}</span>
                          <Badge className={getPriorityColor(template.priority)}>
                            {template.priority}
                          </Badge>
                          {!template.is_active && (
                            <Badge variant="outline" className="text-gray-500">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Key: {template.template_key}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => toggleTemplateActive(template)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Variables */}
                  {template.available_variables && template.available_variables.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Available Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.available_variables.map((variable, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-mono">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview: {selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>
              Preview how this email will appear to recipients
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <div className="p-3 bg-muted rounded-md font-medium">
                  {selectedTemplate.subject}
                </div>
              </div>
              
              <div>
                <Label>HTML Preview</Label>
                <div 
                  className="border rounded-md p-4 bg-white overflow-auto max-h-[400px]"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.html_body }}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPreviewMode(false);
              if (selectedTemplate) openEdit(selectedTemplate);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>
              Modify the email template content
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={editedTemplate.priority} 
                    onValueChange={(v) => setEditedTemplate({ ...editedTemplate, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Template Key (read-only)</Label>
                  <Input value={selectedTemplate.template_key} disabled />
                </div>
              </div>
              
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={editedTemplate.subject || ''}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                />
              </div>
              
              <div>
                <Label>HTML Body</Label>
                <Textarea
                  value={editedTemplate.html_body || ''}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, html_body: e.target.value })}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
              
              <div>
                <Label>Plain Text Body (fallback)</Label>
                <Textarea
                  value={editedTemplate.text_body || ''}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, text_body: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
              
              {/* Variables Reference */}
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.available_variables?.map((variable, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-mono">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesManager;














