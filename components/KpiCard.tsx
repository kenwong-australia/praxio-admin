import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Users, MessageSquare, Star, Activity } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const iconMap = {
  'Total Scenarios': Users,
  'Total Processing Time (s)': Clock,
  'Avg Processing Time (s)': Activity,
  'Engagement Rate': TrendingUp,
  'Total Feedback': MessageSquare,
  'Avg Feedback Score': Star,
} as const;

export function KpiCard({ title, value, change, trend = 'neutral' }: KpiCardProps) {
  const Icon = iconMap[title as keyof typeof iconMap] || Activity;
  
  return (
    <Card className="relative overflow-hidden bg-card text-card-foreground border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {typeof value === 'number' 
            ? title.includes('Rate') 
              ? `${value}%` 
              : title.includes('Time') 
                ? `${value}s`
                : value.toLocaleString()
            : value}
        </div>
        {change && (
          <div className={`text-xs flex items-center gap-1 ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-muted-foreground'
          }`}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {change}
          </div>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </Card>
  );
}