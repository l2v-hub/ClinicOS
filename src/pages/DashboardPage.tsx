export function DashboardPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your clinic's performance and activity</p>
      </div>
      <div className="page-content">
        <p className="text-muted">Dashboard content will be implemented soon.</p>
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Quick Stats</h3>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>Total Patients: 0</li>
            <li>Today's Appointments: 0</li>
            <li>Pending Tasks: 0</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
