import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface ServiceCardProps {
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  version: string;
  lastDeployed: string;
  url?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ServiceCard({
  name,
  description,
  status,
  version,
  lastDeployed,
  url,
  className,
  style
}: ServiceCardProps) {
  return (
    <div className={cn("service-card", className)} style={style}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-card-foreground text-base lg:text-lg truncate">{name}</h3>
            {url && (
              <button className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{description}</p>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Version</span>
          <span className="font-medium text-card-foreground">{version}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Deployed</span>
          <span className="font-medium text-card-foreground">{lastDeployed}</span>
        </div>
      </div>
      
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border",
        {
          "bg-success/10 text-success border-success/20": status === 'healthy',
          "bg-warning/10 text-warning border-warning/20": status === 'warning',
          "bg-destructive/10 text-destructive border-destructive/20": status === 'error',
        }
      )}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          {
            "bg-success": status === 'healthy',
            "bg-warning": status === 'warning',
            "bg-destructive": status === 'error',
          }
        )} />
        <span className="capitalize">{status}</span>
      </div>
    </div>
  );
}