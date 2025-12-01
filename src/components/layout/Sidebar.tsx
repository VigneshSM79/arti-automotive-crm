import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Droplets,
  GitBranch,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/conversations', label: 'Conversations', icon: MessageSquare },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/lead-pool', label: 'Lead Pool', icon: Droplets },
  { path: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { path: '/analytics', label: 'Analytics', icon: TrendingUp },
  { path: '/user-management', label: 'Team', icon: UserCog, adminOnly: true },
  { path: '/message-templates', label: 'Templates', icon: FileText },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { data: userRole } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Filter nav items based on admin status
  const visibleNavItems = navItems.filter((item) => {
    if ('adminOnly' in item && item.adminOnly) {
      return userRole?.isAdmin === true;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-[hsl(var(--sidebar-background))] to-[#050505] text-[hsl(var(--sidebar-foreground))] transition-all duration-300 border-r border-white/5",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--sidebar-border))]">
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-white">
              Auto<span className="text-[hsl(var(--primary))]">AI</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-[hsl(var(--sidebar-primary))] text-white shadow-md"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white",
              collapsed && "justify-center px-2"
            )}
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="ml-3">Settings</span>}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-red-400 hover:bg-red-900/20 hover:text-red-300 mt-2",
              collapsed && "justify-center px-2"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};
