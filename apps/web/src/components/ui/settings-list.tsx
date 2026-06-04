export function SettingsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="settings-row settings-link" href={href}>
      <span>{label}</span>
      <strong>{href}</strong>
    </a>
  );
}
