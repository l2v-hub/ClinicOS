export function AppointmentsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Appointments</h2>
        <p>Schedule and manage patient appointments</p>
      </div>
      <div className="page-content">
        <p className="text-muted">Appointment management interface will be implemented soon.</p>
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Coming Features</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>Appointment calendar view</li>
            <li>Reminder notifications</li>
            <li>Patient check-in system</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AppointmentsPage
