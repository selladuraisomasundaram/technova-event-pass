import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";

export default function AdminSendMails() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [skipGmail, setSkipGmail] = useState(true); // Default true since user personal accounts are exhausted
  const [batchSize, setBatchSize] = useState(2);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [batchMessage, setBatchMessage] = useState("");
  
  const stopSendingRef = useRef(false);

  useEffect(() => {
    const storedAuth = sessionStorage.getItem("admin_auth");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
      fetchStats();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "Pec@123") {
      sessionStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      setAuthError("");
      fetchStats();
    } else {
      setAuthError("Invalid Admin Password. Access Denied.");
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/sendBulkInvitations");
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const startSendingProcess = async () => {
    setIsSending(true);
    stopSendingRef.current = false;
    setBatchMessage("Starting automated mail dispatch...");

    let currentPending = stats.pending;

    while (!stopSendingRef.current && currentPending > 0) {
      setBatchMessage(`Sending batch of ${batchSize} email(s) via ${skipGmail ? "Mailjet" : "Gmail/Mailjet"}...`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout safeguard

        const res = await fetch("/api/sendBulkInvitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            adminPassword: "Pec@123",
            batchSize: Number(batchSize),
            skipGmail,
          }),
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (!data.success) {
          setBatchMessage(`Error: ${data.message}`);
          break;
        }

        if (data.results && data.results.length > 0) {
          // Append new logs to the top
          const timestamp = new Date().toLocaleTimeString();
          const formattedLogs = data.results.map((r) => ({
            ...r,
            timestamp,
          }));

          setLogs((prevLogs) => [...formattedLogs, ...prevLogs]);

          if (data.stats) {
            setStats(data.stats);
            currentPending = data.stats.pending;
          }
        } else {
          setBatchMessage("No pending invitations left to send.");
          break;
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setBatchMessage("Request timed out (20s). Retrying next batch...");
        } else {
          setBatchMessage(`Network Error: ${err.message}`);
          break;
        }
      }

      // 1.5 sec delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setIsSending(false);
    setBatchMessage(stopSendingRef.current ? "Dispatch paused by user." : "Mail dispatch cycle finished!");
  };

  const stopSendingProcess = () => {
    stopSendingRef.current = true;
    setBatchMessage("Stopping after current batch...");
  };

  return (
    <>
      <Head>
        <title>Bulk Email Dispatcher | TECHNOVA Admin</title>
      </Head>

      <div style={styles.container}>
        <div style={styles.headerBar}>
          <div>
            <h1 style={styles.title}>TECHNOVA 2026 Email Dispatcher</h1>
            <p style={styles.subtitle}>Send pass invitations via Mailjet & Brevo failover</p>
          </div>
          <Link href="/" style={styles.homeBtn}>
            ← Back to App
          </Link>
        </div>

        {!isAuthenticated ? (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Admin Authentication</h2>
            <p style={styles.cardDesc}>Enter volunteer/manager password to access the dispatch console.</p>
            <form onSubmit={handleLogin} style={{ marginTop: "20px" }}>
              <input
                type="password"
                placeholder="Enter Admin Password (Pec@123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              {authError && <p style={styles.errorText}>{authError}</p>}
              <button type="submit" style={styles.primaryBtn}>
                Unlock Dispatcher
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* Stats Dashboard */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.total}</div>
                <div style={styles.statLabel}>Total Participants</div>
              </div>
              <div style={{ ...styles.statCard, borderTop: "4px solid #10b981" }}>
                <div style={{ ...styles.statValue, color: "#10b981" }}>{stats.sent}</div>
                <div style={styles.statLabel}>Invitations Sent</div>
              </div>
              <div style={{ ...styles.statCard, borderTop: "4px solid #f59e0b" }}>
                <div style={{ ...styles.statValue, color: "#f59e0b" }}>{stats.pending}</div>
                <div style={styles.statLabel}>Pending Emails</div>
              </div>
            </div>

            {/* Controls */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Dispatch Settings & Trigger</h2>

              <div style={styles.formRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={skipGmail}
                    onChange={(e) => setSkipGmail(e.target.checked)}
                    disabled={isSending}
                    style={{ width: "18px", height: "18px", accentColor: "#4f46e5" }}
                  />
                  <span>
                    <strong>Skip Personal Gmail Accounts</strong> (Force send using Mailjet & Brevo only)
                  </span>
                </label>
              </div>

              <div style={styles.formRow}>
                <label style={{ fontWeight: "bold", fontSize: "14px", display: "block", marginBottom: "6px" }}>
                  Batch Size per Request:
                </label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  disabled={isSending}
                  style={styles.select}
                >
                  <option value={1}>1 Email per Batch (Fastest & Safest)</option>
                  <option value={2}>2 Emails per Batch (Recommended)</option>
                  <option value={5}>5 Emails per Batch</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                {!isSending ? (
                  <button
                    onClick={startSendingProcess}
                    disabled={stats.pending === 0}
                    style={{
                      ...styles.primaryBtn,
                      opacity: stats.pending === 0 ? 0.6 : 1,
                      cursor: stats.pending === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    🚀 Start Sending Invitations
                  </button>
                ) : (
                  <button onClick={stopSendingProcess} style={styles.dangerBtn}>
                    ⏸️ Pause Dispatching
                  </button>
                )}

                <button onClick={fetchStats} disabled={isSending} style={styles.secondaryBtn}>
                  🔄 Refresh Stats
                </button>
              </div>

              {batchMessage && <p style={styles.statusMessage}>{batchMessage}</p>}
            </div>

            {/* Live Verification Logs */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Real-time Verification Logs</h2>
              <p style={styles.cardDesc}>
                This table live updates as emails are sent from the App UI. Check the Provider column to verify Mailjet or Brevo usage.
              </p>

              {logs.length === 0 ? (
                <div style={styles.emptyLogs}>{"No emails sent in this session yet. Click \"Start Sending\" above."}</div>
              ) : (
                <div style={{ overflowX: "auto", marginTop: "15px" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Time</th>
                        <th style={styles.th}>Participant</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Sent Via (Provider)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index} style={styles.tr}>
                          <td style={styles.td}>{log.timestamp}</td>
                          <td style={styles.td}>{log.fullName}</td>
                          <td style={styles.td}>{log.email}</td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                backgroundColor: log.status === "SUCCESS" ? "#d1fae5" : "#fee2e2",
                                color: log.status === "SUCCESS" ? "#065f46" : "#991b1b",
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.providerBadge}>{log.provider || log.error || "N/A"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "30px 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: "15px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  homeBtn: {
    padding: "8px 16px",
    backgroundColor: "#e2e8f0",
    color: "#334155",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  cardDesc: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "15px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryBtn: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  dangerBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  errorText: {
    color: "#ef4444",
    fontSize: "14px",
    marginBottom: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
    marginBottom: "20px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
    textAlign: "center",
    borderTop: "4px solid #4f46e5",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },
  formRow: {
    marginTop: "15px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    color: "#1e293b",
    cursor: "pointer",
  },
  statusMessage: {
    marginTop: "15px",
    padding: "10px 14px",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    textAlign: "left",
  },
  th: {
    padding: "10px 12px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontWeight: "600",
    borderBottom: "2px solid #e2e8f0",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px",
    color: "#334155",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  providerBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    backgroundColor: "#e2e8f0",
    color: "#1e293b",
    fontWeight: "500",
  },
  emptyLogs: {
    padding: "30px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "14px",
  },
};
