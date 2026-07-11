'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Settings, 
  BarChart3, 
  History, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Briefcase,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface Anomaly {
  anomalyType: string;
  ruleViolated: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
}

interface AuditResult {
  id: string;
  fileName: string;
  uploadDate: string;
  invoiceNumber?: string;
  vendor: string;
  date: string;
  totalAmount: number;
  currency: string;
  category: string;
  lineItems: LineItem[];
  complianceCheck: {
    isCompliant: boolean;
    reason: string;
    flaggedAnomalies: Anomaly[];
  };
  filePreviewUrl?: string;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  val?: number;
}

const DEFAULT_POLICIES: Policy[] = [
  { id: 'max-limit', name: 'Maximum Transaction Limit', description: 'Total transaction amount must not exceed $100.00', enabled: true, val: 100 },
  { id: 'no-alcohol', name: 'Restricted Item: Alcohol', description: 'Expenses must not contain alcohol, liquor, wine, beer, or bar visits', enabled: true },
  { id: 'age-limit', name: 'Receipt Recency', description: 'Receipt date must not be older than 90 days from today', enabled: true },
  { id: 'weekend-spend', name: 'Weekday Expense Rule', description: 'Transactions should take place on standard business weekdays (Mon-Fri)', enabled: false }
];

export default function Dashboard() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'audit' | 'policies' | 'analytics' | 'history'>('audit');

  // Application state
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditResult[]>([]);
  
  // Custom policy states
  const [customPolicyName, setCustomPolicyName] = useState('');
  const [customPolicyDesc, setCustomPolicyDesc] = useState('');

  // Active audit states
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    dataUrl: string;
    mimeType: string;
  } | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Initialize data from localStorage on client-side mount
  useEffect(() => {
    const savedPolicies = localStorage.getItem('pt_policies');
    if (savedPolicies) {
      setPolicies(JSON.parse(savedPolicies));
    } else {
      setPolicies(DEFAULT_POLICIES);
      localStorage.setItem('pt_policies', JSON.stringify(DEFAULT_POLICIES));
    }

    const savedHistory = localStorage.getItem('pt_history');
    if (savedHistory) {
      setAuditHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Sync policies to localStorage
  const savePolicies = (updatedPolicies: Policy[]) => {
    setPolicies(updatedPolicies);
    localStorage.setItem('pt_policies', JSON.stringify(updatedPolicies));
  };

  // Sync history to localStorage
  const saveHistory = (updatedHistory: AuditResult[]) => {
    setAuditHistory(updatedHistory);
    localStorage.setItem('pt_history', JSON.stringify(updatedHistory));
  };

  // Toggle rule
  const handleTogglePolicy = (id: string) => {
    const updated = policies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    savePolicies(updated);
  };

  // Change numerical limits on policies
  const handlePolicyValChange = (id: string, value: number) => {
    const updated = policies.map(p => 
      p.id === id ? { ...p, val: value, description: `Total transaction amount must not exceed $${value.toFixed(2)}` } : p
    );
    savePolicies(updated);
  };

  // Add custom policy
  const handleAddCustomPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPolicyName.trim() || !customPolicyDesc.trim()) return;

    const newPolicy: Policy = {
      id: `custom-${Date.now()}`,
      name: customPolicyName,
      description: customPolicyDesc,
      enabled: true
    };

    const updated = [...policies, newPolicy];
    savePolicies(updated);
    setCustomPolicyName('');
    setCustomPolicyDesc('');
  };

  // Delete custom policy
  const handleDeletePolicy = (id: string) => {
    const updated = policies.filter(p => p.id !== id);
    savePolicies(updated);
  };

  // Convert File object to Base64
  const processFile = (file: File) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, PNG, JPG, or WEBP image.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setSelectedFile({
        name: file.name,
        dataUrl: reader.result as string,
        mimeType: file.type
      });
      setAuditResult(null);
    };
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Process manual file input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Load sample invoices
  const handleLoadSample = async (type: 'compliant' | 'non_compliant') => {
    setError(null);
    setLoading(true);
    try {
      const url = `/samples/${type}_receipt.png`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Sample receipt image file not found.');
      
      const blob = await res.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        setSelectedFile({
          name: type === 'compliant' ? 'office_supplies_invoice.png' : 'lunch_expense_receipt.png',
          dataUrl: reader.result as string,
          mimeType: 'image/png'
        });
        setAuditResult(null);
        setLoading(false);
      };
    } catch (err: any) {
      console.error(err);
      setError(`Failed to load sample receipt: ${err.message}`);
      setLoading(false);
    }
  };

  // Run audit against Gemini API
  const handleRunAudit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileData: selectedFile.dataUrl,
          mimeType: selectedFile.mimeType,
          policies: policies
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred during audit.');
      }

      // Format audit results and store
      const result: AuditResult = {
        ...data,
        id: `audit-${Date.now()}`,
        fileName: selectedFile.name,
        uploadDate: new Date().toLocaleDateString(),
        filePreviewUrl: selectedFile.dataUrl
      };

      setAuditResult(result);
      
      // Save to history
      const updatedHistory = [result, ...auditHistory];
      saveHistory(updatedHistory);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete audit. Ensure your Gemini API Key is configured.');
    } finally {
      setLoading(false);
    }
  };

  // Load selected history item into main viewer
  const handleLoadHistoryItem = (item: AuditResult) => {
    setSelectedFile({
      name: item.fileName,
      dataUrl: item.filePreviewUrl || '',
      mimeType: item.filePreviewUrl?.startsWith('data:application/pdf') ? 'application/pdf' : 'image/png'
    });
    setAuditResult(item);
    setActiveTab('audit');
  };

  // Clear single history item
  const handleDeleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = auditHistory.filter(h => h.id !== id);
    saveHistory(updated);
    if (auditResult?.id === id) {
      setAuditResult(null);
      setSelectedFile(null);
    }
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire audit history? This cannot be undone.')) {
      saveHistory([]);
      setAuditResult(null);
      setSelectedFile(null);
    }
  };

  // Calculate stats for dashboard analytics
  const totalAudits = auditHistory.length;
  const compliantAudits = auditHistory.filter(h => h.complianceCheck.isCompliant).length;
  const nonCompliantAudits = totalAudits - compliantAudits;
  const complianceRate = totalAudits > 0 ? Math.round((compliantAudits / totalAudits) * 100) : 0;
  const totalSpend = auditHistory.reduce((sum, h) => sum + h.totalAmount, 0);

  // Group spend by category
  const categoriesMap: { [key: string]: number } = {};
  auditHistory.forEach(h => {
    const cat = h.category || 'Other';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + h.totalAmount;
  });

  const categoriesData = Object.entries(categoriesMap).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <img src="/logo.png" alt="Paper Trail logo" className="header-logo-image" />
          <span className="header-logo-text">Paper<span style={{ fontWeight: 400 }}>Trail</span></span>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn btn-secondary ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldCheck size={16} />
            Auditor
          </button>
          <button 
            className={`btn btn-secondary ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            <Settings size={16} />
            Policy Manager
          </button>
          <button 
            className={`btn btn-secondary ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button 
            className={`btn btn-secondary ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            Audit History
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main animate-fade">
        
        {/* TAB 1: AUDITOR PANEL */}
        {activeTab === 'audit' && (
          <>
            {/* Left Screen: File Upload and Preview */}
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    <Upload size={18} />
                    Invoice Upload
                  </h2>
                  <p className="panel-description">Upload receipts or invoices in PNG, JPG, or PDF formats to scan.</p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div 
                className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                />
                <div className="upload-icon">
                  <Upload size={24} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>Drag & drop your receipt here, or <span style={{ color: 'var(--primary)' }}>browse files</span></p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>Supports PDF, PNG, JPG, WEBP (Max 10MB)</p>
                </div>
              </div>

              {/* Predefined Quick Test Samples */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>QUICK TESTING SAMPLES:</p>
                <div className="samples-container">
                  <div className="sample-card" onClick={() => handleLoadSample('compliant')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="sample-card-title">Acme Office Supplies</span>
                      <span className="badge badge-success">Should Pass</span>
                    </div>
                    <p className="sample-card-desc">Compliant purchase of standard paper, pens, and trays totaling $48.49.</p>
                  </div>
                  <div className="sample-card" onClick={() => handleLoadSample('non_compliant')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="sample-card-title">Grillhouse Bistro Dinner</span>
                      <span className="badge badge-danger">Should Fail</span>
                    </div>
                    <p className="sample-card-desc">Steak & alcohol dinner receipt totaling $91.50 (Violates meal cap & alcohol ban).</p>
                  </div>
                </div>
              </div>

              {/* Loaded File Preview Area */}
              {selectedFile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }} className="animate-fade">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedFile.name}</span>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setSelectedFile(null); setAuditResult(null); }}>
                      Clear File
                    </button>
                  </div>

                  <div className="document-preview-container">
                    {selectedFile.mimeType === 'application/pdf' ? (
                      <div className="pdf-preview-box">
                        <FileText className="pdf-icon-large" />
                        <p style={{ fontWeight: 600 }}>PDF Document Loaded</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PDF document is loaded and ready for audit.</p>
                      </div>
                    ) : (
                      <img 
                        src={selectedFile.dataUrl} 
                        alt="Receipt preview" 
                        className="document-preview-img" 
                      />
                    )}
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', gap: '10px' }}
                    onClick={handleRunAudit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" />
                        Auditing with Gemini 3.5 Flash...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={20} />
                        Execute Policy Compliance Audit
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  <strong>Audit Failed:</strong> {error}
                </div>
              )}
            </div>

            {/* Right Screen: Audit Results */}
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    <ShieldCheck size={18} />
                    Audit Intelligence Report
                  </h2>
                  <p className="panel-description">AI expense verification results, extracted invoice items, and policy checks.</p>
                </div>
              </div>

              {loading && (
                <div className="empty-state" style={{ padding: '80px 0' }}>
                  <div className="loading-spinner" style={{ width: '48px', height: '48px', borderLeftColor: 'var(--primary)', marginBottom: '16px' }} />
                  <p style={{ fontWeight: 600 }}>Processing Invoice Visuals...</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Gemini is scanning the document layout, OCR-ing details, and evaluating active policies.</p>
                </div>
              )}

              {!loading && !auditResult && (
                <div className="empty-state">
                  <ShieldCheck size={48} className="empty-state-icon" style={{ strokeWidth: 1.5 }} />
                  <p style={{ fontWeight: 600 }}>Ready for Invoice Audit</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px' }}>Upload a file or choose a quick testing sample on the left to review the compliance score.</p>
                </div>
              )}

              {!loading && auditResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade">
                  
                  {/* Compliance Status Header */}
                  <div style={{ 
                    background: auditResult.complianceCheck.isCompliant ? 'var(--success-bg)' : 'var(--danger-bg)',
                    borderColor: auditResult.complianceCheck.isCompliant ? 'var(--success-border)' : 'var(--danger-border)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: 'var(--radius-sm)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: auditResult.complianceCheck.isCompliant ? 'var(--success)' : 'var(--danger)', textTransform: 'uppercase' }}>
                        Compliance Result
                      </span>
                      <span className={`badge ${auditResult.complianceCheck.isCompliant ? 'badge-success' : 'badge-danger'}`}>
                        {auditResult.complianceCheck.isCompliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.4', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {auditResult.complianceCheck.reason}
                    </p>
                  </div>

                  {/* Metadata and Stats */}
                  <div className="result-header-stat">
                    <div className="stat-group">
                      <span className="stat-label">Vendor</span>
                      <span className="stat-val" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auditResult.vendor}</span>
                    </div>
                    <div className="stat-group">
                      <span className="stat-label">Invoice Date</span>
                      <span className="stat-val" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auditResult.date}</span>
                    </div>
                    <div className="stat-group" style={{ textAlign: 'right' }}>
                      <span className="stat-label">Total Spend</span>
                      <span className="stat-val" style={{ color: 'var(--primary)' }}>
                        {auditResult.currency === 'USD' || auditResult.currency === '$' ? '$' : `${auditResult.currency} `}
                        {auditResult.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Flagged Anomalies Section */}
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                      Flagged Violations ({auditResult.complianceCheck.flaggedAnomalies.length})
                    </h3>
                    
                    {auditResult.complianceCheck.flaggedAnomalies.length === 0 ? (
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)' }}>
                        <CheckCircle size={16} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>No policy violations flagged on this invoice.</span>
                      </div>
                    ) : (
                      auditResult.complianceCheck.flaggedAnomalies.map((anomaly, idx) => (
                        <div key={idx} className={`anomaly-card severity-${anomaly.severity}`}>
                          <div className="anomaly-title-row">
                            <span className="anomaly-title">{anomaly.anomalyType}</span>
                            <span className={`badge ${anomaly.severity === 'HIGH' ? 'badge-danger' : anomaly.severity === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                              {anomaly.severity} Severity
                            </span>
                          </div>
                          <p className="anomaly-desc"><strong>Rule:</strong> {anomaly.ruleViolated}</p>
                          <p className="anomaly-desc">{anomaly.description}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Extracted Line Items ({auditResult.lineItems.length})
                    </h3>
                    <div style={{ border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Price</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditResult.lineItems.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 500 }}>{item.description}</td>
                              <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity || 1}</td>
                              <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                ${item.unitPrice ? item.unitPrice.toFixed(2) : (item.totalPrice / (item.quantity || 1)).toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>${item.totalPrice.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Document Metadata Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Invoice ID:</span>{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{auditResult.invoiceNumber || 'Not found'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned Category:</span>{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{auditResult.category}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: POLICY MANAGER */}
        {activeTab === 'policies' && (
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Settings size={18} />
                  Corporate Expense Policy Manager
                </h2>
                <p className="panel-description">Configure the global business rules. Gemini will use these rules to evaluate uploaded invoices and flag discrepancies.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginTop: '10px' }}>
              
              {/* Policies List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Audit Policies</h3>
                <div className="policy-list">
                  {policies.map(policy => (
                    <div key={policy.id} className="policy-item">
                      <div className="policy-info">
                        <span className="policy-name">{policy.name}</span>
                        <span className="policy-desc">{policy.description}</span>
                        {/* If maximum limit policy, show input box */}
                        {policy.id === 'max-limit' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Limit Value ($):</span>
                            <input 
                              type="number" 
                              className="text-input" 
                              style={{ maxWidth: '100px', padding: '4px 8px', fontSize: '0.8rem' }}
                              value={policy.val || 100}
                              onChange={(e) => handlePolicyValChange(policy.id, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {policy.id.startsWith('custom-') && (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px', borderRadius: '50%' }}
                            onClick={() => handleDeletePolicy(policy.id)}
                            title="Delete custom policy"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={policy.enabled}
                            onChange={() => handleTogglePolicy(policy.id)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Policy Form */}
              <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '20px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>Create Custom Policy</h3>
                <form onSubmit={handleAddCustomPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rule Name</label>
                    <input 
                      type="text" 
                      className="text-input" 
                      placeholder="e.g. Flight Upgrades Prohibited"
                      value={customPolicyName}
                      onChange={(e) => setCustomPolicyName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Compliance Criteria (Natural Language)</label>
                    <textarea 
                      className="text-input" 
                      style={{ minHeight: '100px', resize: 'none' }}
                      placeholder="e.g. Any line item matching Business Class or First Class flight upgrades is strictly prohibited and must be flagged as HIGH severity."
                      value={customPolicyDesc}
                      onChange={(e) => setCustomPolicyDesc(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '6px' }}>
                    <Plus size={16} />
                    Add Corporate Rule
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: SPEND & COMPLIANCE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <BarChart3 size={18} />
                  Corporate Compliance & Spend Analytics
                </h2>
                <p className="panel-description">Aggregated expense insights, category breakouts, and policy validation charts.</p>
              </div>
            </div>

            {totalAudits === 0 ? (
              <div className="empty-state">
                <BarChart3 size={48} className="empty-state-icon" style={{ strokeWidth: 1.5 }} />
                <p style={{ fontWeight: 600 }}>No Analytics Data Available</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Upload and audit invoices first to populate spending charts.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '10px' }} className="animate-fade">
                
                {/* Stats Cards Row */}
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-icon-wrapper">
                      <DollarSign size={20} />
                    </div>
                    <div className="analytics-info">
                      <span className="analytics-label">Total Spend Audited</span>
                      <span className="analytics-value">${totalSpend.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-icon-wrapper" style={{ color: 'var(--success)' }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div className="analytics-info">
                      <span className="analytics-label">Compliance Ratio</span>
                      <span className="analytics-value">{complianceRate}%</span>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-icon-wrapper" style={{ color: 'var(--danger)' }}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="analytics-info">
                      <span className="analytics-label">Violations Flagged</span>
                      <span className="analytics-value">{nonCompliantAudits}</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Charts Container */}
                <div className="chart-container">
                  
                  {/* Compliance Ratio Donut */}
                  <div className="chart-card">
                    <span className="chart-title-sm">Invoice Compliance Breakdown</span>
                    <div className="circle-chart">
                      <svg className="circle-chart-svg" width="140" height="140">
                        <circle className="circle-chart-bg" cx="70" cy="70" r="60" />
                        <circle 
                          className="circle-chart-fill" 
                          cx="70" 
                          cy="70" 
                          r="60" 
                          stroke={complianceRate >= 70 ? 'var(--success)' : complianceRate >= 40 ? 'var(--warning)' : 'var(--danger)'}
                          strokeDasharray={`${(complianceRate / 100) * 377} 377`}
                        />
                      </svg>
                      <div className="circle-chart-text-box">
                        <span className="circle-chart-val">{complianceRate}%</span>
                        <br />
                        <span className="circle-chart-lbl">Compliant</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></div>
                        <span>Passed ({compliantAudits})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></div>
                        <span>Flagged ({nonCompliantAudits})</span>
                      </div>
                    </div>
                  </div>

                  {/* Spend by Category Bar Chart */}
                  <div className="chart-card" style={{ flex: 1.5 }}>
                    <span className="chart-title-sm" style={{ marginBottom: '10px' }}>Spend Distribution by Category</span>
                    <div className="bar-chart-list">
                      {categoriesData.map((cat, idx) => {
                        const maxAmount = categoriesData[0]?.amount || 1;
                        const widthPercentage = (cat.amount / maxAmount) * 100;
                        return (
                          <div key={idx} className="bar-chart-item">
                            <div className="bar-chart-info">
                              <span className="bar-chart-name" style={{ textTransform: 'capitalize' }}>{cat.name}</span>
                              <span className="bar-chart-value">${cat.amount.toFixed(2)}</span>
                            </div>
                            <div className="bar-chart-track">
                              <div 
                                className="bar-chart-fill" 
                                style={{ width: `${widthPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT HISTORY TABLE */}
        {activeTab === 'history' && (
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <History size={18} />
                  Corporate Audit Ledger
                </h2>
                <p className="panel-description">Historical log of all uploaded invoices, extracted totals, and policy compliance records.</p>
              </div>
              {auditHistory.length > 0 && (
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleClearAllHistory}>
                  Clear History
                </button>
              )}
            </div>

            {auditHistory.length === 0 ? (
              <div className="empty-state">
                <History size={48} className="empty-state-icon" style={{ strokeWidth: 1.5 }} />
                <p style={{ fontWeight: 600 }}>Ledger is Empty</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Upload invoice receipts in the Auditor tab to build your corporate expense log.</p>
              </div>
            ) : (
              <div className="history-table-wrapper animate-fade">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Upload Date</th>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Invoice ID</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Compliance</th>
                      <th>Violations</th>
                      <th style={{ width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map(item => (
                      <tr key={item.id} onClick={() => handleLoadHistoryItem(item)}>
                        <td>{item.uploadDate}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.vendor}</td>
                        <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                        <td>{item.invoiceNumber || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          ${item.totalAmount.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${item.complianceCheck.isCompliant ? 'badge-success' : 'badge-danger'}`}>
                            {item.complianceCheck.isCompliant ? 'Passed' : 'Violated'}
                          </span>
                        </td>
                        <td style={{ color: item.complianceCheck.flaggedAnomalies.length > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {item.complianceCheck.flaggedAnomalies.length > 0 
                            ? `${item.complianceCheck.flaggedAnomalies.length} Flagged` 
                            : 'None'
                          }
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px', borderRadius: '50%' }}
                            onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                            title="Delete record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
