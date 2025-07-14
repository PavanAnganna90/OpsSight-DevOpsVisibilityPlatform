/**
 * End-to-End RBAC Flow Tests
 * Tests the complete RBAC system from login to permission-based UI rendering.
 */

import { test, expect } from '@playwright/test';

// Mock user credentials for different roles
const USERS = {
  admin: {
    username: 'admin@example.com',
    password: 'admin123',
    roles: ['organization_owner'],
    permissions: ['manage_roles', 'manage_users', 'manage_infrastructure', 'view_dashboard']
  },
  manager: {
    username: 'manager@example.com',
    password: 'manager123',
    roles: ['team_lead'],
    permissions: ['view_dashboard', 'view_teams', 'manage_teams']
  },
  developer: {
    username: 'developer@example.com',
    password: 'developer123',
    roles: ['developer'],
    permissions: ['view_dashboard', 'view_infrastructure']
  },
  viewer: {
    username: 'viewer@example.com',
    password: 'viewer123',
    roles: ['viewer'],
    permissions: ['view_dashboard']
  }
};

test.describe('RBAC End-to-End Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock API responses for authentication and user data
    await page.route('**/api/v1/auth/login/github', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Simulate different user responses based on login data
      const user = Object.values(USERS).find(u => 
        postData.email === u.username && postData.password === u.password
      );
      
      if (user) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'bearer',
            expires_in: 3600
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        });
      }
    });

    await page.route('**/api/v1/auth/me', async route => {
      const authHeader = route.request().headers()['authorization'];
      
      if (authHeader === 'Bearer mock-access-token') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            github_username: 'testuser',
            email: 'test@example.com',
            roles: ['admin'],
            permissions: ['manage_roles', 'view_dashboard']
          })
        });
      } else {
        await route.fulfill({ status: 401 });
      }
    });

    await page.route('**/api/v1/roles/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'admin',
            display_name: 'Administrator',
            description: 'Full system access',
            priority: 100,
            is_system_role: true,
            permissions: [],
            user_count: 1,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        ])
      });
    });

    await page.route('**/api/v1/permissions/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'manage_roles',
            display_name: 'Manage Roles',
            description: 'Can manage system roles',
            category: 'admin',
            is_system_permission: true
          }
        ])
      });
    });
  });

  test('Admin user can access all features', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Simulate admin login
    await page.fill('[data-testid="email-input"]', USERS.admin.username);
    await page.fill('[data-testid="password-input"]', USERS.admin.password);
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify admin navigation is visible
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-infrastructure"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-teams"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-admin"]')).toBeVisible();

    // Navigate to role management
    await page.click('[data-testid="nav-admin"]');
    await page.click('[data-testid="admin-roles-link"]');

    // Verify role management page is accessible
    await expect(page.locator('h1')).toContainText('Role Management');
    await expect(page.locator('[data-testid="create-role-button"]')).toBeVisible();

    // Verify admin can see management actions
    await expect(page.locator('[data-testid="role-edit-button"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="role-delete-button"]').first()).toBeVisible();
  });

  test('Manager user has limited access', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Simulate manager login
    await page.fill('[data-testid="email-input"]', USERS.manager.username);
    await page.fill('[data-testid="password-input"]', USERS.manager.password);
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify manager navigation
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-teams"]')).toBeVisible();
    
    // Admin section should not be visible
    await expect(page.locator('[data-testid="nav-admin"]')).not.toBeVisible();

    // Try to access role management directly (should be denied)
    await page.goto('/admin/roles');
    await expect(page.locator('text=Access Denied')).toBeVisible();

    // Navigate to teams (should be accessible)
    await page.goto('/teams');
    await expect(page.locator('h1')).toContainText('Teams');
    await expect(page.locator('[data-testid="create-team-button"]')).toBeVisible();
  });

  test('Developer user has read-only access', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Simulate developer login
    await page.fill('[data-testid="email-input"]', USERS.developer.username);
    await page.fill('[data-testid="password-input"]', USERS.developer.password);
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify developer navigation
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-infrastructure"]')).toBeVisible();
    
    // Teams and admin should not be visible
    await expect(page.locator('[data-testid="nav-teams"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-admin"]')).not.toBeVisible();

    // Navigate to infrastructure (should show read-only view)
    await page.click('[data-testid="nav-infrastructure"]');
    await expect(page.locator('h1')).toContainText('Infrastructure');
    
    // Management actions should not be visible
    await expect(page.locator('[data-testid="manage-cluster-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="deploy-button"]')).not.toBeVisible();
  });

  test('Viewer user has minimal access', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Simulate viewer login
    await page.fill('[data-testid="email-input"]', USERS.viewer.username);
    await page.fill('[data-testid="password-input"]', USERS.viewer.password);
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify viewer has minimal navigation
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    
    // All other navigation should be hidden
    await expect(page.locator('[data-testid="nav-infrastructure"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-teams"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-admin"]')).not.toBeVisible();

    // Try to access restricted pages directly
    await page.goto('/infrastructure');
    await expect(page.locator('text=Access Denied')).toBeVisible();

    await page.goto('/teams');
    await expect(page.locator('text=Access Denied')).toBeVisible();

    await page.goto('/admin/roles');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('Permission changes reflect immediately in UI', async ({ page }) => {
    // Start as viewer
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', USERS.viewer.username);
    await page.fill('[data-testid="password-input"]', USERS.viewer.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('/dashboard');

    // Verify limited access
    await expect(page.locator('[data-testid="nav-infrastructure"]')).not.toBeVisible();

    // Mock permission update (simulate admin granting infrastructure access)
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          github_username: 'testuser',
          email: 'test@example.com',
          roles: ['viewer'],
          permissions: ['view_dashboard', 'view_infrastructure'] // Added infrastructure permission
        })
      });
    });

    // Trigger permission refresh (e.g., through a background sync or manual refresh)
    await page.reload();

    // Verify new permission is reflected
    await expect(page.locator('[data-testid="nav-infrastructure"]')).toBeVisible();
  });

  test('Role-based content filtering works correctly', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', USERS.admin.username);
    await page.fill('[data-testid="password-input"]', USERS.admin.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('/dashboard');

    // Navigate to role management
    await page.click('[data-testid="nav-admin"]');
    await page.click('[data-testid="admin-roles-link"]');

    // Verify admin can see all roles (including system roles)
    await expect(page.locator('[data-testid="role-row"]')).toHaveCount(4); // Assuming 4 total roles

    // Verify admin can see system role management
    await expect(page.locator('text=System Roles')).toBeVisible();
    await expect(page.locator('[data-testid="system-role-indicator"]')).toBeVisible();

    // Test role creation
    await page.click('[data-testid="create-role-button"]');
    await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();
    
    // Fill and submit role creation form
    await page.fill('[data-testid="role-name-input"]', 'test-role');
    await page.fill('[data-testid="role-display-name-input"]', 'Test Role');
    await page.fill('[data-testid="role-description-input"]', 'Test role description');
    
    await page.click('[data-testid="submit-create-role"]');
    
    // Verify role was created
    await expect(page.locator('text=Role created successfully')).toBeVisible();
  });

  test('Security boundaries are enforced', async ({ page }) => {
    // Test that URL manipulation doesn't bypass permissions
    
    // Login as viewer
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', USERS.viewer.username);
    await page.fill('[data-testid="password-input"]', USERS.viewer.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('/dashboard');

    // Test direct URL access to restricted pages
    const restrictedUrls = [
      '/admin/roles',
      '/admin/users',
      '/admin/permissions',
      '/teams/create',
      '/infrastructure/manage'
    ];

    for (const url of restrictedUrls) {
      await page.goto(url);
      await expect(page.locator('text=Access Denied')).toBeVisible();
    }

    // Test API endpoint protection
    const response = await page.request.get('/api/v1/roles/', {
      headers: {
        'Authorization': 'Bearer mock-access-token'
      }
    });
    
    // Should return 403 for viewer trying to access roles API
    expect(response.status()).toBe(403);
  });

  test('Logout clears all permissions', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', USERS.admin.username);
    await page.fill('[data-testid="password-input"]', USERS.admin.password);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('/dashboard');

    // Verify admin access
    await expect(page.locator('[data-testid="nav-admin"]')).toBeVisible();

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await page.waitForURL('/login');

    // Try to access admin page after logout
    await page.goto('/admin/roles');
    await expect(page.locator('text=Please log in')).toBeVisible();
  });
});