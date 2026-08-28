type EmptySectionProps = {
  label: string;
  title: string;
  description: string;
};

export function EmptySection({ label, title, description }: EmptySectionProps) {
  return (
    <section className="panel empty-section">
      <span className="empty-code">{label}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="phase-badge">Estrutura inicial</span>
    </section>
  );
}
