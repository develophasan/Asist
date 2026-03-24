'use client';

import { useState } from 'react';

type RequestItem = { id: string; status: string; pickupAddr: string; dropAddr: string };
type KycItem = {
  id: string;
  userId: string;
  user?: { phone: string; kycStatus: string };
  status: string;
};
type PaymentItem = { id: string; status: string; amount: string; currency: string };

export default function Home() {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3000');
  const [adminToken, setAdminToken] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [kycQueue, setKycQueue] = useState<KycItem[]>([]);
  const [paymentsByRequest, setPaymentsByRequest] = useState<Record<string, PaymentItem[]>>({});
  const [loading, setLoading] = useState(false);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/requests/mine`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Request load failed');
      setRequests(Array.isArray(json) ? json : []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yukleme hatasi');
    } finally {
      setLoading(false);
    }
  }

  async function dispatchRequest(id: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/matching/dispatch/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ maxDistanceKm: 20 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Dispatch failed');
      alert(`Teklif gonderildi: ${json.offeredAgentCount}`);
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispatch hatasi');
    }
  }

  async function loadPayments(requestId: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/payments/request/${requestId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Odeme listesi alinamadi');
      setPaymentsByRequest((prev) => ({
        ...prev,
        [requestId]: Array.isArray(json) ? json : [],
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Odeme listesi alinamadi');
    }
  }

  async function capturePayment(requestId: string, paymentId: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/payments/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          paymentId,
          idempotencyKey: `${paymentId}-capture`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Tahsilat basarisiz');
      alert(`Tahsilat tamamlandi: ${json.status}`);
      await loadPayments(requestId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tahsilat basarisiz');
    }
  }

  async function loadKycQueue() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/agents/kyc`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'KYC queue failed');
      setKycQueue(Array.isArray(json) ? json : []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'KYC hatasi');
    } finally {
      setLoading(false);
    }
  }

  async function decideKyc(agentId: string, status: 'verified' | 'rejected') {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/agents/${agentId}/kyc`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'KYC karar hatasi');
      alert(`KYC guncellendi: ${json.status}`);
      await loadKycQueue();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'KYC karar hatasi');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Asist Admin</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Operasyon paneli: talepleri goruntule, dispatch et, eslesme baslat.
      </p>

      <div className="mt-6 grid gap-3 max-w-2xl">
        <input
          className="h-10 rounded-md bg-zinc-900 border border-zinc-700 px-3 text-sm"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          placeholder="API Base URL"
        />
        <input
          className="h-10 rounded-md bg-zinc-900 border border-zinc-700 px-3 text-sm"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          placeholder="Admin Access Token"
        />
        <button
          className="h-10 rounded-md bg-indigo-500/80 hover:bg-indigo-400 text-sm font-semibold"
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? 'Yukleniyor...' : 'Talepleri Getir'}
        </button>
        <button
          className="h-10 rounded-md bg-amber-600/80 hover:bg-amber-500 text-sm font-semibold"
          onClick={loadKycQueue}
          disabled={loading}
        >
          KYC Kuyrugu
        </button>
      </div>

      <div className="mt-8 grid gap-3 max-w-3xl">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">{r.id}</p>
                <p className="mt-1 text-sm font-semibold">{r.status}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {r.pickupAddr} -&gt; {r.dropAddr}
                </p>
              </div>
              <button
                className="h-9 px-3 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-xs font-semibold"
                onClick={() => dispatchRequest(r.id)}
              >
                Dispatch
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="h-8 px-3 rounded-md bg-indigo-600/80 hover:bg-indigo-500 text-xs font-semibold"
                onClick={() => loadPayments(r.id)}
              >
                Odemeleri Getir
              </button>
            </div>
            {(paymentsByRequest[r.id] ?? []).map((p) => (
              <div
                key={p.id}
                className="mt-2 flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              >
                <div>
                  <p className="text-xs text-zinc-500">{p.id}</p>
                  <p className="text-xs text-zinc-300">
                    {p.amount} {p.currency} - {p.status}
                  </p>
                </div>
                <button
                  className="h-8 px-3 rounded-md bg-cyan-700/80 hover:bg-cyan-600 text-xs font-semibold disabled:opacity-50"
                  onClick={() => capturePayment(r.id, p.id)}
                  disabled={p.status === 'captured'}
                >
                  Tahsil Et
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-3 max-w-3xl">
        {kycQueue.map((k) => (
          <div
            key={k.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">Agent: {k.id}</p>
                <p className="text-xs text-zinc-500">User: {k.userId}</p>
                <p className="mt-1 text-sm font-semibold">{k.user?.phone ?? '-'}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  User KYC: {k.user?.kycStatus ?? '-'} | Agent Status: {k.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="h-9 px-3 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-xs font-semibold"
                  onClick={() => decideKyc(k.id, 'verified')}
                >
                  Verify
                </button>
                <button
                  className="h-9 px-3 rounded-md bg-rose-600/80 hover:bg-rose-500 text-xs font-semibold"
                  onClick={() => decideKyc(k.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
