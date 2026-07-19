export function PatientsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Patients</h2>
        <p>Manage patient records and information</p>
      </div>
      <div className="page-content">
        <p className="text-muted">Patient management interface will be implemented soon.</p>
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Coming Features</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>Patient search and filtering</li>
            <li>Medical history viewer</li>
            <li>Appointment scheduling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PatientsPage;
