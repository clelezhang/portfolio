'use client';

import { DrawIconButton } from './DrawIconButton';

interface HeaderActionsProps {
  onClear: () => void;
  onSave: () => void;
}

export function HeaderActions({ onClear, onSave }: HeaderActionsProps) {
  return (
    <div className="draw-header-actions">
      <DrawIconButton icon="TCLEAR" onClick={onClear} tooltip="Clear" tooltipPlacement="bottom" />
      <div className="draw-header-actions-divider" />
      <DrawIconButton icon="TSAVE" onClick={onSave} tooltip="Download" tooltipPlacement="bottom" />
    </div>
  );
}
