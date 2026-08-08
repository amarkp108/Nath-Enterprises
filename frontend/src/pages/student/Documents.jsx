import { useEffect, useState } from 'react';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import api, { assetUrl } from '../../api';
import { formatDate } from '../../utils';
import { useToast } from '../../components/Toast';

export default function StudentDocuments() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetch = () => {
    api
      .get('/student/dashboard')
      .then((res) => setDocs(res.data.data.student.documents || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const tooBig = files.find((f) => f.size > 100 * 1024);
    if (tooBig) {
      toast.warning(`"${tooBig.name}" exceeds 100 KB limit (${Math.round(tooBig.size / 1024)} KB)`);
      setUploading(false);
      e.target.value = '';
      return;
    }
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('documents', f));
      const { data } = await api.post('/student/documents', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocs(data.data);
      toast.success('Documents uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Remove this document?')) return;
    try {
      const { data } = await api.delete(`/student/documents/${docId}`);
      setDocs(data.data);
      toast.success('Document removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove document');
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <Upload size={32} style={{ color: 'var(--brand)', margin: '0 auto 0.75rem' }} />
          <h3 style={{ marginBottom: '0.35rem' }}>Upload Documents</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            ID proof, marksheets, certificates (PDF, JPG, PNG — max 100 KB each)
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            {uploading ? 'Uploading...' : 'Choose Files'}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" hidden onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <FileText size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
            My Documents ({docs.length})
          </h3>
        </div>
        <div className="card-body">
          {docs.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              No documents uploaded yet
            </div>
          ) : (
            <div className="doc-list">
              {docs.map((d) => (
                <div key={d._id} className="doc-item">
                  <div>
                    <a href={assetUrl(d.url)} target="_blank" rel="noreferrer">
                      {d.name}
                    </a>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{formatDate(d.uploadedAt)}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(d._id)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
