import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, FileText, ArrowRight, Check, AlertTriangle, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'

const EXPORT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'assignedUser', label: 'Assigned Agent' },
  { key: 'score', label: 'Lead Score' },
  { key: 'dealValue', label: 'Deal Value' },
  { key: 'notes', label: 'Notes' },
  { key: 'createdAt', label: 'Created Date' },
]

const CRM_FIELDS = ['name', 'phone', 'email', 'source', 'notes', 'dealValue']

export function ImportExportPage() {
  const { success, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: Array<{row: number; error: string}> } | null>(null)
  const [exportFields, setExportFields] = useState<string[]>(['name', 'phone', 'email', 'status'])
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')

  const previewMutation = useMutation({
    mutationFn: () => api.post('/tools/import/preview'),
    onSuccess: (res) => {
      const { headers, suggestions } = res.data.data
      setCsvHeaders(headers)
      setFieldMapping(suggestions)
      setImportStep('map')
    },
  })

  const importMutation = useMutation({
    mutationFn: () => api.post('/tools/import/leads'),
    onSuccess: async (res) => {
      const jobId = res.data.data.jobId
      setImportStep('importing')
      // Poll for status
      setTimeout(async () => {
        const statusRes = await api.get(`/tools/import/${jobId}/status`)
        setImportResult(statusRes.data.data)
        setImportStep('done')
      }, 2000)
    },
    onError: () => toastError('Import failed'),
  })

  const exportMutation = useMutation({
    mutationFn: () => api.post('/tools/export', { entity: 'leads', fields: exportFields, format: exportFormat }, { responseType: 'blob' }),
    onSuccess: (res) => {
      const blob = new Blob([res.data as unknown as BlobPart], { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${Date.now()}.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
      success('Export downloaded successfully!')
    },
    onError: () => toastError('Export failed'),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Parse CSV headers from file
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const firstLine = text.split('\n')[0]
      setCsvHeaders(firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')))
      setImportStep('map')
    }
    reader.readAsText(file)
  }

  const toggleExportField = (field: string) => {
    setExportFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Import / Export Center</h1>
        <p className="text-text-secondary text-xs mt-0.5">Bulk import leads from CSV or export your data</p>
      </div>

      <div className="flex border-b border-border gap-1">
        {(['import', 'export'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t === 'import' ? <><Upload className="h-3.5 w-3.5 inline mr-1.5" />Import</> : <><Download className="h-3.5 w-3.5 inline mr-1.5" />Export</>}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs">
            {['Upload', 'Map Fields', 'Import'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${
                  importStep === 'done' || (importStep === 'map' && i < 1) || (importStep === 'importing' && i < 2)
                    ? 'bg-brand-gradient text-white'
                    : importStep === 'upload' && i === 0 ? 'bg-brand-purple/20 border border-brand-purple text-brand-purple'
                    : importStep === 'map' && i === 1 ? 'bg-brand-purple/20 border border-brand-purple text-brand-purple'
                    : 'bg-bg-elevated text-text-muted border border-border'
                }`}>
                  {i + 1}
                </div>
                <span className="text-text-secondary">{s}</span>
                {i < 2 && <ArrowRight className="h-3 w-3 text-text-muted" />}
              </div>
            ))}
          </div>

          {importStep === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card gradient>
                <CardContent className="p-8">
                  <div
                    className="border-2 border-dashed border-border hover:border-brand-purple/50 rounded-xl p-10 text-center cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-text-muted mx-auto mb-3" />
                    <p className="text-text-primary font-medium">Drop your CSV file here</p>
                    <p className="text-text-muted text-sm mt-1">or click to browse</p>
                    <p className="text-text-muted text-xs mt-3">Supports CSV, XLSX — max 10MB — up to 50,000 rows</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileSelect} />
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Button size="sm" variant="secondary" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>
                      Use demo data
                    </Button>
                    <p className="text-xs text-text-muted">Or try with sample data to see how field mapping works</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {importStep === 'map' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-sm">Map CSV Columns to CRM Fields</CardTitle>
                  <Button size="sm" variant="secondary" onClick={() => setImportStep('upload')}>← Back</Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {csvHeaders.map(header => (
                      <div key={header} className="flex items-center gap-4 text-sm">
                        <div className="w-40 shrink-0">
                          <div className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-text-secondary text-xs font-medium truncate">
                            <FileText className="h-3 w-3 inline mr-1" />{header}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
                        <Select
                          className="text-xs h-8 flex-1"
                          value={fieldMapping[header] || ''}
                          onChange={e => setFieldMapping(m => ({ ...m, [header]: e.target.value }))}
                        >
                          <option value="">Skip this field</option>
                          {CRM_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                        </Select>
                        {fieldMapping[header] && <Check className="h-4 w-4 text-success shrink-0" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <Button size="sm" onClick={() => importMutation.mutate()} loading={importMutation.isPending}>
                      Start Import <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {importStep === 'importing' && (
            <Card gradient>
              <CardContent className="p-10 text-center">
                <div className="h-8 w-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin mx-auto mb-4" />
                <p className="font-medium text-text-primary">Importing leads...</p>
                <p className="text-text-muted text-sm mt-1">This may take a moment for large files.</p>
              </CardContent>
            </Card>
          )}

          {importStep === 'done' && importResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card gradient>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Check className="h-6 w-6 text-success" />
                    <h3 className="font-heading font-semibold text-text-primary">Import Complete</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-success/10 border border-success/20 rounded-xl">
                      <p className="font-bold text-2xl text-success">{importResult.imported}</p>
                      <p className="text-xs text-text-muted">Imported</p>
                    </div>
                    <div className="text-center p-3 bg-warning/10 border border-warning/20 rounded-xl">
                      <p className="font-bold text-2xl text-warning">0</p>
                      <p className="text-xs text-text-muted">Skipped</p>
                    </div>
                    <div className="text-center p-3 bg-danger/10 border border-danger/20 rounded-xl">
                      <p className="font-bold text-2xl text-danger">{importResult.failed}</p>
                      <p className="text-xs text-text-muted">Failed</p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-text-secondary">Errors:</p>
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-danger">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Row {e.row}: {e.error}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" className="mt-4" onClick={() => { setImportStep('upload'); setImportResult(null) }}>
                    Import Another File
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-4">
          <Card gradient>
            <CardHeader><CardTitle className="text-sm">Export Leads</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select Fields to Export</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {EXPORT_FIELDS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary">
                      <input
                        type="checkbox"
                        checked={exportFields.includes(f.key)}
                        onChange={() => toggleExportField(f.key)}
                        className="rounded border-border accent-brand-purple"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <Select className="h-8 text-xs w-32" value={exportFormat} onChange={e => setExportFormat(e.target.value as 'csv' | 'json')}>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => exportMutation.mutate()}
                  loading={exportMutation.isPending}
                  disabled={exportFields.length === 0}
                >
                  <Download className="h-3.5 w-3.5" /> Export {exportFields.length} Fields as {exportFormat.toUpperCase()}
                </Button>
                <p className="text-xs text-text-muted">Max 10,000 records per export</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
