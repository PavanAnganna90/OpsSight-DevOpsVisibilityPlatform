import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PermissionMatrix from '../PermissionMatrix';
import { Permission } from '../../../../types/role';

describe('PermissionMatrix', () => {
  const permissions: Permission[] = [];
  const setPermissions = jest.fn();

  it('renders all permission checkboxes', () => {
    render(<PermissionMatrix permissions={permissions} setPermissions={setPermissions} />);
    expect(screen.getByLabelText('API Read Access')).toBeInTheDocument();
    expect(screen.getByLabelText('API Write Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Cluster Management')).toBeInTheDocument();
  });

  it('calls setPermissions when a permission is toggled', () => {
    render(<PermissionMatrix permissions={permissions} setPermissions={setPermissions} />);
    fireEvent.click(screen.getByLabelText('API Read Access'));
    expect(setPermissions).toHaveBeenCalled();
  });
});
