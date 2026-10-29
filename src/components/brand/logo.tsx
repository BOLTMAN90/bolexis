export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0B1F3A" />
      <path
        d="M9 7.5h8.2c3.4 0 5.5 1.7 5.5 4.3 0 1.8-1.1 3.2-2.8 3.8 2.1.6 3.4 2.2 3.4 4.3 0 3-2.4 4.6-6.1 4.6H9V7.5Zm4 6.2h3.7c1.3 0 2-.6 2-1.6s-.7-1.5-2-1.5H13v3.1Zm0 6.7h4.2c1.5 0 2.3-.6 2.3-1.8s-.8-1.7-2.3-1.7H13v3.5Z"
        fill="white"
      />
      <rect x="22" y="22" width="6" height="6" rx="1.5" fill="#0F766E" />
    </svg>
  );
}
