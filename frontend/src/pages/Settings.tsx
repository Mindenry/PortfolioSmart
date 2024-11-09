import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  Save,
  Moon,
  Sun,
  Globe2,
  Bell,
  User,
  Mail,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';
import { translations, useTranslation } from "@/utils/translations";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const settingsFormSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  theme: z.enum(['light', 'dark']),
  language: z.enum(['en', 'th']),
  emailNotifications: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('profile');
  const { user, token, updateUser } = useAuth();
  const { theme, language, setTheme, setLanguage } = useSettings();
  const { toast } = useToast();
  const t = useTranslation(language);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      username: '',
      email: '',
      theme: theme,
      language: language,
      emailNotifications: true,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:8080/api/user/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const data = await response.json();
        form.reset({
          username: data.username || user?.username || '',
          email: data.email || user?.email || '',
          theme: data.theme || theme,
          language: data.language || language,
          emailNotifications: data.email_notifications ?? true,
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Still set the form with user data if settings fetch fails
        if (user) {
          form.reset({
            username: user.username || '',
            email: user.email || '',
            theme: theme,
            language: language,
            emailNotifications: true,
          });
        }
      }
    };

    fetchSettings();
  }, [user, token]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!data.username || !data.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Username and email are required",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username.trim(),
          email: data.email.trim(),
          theme: data.theme,
          language: data.language,
          emailNotifications: data.emailNotifications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      const updatedUser = await response.json();
      
      // Update theme and language after successful update
      setTheme(data.theme);
      setLanguage(data.language);
      
      // Update user context
      updateUser({
        ...user,
        username: data.username.trim(),
        email: data.email.trim(),
      });
      
      toast({
        title: "Settings updated",
        description: "Your settings have been successfully updated",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const sections = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'preferences', label: t('settings.preferences'), icon: Globe2 },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
  ];
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container max-w-6xl mx-auto py-10 px-4"
    >
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <Card className="md:w-64 p-4 h-fit">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <motion.button
                  key={section.id}
                  variants={itemVariants}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.label}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${
                    activeSection === section.id ? 'rotate-90' : ''
                  }`} />
                </motion.button>
              );
            })}
          </nav>
        </Card>
        {/* Main Content */}
        <div className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                {activeSection === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <Card className="p-6">
                      <h2 className="text-2xl font-semibold mb-6">{t('settings.profile.info')}</h2>
                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.username')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} className="pl-10" />
                                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.email')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type="email" className="pl-10" />
                                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  </motion.div>
                )}
                {activeSection === 'preferences' && (
                  <motion.div
                    key="preferences"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <Card className="p-6">
                      <h2 className="text-2xl font-semibold mb-6">{t('settings.preferences')}</h2>
                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="theme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.theme')}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select theme" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="light" className="flex items-center gap-2">
                                    <Sun className="h-4 w-4" />
                                    <span>{t('settings.theme.light')}</span>
                                  </SelectItem>
                                  <SelectItem value="dark" className="flex items-center gap-2">
                                    <Moon className="h-4 w-4" />
                                    <span>{t('settings.theme.dark')}</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.language')}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="en">{t('settings.language.en')}</SelectItem>
                                  <SelectItem value="th">{t('settings.language.th')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  </motion.div>
                )}
                {activeSection === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <Card className="p-6">
                      <h2 className="text-2xl font-semibold mb-6">{t('settings.notifications')}</h2>
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{t('settings.notifications.email')}</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                {t('settings.notifications.description')}
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              <Card className="p-4 mt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('settings.save')}
                    </>
                  )}
                </Button>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </motion.div>
  );
}