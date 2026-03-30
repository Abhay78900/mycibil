import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

export function usePartnerNotifications(partnerId: string | null) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnread = useCallback(async () => {
    if (!partnerId) { setLoading(false); return; }
    try {
      // Get all active notifications
      const { data: allNotifs } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Get reads for this partner
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('partner_id', partnerId);

      const readIds = new Set((reads || []).map(r => r.notification_id));
      const unread = (allNotifs || []).filter(n => !readIds.has(n.id));

      setNotifications(unread);
      setUnreadCount(unread.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  const markAsRead = async (notificationId: string) => {
    if (!partnerId) return;
    try {
      await supabase.from('notification_reads').insert({
        notification_id: notificationId,
        partner_id: partnerId,
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!partnerId || notifications.length === 0) return;
    try {
      const inserts = notifications.map(n => ({
        notification_id: n.id,
        partner_id: partnerId,
      }));
      await supabase.from('notification_reads').insert(inserts);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchUnread };
}
