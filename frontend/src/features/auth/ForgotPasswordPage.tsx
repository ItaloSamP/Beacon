export function ForgotPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Beacon</h1>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Forgot your password?</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>Enter your email to receive a reset link.</p>
        <input
          type="email"
          placeholder="you@example.com"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, marginBottom: 16 }}
        />
        <button
          style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >
          Send reset link
        </button>
        <p style={{ marginTop: 16 }}>
          <a href="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
