import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleTable from '../RoleTable';

describe('RoleTable', () => {
  it('renders all roles', () => {
    render(<RoleTable onEditRole={jest.fn()} onCreateRole={jest.fn()} />);
    expect(screen.getByText('Organization Owner')).toBeInTheDocument();
    expect(screen.getByText('DevOps Admin')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('calls onCreateRole when Create Role is clicked', () => {
    const onCreateRole = jest.fn();
    render(<RoleTable onEditRole={jest.fn()} onCreateRole={onCreateRole} />);
    fireEvent.click(screen.getByText('Create Role'));
    expect(onCreateRole).toHaveBeenCalled();
  });

  it('calls onEditRole when Edit is clicked', () => {
    const onEditRole = jest.fn();
    render(<RoleTable onEditRole={onEditRole} onCreateRole={jest.fn()} />);
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(onEditRole).toHaveBeenCalled();
  });
});
