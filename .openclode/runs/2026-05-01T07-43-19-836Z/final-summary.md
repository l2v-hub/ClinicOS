# Final Summary

**Agents run:** 1
**Dry-run:** false

## Last agent output

FILE: frontend/src/App.tsx
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import './App.css';

type ApiRecord = Record<string, unknown>;

type Patient = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  status: string;
  lastVisit: string;
};

const navItems = [
  { label: 'Dashboard', active: true },
  { label: 'Patients', active: false },
  { label: 'Appointments', active: false },
  { label: 'Billing', active: false },
  { label: 'Reports', active: false },
  { label: 'Settings', active: false },
];

const quickActions = ['New Patient', 'Schedule Visit', 'Generate Report'];

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickValue(source: ApiRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, source);
}

function pickString(source: ApiRecord, paths: string[]): string {
  for (const path of paths) {
    const value = pickValue(source, path);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return '';
}

function capitalizeWords(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(value: string): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function extractPatients(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload)) {
    const candidates = ['patients', 'data', 'items', 'results'];

    for (const key of candidates) {
      const candidate = payload[key
