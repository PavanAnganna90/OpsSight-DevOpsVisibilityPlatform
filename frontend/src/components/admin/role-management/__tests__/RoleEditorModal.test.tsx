import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleEditorModal from '../RoleEditorModal';
import { Role } from '../../../../types/role';

describe('RoleEditorModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    role: null,
  };

  it('renders create role form', () => {
    render(<RoleEditorModal {...baseProps} />);
    expect(screen.getByLabelText('Role Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<RoleEditorModal {...baseProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when Save is clicked', () => {
    render(<RoleEditorModal {...baseProps} />);
    fireEvent.click(screen.getByText('Save'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});
