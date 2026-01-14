import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  Briefcase,
  IndianRupee,
  Calendar,
  MessageSquare,
  Save,
  Trash2,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  PartnerLead,
  LeadActivityLog,
  LeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  INVESTMENT_CAPACITY_LABELS,
  INTERESTED_SERVICES_LABELS,
} from '@/types/partnerLead';

export default function AdminPartnerLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [lead, setLead] = useState<PartnerLead | null>(null);
  const [activityLogs, setActivityLogs] = useState<LeadActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new');
  const [adminNotes, setAdminNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole === 'admin' && id) {
      loadLead();
      loadActivityLogs();
    }
  }, [user, userRole, id]);

  const loadLead = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const typedLead = data as PartnerLead;
      setLead(typedLead);
      setSelectedStatus(typedLead.status);
      setAdminNotes(typedLead.admin_notes || '');
      setFollowUpDate(typedLead.follow_up_date || '');
    } catch (error: any) {
      toast({
        title: 'Error loading lead',
        description: error.message,
        variant: 'destructive'
      });
      navigate('/admin/partner-leads');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_activity_logs')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivityLogs((data || []) as LeadActivityLog[]);
    } catch (error: any) {
      console.error('Error loading activity logs:', error);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);

    try {
      const oldStatus = lead.status;
      const statusChanged = oldStatus !== selectedStatus;

      // Update lead
      const { error: updateError } = await supabase
        .from('partner_leads')
        .update({
          status: selectedStatus,
          admin_notes: adminNotes,
          follow_up_date: followUpDate || null,
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // Log activity if status changed or note added
      if (statusChanged || newNote) {
        const { error: logError } = await supabase
          .from('lead_activity_logs')
          .insert({
            lead_id: lead.id,
            admin_id: user?.id,
            action: statusChanged ? 'Status Changed' : 'Note Added',
            old_status: statusChanged ? oldStatus : null,
            new_status: statusChanged ? selectedStatus : null,
            notes: newNote || null,
          });

        if (logError) throw logError;
      }

      toast({
        title: 'Lead Updated',
        description: 'Changes saved successfully.',
      });

      setNewNote('');
      loadLead();
      loadActivityLogs();
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    try {
      const { error } = await supabase
        .from('partner_leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Lead Deleted',
        description: 'The lead has been removed.',
      });

      navigate('/admin/partner-leads');
    } catch (error: any) {
      toast({
        title: 'Error deleting',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar onLogout={handleLogout} />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/partner-leads')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{lead.full_name}</h1>
                <p className="text-muted-foreground">Lead ID: {lead.id.slice(0, 8)}...</p>
              </div>
            </div>
            <Badge className={`${LEAD_STATUS_COLORS[lead.status]} text-sm px-3 py-1`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lead Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Mobile</p>
                        <p className="font-medium">{lead.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{lead.city}, {lead.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted On</p>
                        <p className="font-medium">{format(new Date(lead.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {lead.business_name && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/50 rounded-lg">
                          <Building2 className="w-4 h-4 text-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Business Name</p>
                          <p className="font-medium">{lead.business_name}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/50 rounded-lg">
                        <Briefcase className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Occupation</p>
                        <p className="font-medium">{lead.current_occupation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/50 rounded-lg">
                        <IndianRupee className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Investment Capacity</p>
                        <p className="font-medium">{INVESTMENT_CAPACITY_LABELS[lead.investment_capacity]}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Finance Experience</p>
                      <Badge variant={lead.finance_experience ? 'default' : 'secondary'}>
                        {lead.finance_experience ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interested Services</p>
                      <p className="font-medium">{INTERESTED_SERVICES_LABELS[lead.interested_services]}</p>
                    </div>
                  </div>

                  {lead.message && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Message from Lead</p>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{lead.message}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Activity History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No activity recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
                          <div className="w-2 h-2 mt-2 bg-primary rounded-full" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{log.action}</span>
                              {log.old_status && log.new_status && (
                                <span className="text-xs text-muted-foreground">
                                  {LEAD_STATUS_LABELS[log.old_status]} → {LEAD_STATUS_LABELS[log.new_status]}
                                </span>
                              )}
                            </div>
                            {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Lead</CardTitle>
                  <CardDescription>Update status and add notes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as LeadStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Follow-up Date</label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                    <Textarea
                      placeholder="Internal notes about this lead..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Add Activity Note
                    </label>
                    <Textarea
                      placeholder="Log a call, meeting, or update..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button className="w-full" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Lead
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the lead and all associated activity logs.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
