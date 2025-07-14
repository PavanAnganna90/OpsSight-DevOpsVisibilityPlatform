/**
 * Authentication Middleware for OpsSight
 * Handles JWT validation, session management, and role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// User roles and permissions
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  lastLogin: Date;
  sessionId: string;
}

export interface AuthSession {
  user: User;
  expiresAt: Date;
  refreshToken?: string;
}

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);
const JWT_ALGORITHM = 'HS256';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours before expiry

// Role-based route protection
const ROUTE_PERMISSIONS = {
  '/admin': [UserRole.ADMIN],
  '/dashboard': [UserRole.ADMIN, UserRole.MANAGER, UserRole.DEVELOPER, UserRole.VIEWER],
  '/settings': [UserRole.ADMIN, UserRole.MANAGER],
  '/users': [UserRole.ADMIN],
  '/projects': [UserRole.ADMIN, UserRole.MANAGER, UserRole.DEVELOPER],
  '/monitoring': [UserRole.ADMIN, UserRole.MANAGER, UserRole.DEVELOPER, UserRole.VIEWER],
  '/api/admin': [UserRole.ADMIN],
  '/api/users': [UserRole.ADMIN, UserRole.MANAGER],
  '/api/projects': [UserRole.ADMIN, UserRole.MANAGER, UserRole.DEVELOPER],
};

// Permission constants
export const PERMISSIONS = {
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  READ_PROJECTS: 'read:projects',
  WRITE_PROJECTS: 'write:projects',
  DELETE_PROJECTS: 'delete:projects',
  READ_MONITORING: 'read:monitoring',
  WRITE_MONITORING: 'write:monitoring',
  ADMIN_ACCESS: 'admin:access',
  SYSTEM_CONFIG: 'system:config',
} as const;

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: Object.values(PERMISSIONS),
  [UserRole.MANAGER]: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.WRITE_USERS,
    PERMISSIONS.READ_PROJECTS,
    PERMISSIONS.WRITE_PROJECTS,
    PERMISSIONS.READ_MONITORING,
    PERMISSIONS.WRITE_MONITORING,
  ],
  [UserRole.DEVELOPER]: [
    PERMISSIONS.READ_PROJECTS,
    PERMISSIONS.WRITE_PROJECTS,
    PERMISSIONS.READ_MONITORING,
  ],
  [UserRole.VIEWER]: [
    PERMISSIONS.READ_PROJECTS,
    PERMISSIONS.READ_MONITORING,
  ],
};

// Session storage (replace with Redis in production)
class SessionStore {
  private sessions = new Map<string, AuthSession>();
  private userSessions = new Map<string, Set<string>>();

  set(sessionId: string, session: AuthSession): void {
    this.sessions.set(sessionId, session);
    
    const userSessions = this.userSessions.get(session.user.id) || new Set();
    userSessions.add(sessionId);
    this.userSessions.set(session.user.id, userSessions);
  }

  get(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId);
    
    if (session && session.expiresAt < new Date()) {
      this.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  delete(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      
      const userSessions = this.userSessions.get(session.user.id);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(session.user.id);
        }
      }
    }
  }

  deleteUserSessions(userId: string): void {
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.forEach(sessionId => {
        this.sessions.delete(sessionId);
      });
      this.userSessions.delete(userId);
    }
  }

  cleanup(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => this.delete(sessionId));
  }
}

const sessionStore = new SessionStore();

// Cleanup expired sessions every hour
setInterval(() => {
  sessionStore.cleanup();
}, 60 * 60 * 1000);

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function createJWTToken(user: User): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId: user.sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + SESSION_DURATION) / 1000),
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .sign(JWT_SECRET);
}

export async function verifyJWTToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

export async function createSession(user: User): Promise<{ token: string; session: AuthSession }> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  const userWithSession = { ...user, sessionId };
  const session: AuthSession = {
    user: userWithSession,
    expiresAt,
  };
  
  sessionStore.set(sessionId, session);
  const token = await createJWTToken(userWithSession);
  
  return { token, session };
}

export function getSession(sessionId: string): AuthSession | undefined {
  return sessionStore.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

export function deleteUserSessions(userId: string): void {
  sessionStore.deleteUserSessions(userId);
}

export async function refreshSession(sessionId: string): Promise<{ token: string; session: AuthSession } | null> {
  const existingSession = sessionStore.get(sessionId);
  if (!existingSession) {
    return null;
  }

  const timeUntilExpiry = existingSession.expiresAt.getTime() - Date.now();
  if (timeUntilExpiry > REFRESH_THRESHOLD) {
    return { token: await createJWTToken(existingSession.user), session: existingSession };
  }

  // Create new session
  const newSession = await createSession(existingSession.user);
  sessionStore.delete(sessionId);
  
  return newSession;
}

function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: User, permissions: string[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

export function hasAllPermissions(user: User, permissions: string[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

export function canAccessRoute(user: User, pathname: string): boolean {
  // Check exact path match first
  if (ROUTE_PERMISSIONS[pathname as keyof typeof ROUTE_PERMISSIONS]) {
    return ROUTE_PERMISSIONS[pathname as keyof typeof ROUTE_PERMISSIONS].includes(user.role);
  }

  // Check parent paths
  for (const [routePattern, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(routePattern)) {
      return allowedRoles.includes(user.role);
    }
  }

  // Default: allow access to public routes
  return true;
}

export async function authenticateRequest(request: NextRequest): Promise<User | null> {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT token
    const payload = await verifyJWTToken(token);
    const sessionId = payload.sessionId as string;
    
    // Get session
    const session = getSession(sessionId);
    if (!session) {
      throw new AuthenticationError('Session not found or expired');
    }

    // Update last activity
    session.user.lastLogin = new Date();
    
    return session.user;
  } catch (error) {
    console.warn('[Auth] Authentication failed:', error);
    return null;
  }
}

export function createAuthResponse(request: NextRequest, user: User | null): NextResponse {
  const response = NextResponse.next();
  
  if (user) {
    // Add user info to headers for API routes
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', user.role);
    response.headers.set('x-user-permissions', JSON.stringify(user.permissions));
  }
  
  return response;
}

export async function handleAuthMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Skip auth for public routes
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/health',
    '/_next',
    '/favicon.ico',
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );
  
  if (isPublicRoute) {
    return null; // Continue to next middleware
  }

  // Authenticate user
  const user = await authenticateRequest(request);
  
  if (!user) {
    // Redirect to login for protected routes
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check authorization
  if (!canAccessRoute(user, pathname)) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  // Create response with user context
  return createAuthResponse(request, user);
}

// Utility function to get user permissions for a role
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Mock user creation function (replace with actual user service)
export function createUser(userData: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}): User {
  return {
    ...userData,
    permissions: getRolePermissions(userData.role),
    lastLogin: new Date(),
    sessionId: '',
  };
}

export { sessionStore }; 