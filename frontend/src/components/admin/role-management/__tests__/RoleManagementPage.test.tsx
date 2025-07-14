import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleManagementPage from '../RoleManagementPage';

describe('RoleManagementPage', () => {
  it('renders the Role Management heading', () => {
    render(<RoleManagementPage />);
    expect(screen.getByText('Role Management')).toBeInTheDocument();
  });

  it('opens the create role modal when Create Role is clicked', () => {
    render(<RoleManagementPage />);
    fireEvent.click(screen.getByText('Create Role'));
    // Look for the modal dialog by role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Check for the role name input
    expect(screen.getByLabelText('Role Name')).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', () => {
    render(<RoleManagementPage />);
    fireEvent.click(screen.getByText('Create Role'));
    fireEvent.click(screen.getByText('Cancel'));
    // Modal should be removed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
