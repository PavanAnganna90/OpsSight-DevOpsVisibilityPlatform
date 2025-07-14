import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CircleStackIcon,
  ServerIcon,
  CommandLineIcon,
  BellIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CogIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { useNavigationPermissions } from '@/hooks/usePermissions';

/**
 * Navigation item structure for sidebar links
 */
interface NavItem {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  description?: string;
  permission?: string;
  roles?: string[];
  adminOnly?: boolean;
}

/**
 * Main navigation items with RBAC
 * Reason: Permission-based navigation for secure access
 */
const navigation: NavItem[] = [
  { 
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Overview of all DevOps metrics',
    permission: 'view_dashboard'
  },
  { 
    name: 'CI/CD Pipelines',
    href: '/pipelines',
    icon: CircleStackIcon,
    description: 'Manage and monitor CI/CD pipelines',
    permission: 'view_pipelines'
  },
  { 
    name: 'Kubernetes',
    href: '/kubernetes',
    icon: ServerIcon,
    description: 'Kubernetes cluster management',
    permission: 'view_clusters'
  },
  { 
    name: 'Infrastructure',
    href: '/infrastructure',
    icon: CommandLineIcon,
    description: 'Infrastructure provisioning and monitoring',
    permission: 'view_infrastructure'
  },
  { 
    name: 'Teams',
    href: '/teams',
    icon: UsersIcon,
    description: 'Team management and collaboration',
    permission: 'view_teams'
  },
  { 
    name: 'Monitoring',
    href: '/monitoring',
    icon: ChartBarIcon,
    description: 'System monitoring and metrics',
    permission: 'view_monitoring'
  },
  { 
    name: 'Alerts',
    href: '/alerts',
    icon: BellIcon,
    description: 'System alerts and notifications',
    permission: 'view_alerts'
  },
  { 
    name: 'Costs',
    href: '/costs',
    icon: CurrencyDollarIcon,
    description: 'Infrastructure cost analysis',
    permission: 'view_cost_analysis'
  },
  { 
    name: 'Admin',
    href: '/admin',
    icon: ShieldCheckIcon,
    description: 'Administration and user management',
    adminOnly: true
  },
  { 
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    description: 'Application settings and configuration',
    permission: 'view_settings'
  },
];

/**
 * Navigation link component for consistent styling
 */
interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

/**
 * Individual navigation link component with RBAC
 * 
 * @param {NavLinkProps} props - Component props
 * @returns {React.ReactElement} Navigation link component
 */
const NavLink: FC<NavLinkProps> = ({ item, isActive }): React.ReactElement => {
  const renderLink = () => (
    <Link
      href={item.href}
      className={clsx(
        isActive
          ? 'bg-gray-800 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800',
        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
      )}
      title={item.description}
    >
      <item.icon
        className="h-6 w-6 shrink-0"
        aria-hidden="true"
      />
      {item.name}
    </Link>
  );

  // Apply permission guard based on item requirements
  if (item.adminOnly) {
    return (
      <PermissionGuard roles={['admin', 'organization_owner', 'super_admin']}>
        {renderLink()}
      </PermissionGuard>
    );
  }

  if (item.permission) {
    return (
      <PermissionGuard permission={item.permission}>
        {renderLink()}
      </PermissionGuard>
    );
  }

  if (item.roles) {
    return (
      <PermissionGuard roles={item.roles}>
        {renderLink()}
      </PermissionGuard>
    );
  }

  return renderLink();
};

/**
 * Sidebar component providing main navigation for the application
 * 
 * @returns {React.ReactElement} Sidebar component
 */
const Sidebar: FC = (): React.ReactElement => {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-y-5 bg-gray-900 px-6 py-4">
      {/* Reason: Logo and branding section */}
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-2xl font-bold text-white">OpsSight</h1>
      </div>

      {/* Reason: Main navigation section */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    item={item}
                    isActive={pathname === item.href}
                  />
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 