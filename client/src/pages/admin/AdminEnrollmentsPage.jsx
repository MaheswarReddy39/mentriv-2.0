import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function AdminEnrollmentsPage() {
  return (
    <>
      <div className="page-head fade-in">
        <div>
          <h1>Enrollments</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage student enrollments.</p>
        </div>
      </div>
      <Card>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Enrollment management is handled through the course detail view.
        </p>
      </Card>
    </>
  );
}
