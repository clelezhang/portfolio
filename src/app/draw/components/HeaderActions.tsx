'use client';

import { DrawIconButton } from './DrawIconButton';

interface HeaderActionsProps {
  onClear: () => void;
  onSave: () => void;
}

export function HeaderActions({ onClear, onSave }: HeaderActionsProps) {
  return (
    <div className="draw-header-actions">
      <DrawIconButton icon="tool-clear" onClick={onClear} tooltip="Clear" tooltipPlacement="bottom" />
      <div className="draw-header-actions-divider" />
      <DrawIconButton icon="tool-save" onClick={onSave} tooltip="Download" tooltipPlacement="bottom" />
    </div>
  );
}
