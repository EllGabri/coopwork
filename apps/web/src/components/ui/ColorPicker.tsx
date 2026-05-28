import { useState, useRef, useEffect, useCallback } from 'react';

const QUICK_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#1e293b',
  '#f1f5f9',
  '#ffffff',
];

interface Props {
  value?: string;
  onChange: (hex: string) => void;
  label?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function ColorPicker({ value = '#6366f1', onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [hexInput, setHexInput] = useState(value);
  const [rgb, setRgb] = useState<[number, number, number]>(hexToRgb(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHex(value);
    setHexInput(value);
    setRgb(hexToRgb(value));
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const applyHex = useCallback(
    (newHex: string) => {
      setHex(newHex);
      setHexInput(newHex);
      setRgb(hexToRgb(newHex));
      onChange(newHex);
    },
    [onChange],
  );

  const handleHexInput = (v: string) => {
    setHexInput(v);
    const normalized = v.startsWith('#') ? v : '#' + v;
    if (isValidHex(normalized)) applyHex(normalized);
  };

  const handleSlider = (channel: 0 | 1 | 2, val: number) => {
    const newRgb: [number, number, number] = [...rgb] as [number, number, number];
    newRgb[channel] = val;
    setRgb(newRgb);
    const newHex = rgbToHex(...newRgb);
    setHex(newHex);
    setHexInput(newHex);
    onChange(newHex);
  };

  const CHANNELS: { label: string; idx: 0 | 1 | 2; color: string }[] = [
    { label: 'R', idx: 0, color: '#ef4444' },
    { label: 'G', idx: 1, color: '#22c55e' },
    { label: 'B', idx: 2, color: '#3b82f6' },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
        aria-label={label ?? 'Selecionar cor'}
      >
        <div
          className="h-4 w-4 rounded-sm border border-border/50 flex-shrink-0"
          style={{ backgroundColor: hex }}
        />
        <span className="font-mono text-xs">{hex}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-popover p-3 shadow-xl">
          {/* Preview */}
          <div
            className="mb-3 h-8 w-full rounded-md border border-border/50"
            style={{ backgroundColor: hex }}
          />

          {/* Quick palette */}
          <div className="mb-3 grid grid-cols-6 gap-1">
            {QUICK_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => applyHex(color)}
                className={`h-6 w-6 rounded transition-transform hover:scale-110 ${hex === color ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)' }}
                aria-label={color}
              />
            ))}
          </div>

          {/* RGB sliders */}
          <div className="space-y-2 mb-3">
            {CHANNELS.map(({ label: ch, idx, color }) => (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-3 text-xs font-bold flex-shrink-0" style={{ color }}>
                  {ch}
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb[idx]}
                  onChange={(e) => handleSlider(idx, Number(e.target.value))}
                  className="flex-1 h-1.5 cursor-pointer accent-primary"
                  style={{
                    background: `linear-gradient(to right, ${
                      idx === 0
                        ? `rgb(0,${rgb[1]},${rgb[2]}), rgb(255,${rgb[1]},${rgb[2]})`
                        : idx === 1
                          ? `rgb(${rgb[0]},0,${rgb[2]}), rgb(${rgb[0]},255,${rgb[2]})`
                          : `rgb(${rgb[0]},${rgb[1]},0), rgb(${rgb[0]},${rgb[1]},255)`
                    })`,
                  }}
                />
                <span className="w-7 text-right text-xs text-muted-foreground tabular-nums">
                  {rgb[idx]}
                </span>
              </div>
            ))}
          </div>

          {/* HEX input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">HEX</span>
            <input
              className="flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-primary uppercase"
              value={hexInput}
              onChange={(e) => handleHexInput(e.target.value)}
              maxLength={7}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
