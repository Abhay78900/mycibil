import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerLayout from '@/components/layout/PartnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, Save, User } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    pan_number: '',
    email: '',
  });

  useEffect(() => {
    if (!loading && user) loadProfile();
  }, [loading, user]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();
      if (!data) { navigate('/partner/register'); return; }
      setPartner(data);
      setFormData({
        name: data.name || '',
        mobile: (data as any).mobile || '',
        address: (data as any).address || '',
        pan_number: (data as any).pan_number || '',
        email: (data as any).email || '',
      });
      if ((data as any).profile_picture_url) {
        setPreviewUrl((data as any).profile_picture_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateMobile = (mobile: string) => /^[6-9]\d{9}$/.test(mobile);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }

    setIsUploading(true);
    try {
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const filePath = `${partner.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-profiles')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('partner-profiles')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + '?t=' + Date.now();

      await supabase
        .from('partners')
        .update({ profile_picture_url: publicUrl } as any)
        .eq('id', partner.id);

      setPreviewUrl(publicUrl);
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Partner name is required'); return; }
    if (formData.mobile && !validateMobile(formData.mobile)) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (formData.pan_number && !validatePan(formData.pan_number.toUpperCase())) { toast.error('Enter a valid PAN (e.g. ABCDE1234F)'); return; }
    if (formData.email && !validateEmail(formData.email)) { toast.error('Enter a valid email address'); return; }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: formData.name,
          mobile: formData.mobile || null,
          address: formData.address || null,
          pan_number: formData.pan_number.toUpperCase() || null,
          email: formData.email || null,
        } as any)
        .eq('id', partner.id);
      if (error) throw error;
      toast.success('Profile updated successfully!');
      loadProfile();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PartnerLayout partner={partner}>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your partner profile details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="w-32 h-32 border-4 border-secondary">
              <AvatarImage src={previewUrl || undefined} alt={formData.name} />
              <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground">
                {formData.name?.charAt(0)?.toUpperCase() || <User className="w-12 h-12" />}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" />Change Photo</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Max 2MB, JPG/PNG</p>

            <div className="w-full space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Franchise ID</span>
                <span className="font-mono font-bold text-foreground">{partner?.franchise_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground capitalize">{partner?.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commission</span>
                <span className="font-bold text-foreground">{partner?.commission_rate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Partner Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Card Number</Label>
                  <Input
                    id="pan"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Gmail / Email ID</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@gmail.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full business address"
                  rows={3}
                />
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Profile</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
