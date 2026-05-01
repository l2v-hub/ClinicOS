import './App.css';

const quickStats = [
  { label: 'Patients', value: '1,284' },
  { label: 'Appointments Today', value: '42' },
  { label: 'Doctors On Duty', value: '8' },
  { label: 'Open Invoices', value: '17' },
];

const modules = [
  {
    title: 'Patient Management',
    description: 'Register patients, review medical history, and maintain accurate records.',
  },
  {
    title: 'Appointments',
    description: 'Schedule visits, track availability, and manage daily consultations.',
  },
  {
    title: 'Billing',
    description: 'Handle invoices, payments, and insurance-related workflows in one place.',
  },
  {
    title: 'Reports',
    description: 'Monitor clinic performance with clear operational and financial insights.',
  },
];

function App() {
  return (
    <div className="app">
      <header
        className="app-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.5rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>ClinicOS</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.9 }}>
            Modern clinic operations in one dashboard
          </p>
        </div>

        <div
          style={{
            padding: '0.5rem 0.875rem',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.14)',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          System Online
        </div>
      </header>

      <main
        className="app-main"
        style={{
          padding: '2rem',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <section
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '2rem' }}>
            Welcome to ClinicOS
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#475569',
              maxWidth: '760px',
            }}
          >
            ClinicOS helps teams manage patient records, appointments, billing, and daily
            operations with a clean, reliable workflow designed for modern healthcare practices.
          </p>
        </section>

        <section
          aria-label="Quick stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {quickStats.map((stat) => (
            <article
              key={stat.label}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#64748b',
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  margin: '0.5rem 0 0',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {stat.value}
              </p>
            </article>
          ))}
        </section>

        <section
          aria-label="Core modules"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.35rem' }}>
            Core Modules
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {modules.map((module) => (
              <article
                key={module.title}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1rem',
                  background: '#f8fafc',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>{module.title}</h4>
                <p
                  style={{
                    margin: 0,
                    color: '#475569',
                    lineHeight: 1.55,
                    fontSize: '0.95rem',
                  }}
                >
                  {module.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
