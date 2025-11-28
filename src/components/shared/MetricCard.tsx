import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'primary' | 'warning' | 'secondary' | 'destructive';
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-primary/10 text-primary', // Brand Orange-Red
  warning: 'bg-warning/10 text-warning', // Amber Yellow
  secondary: 'bg-secondary/10 text-secondary', // Emerald Green
  destructive: 'bg-destructive/10 text-destructive',
};

export const MetricCard = ({ title, value, icon: Icon, variant = 'primary', loading }: MetricCardProps) => {
  return (
    <Card className="transition-all hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-lg ${variantClasses[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}
      </CardContent>
    </Card>
  );
};
