/**
 * Unauthorized Access Page
 * 
 * Displayed when users attempt to access resources they don't have permission for.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { UnauthorizedPage } from '@/components/rbac/withPermissions';

export default function UnauthorizedRoute() {
  return <UnauthorizedPage />;
}