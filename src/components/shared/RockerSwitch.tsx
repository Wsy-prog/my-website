"use client";

interface RockerSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export default function RockerSwitch({
  checked,
  onChange,
  leftLabel = "ON",
  rightLabel = "OFF",
}: RockerSwitchProps) {
  return (
    <label className="rocker rocker-small">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rocker-input"
      />
      <span className="switch-left">{leftLabel}</span>
      <span className="switch-right">{rightLabel}</span>
    </label>
  );
}
