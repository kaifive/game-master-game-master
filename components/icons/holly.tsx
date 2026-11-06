/** A holly sprig: the winter banner's decoration and the winter party's points icon. */
export function HollyIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 46 32" className={className}>
      <path
        d="M22 18c-4-9-13-12-20-10 3 2 2 5 5 6-2 2-1 5 2 6 1-3 5-4 7-2 1-3 4-2 6 0z"
        fill="#2b7a57"
      />
      <path
        d="M24 18c4-9 13-12 20-10-3 2-2 5-5 6 2 2 1 5-2 6-1-3-5-4-7-2-1-3-4-2-6 0z"
        fill="#22684a"
      />
      <circle cx="20" cy="21" r="3.6" fill="#e5354f" />
      <circle cx="26.5" cy="21.5" r="3.6" fill="#c81f3a" />
      <circle cx="23.2" cy="26" r="3.6" fill="#e5354f" />
    </svg>
  );
}
