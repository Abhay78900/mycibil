import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Search, 
  Download, 
  Eye, 
  RefreshCw, 
  FileJson, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BureauApiLog {
  id: string;
  report_id: string;
  user_id: string;
  partner_id: string | null;
  bureau_code: string;
  bureau_name: string;
  request_payload: any;
  response_json: any;
  response_status: number;
  is_sandbox: boolean;
  error_message: string | null;
  processing_time_ms: number;
  created_at: string;
}

const bureauColors: Record<string, string> = {
  cibil: 'bg-blue-500/10 text-blue-600 border-blue-200',
  experian: 'bg-purple-500/10 text-purple-600 border-purple-200',
  equifax: 'bg-orange-500/10 text-orange-600 border-orange-200',
  crif: 'bg-green-500/10 text-green-600 border-green-200',
};

export default function AdminApiLogs() {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<BureauApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bureauFilter, setBureauFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<BureauApiLog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && userRole !== 'admin') {
      navigate('/');
    }
  }, [authLoading, userRole, navigate]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bureau_api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data || []) as BureauApiLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch API logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.report_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.bureau_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBureau = bureauFilter === 'all' || log.bureau_code === bureauFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'success' && log.response_status >= 200 && log.response_status < 300) ||
      (statusFilter === 'error' && (log.response_status >= 400 || log.error_message)) ||
      (statusFilter === 'sandbox' && log.is_sandbox);

    return matchesSearch && matchesBureau && matchesStatus;
  });

  const downloadJson = (log: BureauApiLog, type: 'request' | 'response' | 'full') => {
    let data: any;
    let filename: string;

    if (type === 'request') {
      data = log.request_payload;
      filename = `${log.bureau_code}_request_${log.id}.json`;
    } else if (type === 'response') {
      data = log.response_json;
      filename = `${log.bureau_code}_response_${log.id}.json`;
    } else {
      data = {
        id: log.id,
        report_id: log.report_id,
        bureau: log.bureau_name,
        timestamp: log.created_at,
        request: log.request_payload,
        response: log.response_json,
        status: log.response_status,
        error: log.error_message,
        processing_time_ms: log.processing_time_ms,
        is_sandbox: log.is_sandbox
      };
      filename = `${log.bureau_code}_full_log_${log.id}.json`;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const getStatusBadge = (log: BureauApiLog) => {
    if (log.is_sandbox) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Sandbox</Badge>;
    }
    if (log.error_message || log.response_status >= 400) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Success</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Bureau API Logs</h1>
              <p className="text-muted-foreground">View, download, and analyze raw API requests/responses</p>
            </div>
            <Button onClick={fetchLogs} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Report ID, Bureau, or User ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={bureauFilter} onValueChange={setBureauFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Bureau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bureaus</SelectItem>
                    <SelectItem value="cibil">CIBIL</SelectItem>
                    <SelectItem value="experian">Experian</SelectItem>
                    <SelectItem value="equifax">Equifax</SelectItem>
                    <SelectItem value="crif">CRIF</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <FileJson className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{logs.length}</p>
                    <p className="text-xs text-muted-foreground">Total Logs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{logs.filter(l => !l.error_message && l.response_status < 400).length}</p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{logs.filter(l => l.error_message || l.response_status >= 400).length}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{logs.filter(l => l.is_sandbox).length}</p>
                    <p className="text-xs text-muted-foreground">Sandbox</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>API Call History</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">Bureau</th>
                      <th className="text-left p-3 font-medium">Report ID</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant="outline" 
                            className={bureauColors[log.bureau_code] || 'bg-muted'}
                          >
                            {log.bureau_code.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {log.report_id.substring(0, 8)}...
                        </td>
                        <td className="p-3">
                          {getStatusBadge(log)}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {log.processing_time_ms}ms
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedLog(log);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadJson(log, 'full')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredLogs.length === 0 && (
                  <div className="text-center py-12">
                    <FileJson className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No API logs found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={bureauColors[selectedLog?.bureau_code || ''] || ''}>
                {selectedLog?.bureau_code.toUpperCase()}
              </Badge>
              API Log Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.created_at && format(new Date(selectedLog.created_at), 'PPpp')}
              {selectedLog?.is_sandbox && ' (Sandbox Mode)'}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="meta">Metadata</TabsTrigger>
              </TabsList>

              <div className="flex justify-end gap-2 my-4">
                <Button size="sm" variant="outline" onClick={() => downloadJson(selectedLog, 'request')}>
                  <Download className="w-4 h-4 mr-2" />
                  Request JSON
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadJson(selectedLog, 'response')}>
                  <Download className="w-4 h-4 mr-2" />
                  Response JSON
                </Button>
                <Button size="sm" onClick={() => downloadJson(selectedLog, 'full')}>
                  <Download className="w-4 h-4 mr-2" />
                  Full Log
                </Button>
              </div>

              <TabsContent value="request">
                <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.request_payload, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="response">
                <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.response_json, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="meta">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Log ID</p>
                      <p className="font-mono text-sm">{selectedLog.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Report ID</p>
                      <p className="font-mono text-sm">{selectedLog.report_id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm">{selectedLog.user_id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Partner ID</p>
                      <p className="font-mono text-sm">{selectedLog.partner_id || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Response Status</p>
                      <p className="font-mono text-sm">{selectedLog.response_status}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Processing Time</p>
                      <p className="font-mono text-sm">{selectedLog.processing_time_ms}ms</p>
                    </div>
                  </div>

                  {selectedLog.error_message && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Error Message</p>
                      <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
