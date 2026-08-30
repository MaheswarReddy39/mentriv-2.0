import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function AdminPaymentsPage() {
  const toast = useToast();
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

function useToast() {
  const noop = () => {};
  return { success: noop, error: noop };
}
