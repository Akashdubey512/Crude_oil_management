// theme-utils.ts - Reusable theme style helper for CSS variable bindings

export const tokenStyle = (
  type: 'bg' | 'text' | 'border',
  token: string
): React.CSSProperties => {
  switch (type) {
    case 'bg':
      return { backgroundColor: `var(--${token})` };
    case 'text':
      return { color: `var(--${token})` };
    case 'border':
      return { borderColor: `var(--${token})` };
    default:
      return {};
  }
};

export const getBadgeStyles = (
  variant: 'low' | 'moderate' | 'high' | 'critical' | 'info' | 'neutral'
): React.CSSProperties => {
  switch (variant) {
    case 'low':
      return {
        backgroundColor: 'var(--risk-low-bg)',
        color: 'var(--risk-low-text)',
        borderColor: 'var(--risk-low-border)',
      };
    case 'moderate':
      return {
        backgroundColor: 'var(--risk-moderate-bg)',
        color: 'var(--risk-moderate-text)',
        borderColor: 'var(--risk-moderate-border)',
      };
    case 'high':
    case 'critical':
      return {
        backgroundColor: 'var(--risk-high-bg)',
        color: 'var(--risk-high-text)',
        borderColor: 'var(--risk-high-border)',
      };
    case 'info':
      return {
        backgroundColor: 'var(--info-blue-subtle)',
        color: 'var(--info-blue-text)',
        borderColor: 'var(--info-blue)',
      };
    default:
      return {
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--border-default)',
      };
  }
};
