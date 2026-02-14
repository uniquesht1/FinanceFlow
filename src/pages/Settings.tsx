import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, LogOut, Check, Globe } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ExportDataCard } from '@/components/settings/ExportDataCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const { timezone, setTimezone } = useTimezone();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setDisplayName(data.display_name || '');
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);
    
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast({
        title: 'Profile updated',
        description: 'Your display name has been updated successfully.'
      });
    }
  };

  const handleTimezoneChange = async (value: string) => {
    await setTimezone(value as 'Asia/Kathmandu' | 'Australia/Sydney');
    toast({
      title: 'Timezone updated',
      description: `Timezone changed to ${value === 'Asia/Kathmandu' ? 'Kathmandu' : 'Sydney'}.`
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Settings */}
        <Card className="animate-fade-up border-border/50 overflow-hidden" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input 
                value={user?.email || ''} 
                disabled 
                className="bg-muted/50 transition-all duration-200"
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button 
              onClick={handleUpdateProfile} 
              disabled={isLoading}
              className="group shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Timezone Settings */}
        <Card className="animate-fade-up border-border/50 overflow-hidden" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Timezone</CardTitle>
                <CardDescription>Set your preferred timezone for displaying times</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Select Timezone</Label>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kathmandu">Kathmandu (Nepal)</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney (Australia)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                All transaction times will be displayed in this timezone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <ExportDataCard />
        </div>

        {/* Account Actions */}
        <Card className="animate-fade-up border-border/50" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={signOut}
              className="group shadow-md shadow-destructive/25 hover:shadow-lg hover:shadow-destructive/30 transition-all duration-300 hover:scale-105"
            >
              <LogOut className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
