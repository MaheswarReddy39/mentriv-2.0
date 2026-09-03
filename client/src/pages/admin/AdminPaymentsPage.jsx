import Card from '../../components/common/Card.jsx';

export default function AdminPaymentsPage() {
  return (
    <>
      <div className="page-head fade-in">
        <div>
          <h1>Payments</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Verify student payments.</p>
        </div>
      </div>
      <Card>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Payment verification is available through the dashboard pending-payments list.
        </p>
      </Card>
    </>
  );
}
