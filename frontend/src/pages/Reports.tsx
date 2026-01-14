import { useState, useMemo, useEffect, useRef } from 'react'
import { Download, FileText, BarChart3, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface AlertRecord {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  asset_id: string
  asset_name: string
  triggered_at: string
  triggered_value: number | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  acknowledged_by_name: string | null
  resolved_at: string | null
}

interface ReportData {
  energy?: {
    totalKwh: number
    avgDaily: number
    peakDay: string
    peakKwh: number
    costEstimate: number
  }
  alerts?: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    avgResponseTime: string
    items: AlertRecord[]
  }
  workOrders?: {
    total: number
    completed: number
    completionRate: number
    avgResolutionTime: string
  }
  eui?: {
    kwhPerSqFt: number
    totalSqFt: number
    totalKwh: number
    benchmark: string
  }
}

const reportTypes = [
  { id: 'energy', name: 'Energy Consumption', description: 'Daily/weekly/monthly energy usage' },
  { id: 'alerts', name: 'Alert History', description: 'Historical alert data and trends' },
  { id: 'work-orders', name: 'Work Order Completion', description: 'Work order metrics and completion rates' },
  { id: 'eui', name: 'Energy Use Intensity', description: 'kWh per square foot analysis' },
]

// Get the start of the week (Monday) in user's local timezone
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday as start of week (ISO standard)
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Calculate date range based on selection
function getDateRangeInfo(range: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  let start: Date
  let label: string

  switch (range) {
    case 'this-week': {
      start = getWeekStart(now)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const currentDayName = dayNames[now.getDay()]
      label = `Monday ${start.toLocaleDateString()} - ${currentDayName} ${now.toLocaleDateString()}`
      break
    }
    case '7d':
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      label = `${start.toLocaleDateString()} - ${now.toLocaleDateString()}`
      break
    case '30d':
      start = new Date(now)
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      label = `${start.toLocaleDateString()} - ${now.toLocaleDateString()}`
      break
    case '90d':
      start = new Date(now)
      start.setDate(start.getDate() - 90)
      start.setHours(0, 0, 0, 0)
      label = `${start.toLocaleDateString()} - ${now.toLocaleDateString()}`
      break
    default:
      start = new Date(now)
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      label = `${start.toLocaleDateString()} - ${now.toLocaleDateString()}`
  }

  return { start, end, label }
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('energy')
  const [dateRange, setDateRange] = useState('30d')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { accessToken, user } = useAuthStore()
  const reportRef = useRef<HTMLDivElement>(null)

  // Executive users can only export PDF, not CSV
  const canExportCSV = user?.role !== 'executive'

  // Calculate the actual date range based on selection
  const dateRangeInfo = useMemo(() => getDateRangeInfo(dateRange), [dateRange])

  // Fetch report data
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true)
      try {
        // Generate simulated report data based on selected report type
        // In production, this would call an API endpoint
        await new Promise(resolve => setTimeout(resolve, 500))

        const days = dateRange === 'this-week' ? 7 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90

        const data: ReportData = {}

        if (selectedReport === 'energy') {
          data.energy = {
            totalKwh: Math.round(15000 + Math.random() * 5000 * (days / 30)),
            avgDaily: Math.round(500 + Math.random() * 200),
            peakDay: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000).toLocaleDateString(),
            peakKwh: Math.round(800 + Math.random() * 300),
            costEstimate: Math.round((15000 + Math.random() * 5000) * 0.12)
          }
        } else if (selectedReport === 'alerts') {
          // Fetch actual alerts from API
          const alertsResponse = await fetch('/api/alerts?limit=10000', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json()
            const alertItems: AlertRecord[] = Array.isArray(alertsData) ? alertsData : (alertsData.items || [])

            // Calculate summary statistics from actual data
            const critical = alertItems.filter(a => a.severity === 'critical').length
            const high = alertItems.filter(a => a.severity === 'high').length
            const medium = alertItems.filter(a => a.severity === 'medium').length
            const low = alertItems.filter(a => a.severity === 'low').length

            // Calculate average response time (time to acknowledge)
            const acknowledgedAlerts = alertItems.filter(a => a.acknowledged_at)
            let avgResponseMs = 0
            if (acknowledgedAlerts.length > 0) {
              const totalMs = acknowledgedAlerts.reduce((sum, a) => {
                const triggeredTime = new Date(a.triggered_at).getTime()
                const ackTime = new Date(a.acknowledged_at!).getTime()
                return sum + (ackTime - triggeredTime)
              }, 0)
              avgResponseMs = totalMs / acknowledgedAlerts.length
            }
            const avgResponseMinutes = Math.round(avgResponseMs / 60000)

            data.alerts = {
              total: alertItems.length,
              critical,
              high,
              medium,
              low,
              avgResponseTime: avgResponseMinutes > 0 ? `${avgResponseMinutes} minutes` : 'N/A',
              items: alertItems
            }
          } else {
            // Fallback to simulated data if API fails
            data.alerts = {
              total: 0,
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              avgResponseTime: 'N/A',
              items: []
            }
          }
        } else if (selectedReport === 'work-orders') {
          const total = Math.round(15 + Math.random() * 25)
          const completed = Math.round(total * (0.7 + Math.random() * 0.25))
          data.workOrders = {
            total,
            completed,
            completionRate: Math.round((completed / total) * 100),
            avgResolutionTime: `${Math.round(2 + Math.random() * 6)} hours`
          }
        } else if (selectedReport === 'eui') {
          const totalSqFt = 50000 + Math.round(Math.random() * 30000)
          const totalKwh = Math.round(15000 + Math.random() * 5000 * (days / 30))
          data.eui = {
            kwhPerSqFt: Math.round((totalKwh / totalSqFt) * 100) / 100,
            totalSqFt,
            totalKwh,
            benchmark: 'Good (Industry Avg: 0.35 kWh/sqft)'
          }
        }

        setReportData(data)
      } catch (err) {
        console.error('Failed to fetch report data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [selectedReport, dateRange, accessToken])

  // Export PDF using browser print dialog
  const handleExportPDF = async () => {
    setExporting(true)

    // Create a new window with the report content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to export PDF')
      setExporting(false)
      return
    }

    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.name || 'Report'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - SmartSense Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1e293b;
          }
          .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #3b82f6;
            margin: 0 0 10px 0;
          }
          .header p {
            color: #64748b;
            margin: 0;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
          }
          .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .metric-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .metric-card h3 {
            margin: 0 0 5px 0;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
          }
          .metric-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #1e293b;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .metric-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SmartSense</h1>
          <p>Intelligent Energy Management Platform</p>
        </div>

        <div class="section">
          <h2>${reportTitle}</h2>
          <p><strong>Date Range:</strong> ${dateRangeInfo.label}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>Summary</h2>
          <div class="metric-grid">
            ${renderPDFMetrics()}
          </div>
        </div>

        <div class="footer">
          <p>Report generated by SmartSense Energy Management Platform</p>
          <p>This report is confidential and intended for authorized personnel only.</p>
        </div>
      </body>
      </html>
    `)

    function renderPDFMetrics() {
      if (!reportData) return '<p>No data available</p>'

      if (reportData.energy) {
        return `
          <div class="metric-card">
            <h3>Total Energy Consumption</h3>
            <div class="value">${reportData.energy.totalKwh.toLocaleString()} kWh</div>
          </div>
          <div class="metric-card">
            <h3>Average Daily Usage</h3>
            <div class="value">${reportData.energy.avgDaily.toLocaleString()} kWh</div>
          </div>
          <div class="metric-card">
            <h3>Peak Usage Day</h3>
            <div class="value">${reportData.energy.peakDay}</div>
            <p>${reportData.energy.peakKwh.toLocaleString()} kWh</p>
          </div>
          <div class="metric-card">
            <h3>Estimated Cost</h3>
            <div class="value">$${reportData.energy.costEstimate.toLocaleString()}</div>
          </div>
        `
      }

      if (reportData.alerts) {
        return `
          <div class="metric-card">
            <h3>Total Alerts</h3>
            <div class="value">${reportData.alerts.total}</div>
          </div>
          <div class="metric-card">
            <h3>Critical Alerts</h3>
            <div class="value" style="color: #ef4444;">${reportData.alerts.critical}</div>
          </div>
          <div class="metric-card">
            <h3>High Priority</h3>
            <div class="value" style="color: #f59e0b;">${reportData.alerts.high}</div>
          </div>
          <div class="metric-card">
            <h3>Avg Response Time</h3>
            <div class="value">${reportData.alerts.avgResponseTime}</div>
          </div>
        `
      }

      if (reportData.workOrders) {
        return `
          <div class="metric-card">
            <h3>Total Work Orders</h3>
            <div class="value">${reportData.workOrders.total}</div>
          </div>
          <div class="metric-card">
            <h3>Completed</h3>
            <div class="value">${reportData.workOrders.completed}</div>
          </div>
          <div class="metric-card">
            <h3>Completion Rate</h3>
            <div class="value">${reportData.workOrders.completionRate}%</div>
          </div>
          <div class="metric-card">
            <h3>Avg Resolution Time</h3>
            <div class="value">${reportData.workOrders.avgResolutionTime}</div>
          </div>
        `
      }

      if (reportData.eui) {
        return `
          <div class="metric-card">
            <h3>Energy Use Intensity</h3>
            <div class="value">${reportData.eui.kwhPerSqFt} kWh/sqft</div>
          </div>
          <div class="metric-card">
            <h3>Total Square Footage</h3>
            <div class="value">${reportData.eui.totalSqFt.toLocaleString()} sqft</div>
          </div>
          <div class="metric-card">
            <h3>Total Energy</h3>
            <div class="value">${reportData.eui.totalKwh.toLocaleString()} kWh</div>
          </div>
          <div class="metric-card">
            <h3>Benchmark</h3>
            <div class="value" style="font-size: 16px;">${reportData.eui.benchmark}</div>
          </div>
        `
      }

      return '<p>No data available</p>'
    }

    printWindow.document.close()

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
      setExporting(false)
    }, 500)
  }

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData) return

    let csvContent = ''
    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.name || 'Report'

    csvContent += `SmartSense - ${reportTitle}\n`
    csvContent += `Date Range: ${dateRangeInfo.label}\n`
    csvContent += `Generated: ${new Date().toISOString()}\n\n`

    if (reportData.energy) {
      csvContent += 'Metric,Value\n'
      csvContent += `Total Energy Consumption (kWh),${reportData.energy.totalKwh}\n`
      csvContent += `Average Daily Usage (kWh),${reportData.energy.avgDaily}\n`
      csvContent += `Peak Usage Day,${reportData.energy.peakDay}\n`
      csvContent += `Peak Usage (kWh),${reportData.energy.peakKwh}\n`
      csvContent += `Estimated Cost ($),${reportData.energy.costEstimate}\n`
    } else if (reportData.alerts) {
      // Summary section
      csvContent += 'Summary Statistics\n'
      csvContent += 'Metric,Value\n'
      csvContent += `Total Alerts,${reportData.alerts.total}\n`
      csvContent += `Critical,${reportData.alerts.critical}\n`
      csvContent += `High,${reportData.alerts.high}\n`
      csvContent += `Medium,${reportData.alerts.medium}\n`
      csvContent += `Low,${reportData.alerts.low}\n`
      csvContent += `Avg Response Time,${reportData.alerts.avgResponseTime}\n`
      csvContent += '\n'

      // Detailed alert records
      csvContent += 'Alert Records\n'
      csvContent += 'ID,Title,Description,Severity,Status,Asset,Triggered At,Triggered Value,Acknowledged At,Acknowledged By,Resolved At\n'
      for (const alert of reportData.alerts.items) {
        const row = [
          alert.id,
          `"${(alert.title || '').replace(/"/g, '""')}"`,
          `"${(alert.description || '').replace(/"/g, '""')}"`,
          alert.severity,
          alert.status,
          `"${(alert.asset_name || '').replace(/"/g, '""')}"`,
          alert.triggered_at,
          alert.triggered_value ?? '',
          alert.acknowledged_at || '',
          alert.acknowledged_by_name || '',
          alert.resolved_at || ''
        ]
        csvContent += row.join(',') + '\n'
      }
    } else if (reportData.workOrders) {
      csvContent += 'Metric,Value\n'
      csvContent += `Total Work Orders,${reportData.workOrders.total}\n`
      csvContent += `Completed,${reportData.workOrders.completed}\n`
      csvContent += `Completion Rate (%),${reportData.workOrders.completionRate}\n`
      csvContent += `Avg Resolution Time,${reportData.workOrders.avgResolutionTime}\n`
    } else if (reportData.eui) {
      csvContent += 'Metric,Value\n'
      csvContent += `Energy Use Intensity (kWh/sqft),${reportData.eui.kwhPerSqFt}\n`
      csvContent += `Total Square Footage,${reportData.eui.totalSqFt}\n`
      csvContent += `Total Energy (kWh),${reportData.eui.totalKwh}\n`
      csvContent += `Benchmark,${reportData.eui.benchmark}\n`
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smartsense-${selectedReport}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render report content based on selected type
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <span className="text-gray-500">Loading report data...</span>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-400">
          No data available
        </div>
      )
    }

    if (reportData.energy) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Total Consumption</h3>
            <p className="text-2xl font-bold">{reportData.energy.totalKwh.toLocaleString()} kWh</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Avg Daily Usage</h3>
            <p className="text-2xl font-bold">{reportData.energy.avgDaily.toLocaleString()} kWh</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Peak Day</h3>
            <p className="text-lg font-bold">{reportData.energy.peakDay}</p>
            <p className="text-sm text-gray-500">{reportData.energy.peakKwh.toLocaleString()} kWh</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Est. Cost</h3>
            <p className="text-2xl font-bold text-green-600">${reportData.energy.costEstimate.toLocaleString()}</p>
          </div>
        </div>
      )
    }

    if (reportData.alerts) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Total Alerts</h3>
            <p className="text-2xl font-bold">{reportData.alerts.total}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Critical</h3>
            <p className="text-2xl font-bold text-red-600">{reportData.alerts.critical}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">High Priority</h3>
            <p className="text-2xl font-bold text-orange-500">{reportData.alerts.high}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Avg Response</h3>
            <p className="text-2xl font-bold">{reportData.alerts.avgResponseTime}</p>
          </div>
        </div>
      )
    }

    if (reportData.workOrders) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Total Orders</h3>
            <p className="text-2xl font-bold">{reportData.workOrders.total}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{reportData.workOrders.completed}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Completion Rate</h3>
            <p className="text-2xl font-bold">{reportData.workOrders.completionRate}%</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Avg Resolution</h3>
            <p className="text-2xl font-bold">{reportData.workOrders.avgResolutionTime}</p>
          </div>
        </div>
      )
    }

    if (reportData.eui) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">EUI</h3>
            <p className="text-2xl font-bold">{reportData.eui.kwhPerSqFt} kWh/sqft</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Total Area</h3>
            <p className="text-2xl font-bold">{reportData.eui.totalSqFt.toLocaleString()} sqft</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Total Energy</h3>
            <p className="text-2xl font-bold">{reportData.eui.totalKwh.toLocaleString()} kWh</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm text-gray-500 mb-1">Benchmark</h3>
            <p className="text-lg font-bold text-green-600">{reportData.eui.benchmark}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-96 flex items-center justify-center text-gray-400">
        Select a report type to view data
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          {canExportCSV && (
            <button
              onClick={handleExportCSV}
              disabled={!reportData || loading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
              Export CSV
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={!reportData || loading || exporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              selectedReport === report.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <BarChart3 className={`w-6 h-6 mb-2 ${selectedReport === report.id ? 'text-primary' : 'text-gray-400'}`} />
            <h3 className="font-medium">{report.name}</h3>
            <p className="text-sm text-gray-500">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-4 flex-wrap">
        <label htmlFor="date-range" className="text-sm font-medium">Date Range:</label>
        <select
          id="date-range"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="this-week">This Week</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({dateRangeInfo.label})
        </span>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          {reportTypes.find((r) => r.id === selectedReport)?.name}
        </h2>
        {renderReportContent()}
      </div>
    </div>
  )
}
