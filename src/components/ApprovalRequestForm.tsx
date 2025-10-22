import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, Upload } from "lucide-react";
import { toast } from "sonner";

const ApprovalRequestForm = () => {
  const [requestType, setRequestType] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [justification, setJustification] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Approval request submitted successfully");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Request Approval Form
        </CardTitle>
        <CardDescription>
          Submit requests for project approvals, budget allocations, or modifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget_approval">Budget Approval</SelectItem>
                  <SelectItem value="project_modification">Project Modification</SelectItem>
                  <SelectItem value="material_procurement">Material Procurement</SelectItem>
                  <SelectItem value="timeline_extension">Timeline Extension</SelectItem>
                  <SelectItem value="design_change">Design Change</SelectItem>
                  <SelectItem value="subcontractor_approval">Subcontractor Approval</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectTitle">Project/Request Title</Label>
            <Input
              id="projectTitle"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Enter descriptive title for your request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed description of what you're requesting approval for..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget Required (KES)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline">Expected Timeline</Label>
              <Input
                id="timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g., 2 weeks, 1 month"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Business Justification</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this approval is necessary, the benefits, and potential risks of not proceeding..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Supporting Documents</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upload supporting documents (plans, quotes, contracts, etc.)
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </div>
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Attached Files:</Label>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Approval Process
            </h3>
            <p className="text-sm text-muted-foreground">
              Your request will be reviewed within 2-5 business days. You'll receive notifications 
              about the approval status via email and through your dashboard.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              Submit Request
            </Button>
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ApprovalRequestForm;