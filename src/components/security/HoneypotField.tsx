import { useEffect, useState } from 'react';

interface HoneypotFieldProps {
  onBotDetected?: () => void;
}

export const HoneypotField = ({ onBotDetected }: HoneypotFieldProps) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    // If honeypot field is filled, it's likely a bot
    if (value && onBotDetected) {
      onBotDetected();
    }
  }, [value, onBotDetected]);

  return (
    <input
      type="text"
      name="website_url"
      autoComplete="off"
      tabIndex={-1}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  );
};
