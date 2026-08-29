export function ClinicalSectionLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="page-loading__spinner" aria-hidden="true" />
      Caricamento sezione clinica…
    </div>
  );
}
