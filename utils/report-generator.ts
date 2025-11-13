import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

interface SensorData {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  ph?: number;
  pH?: number;
  moisture?: number;
  temperature?: number;
  created_at?: string;
  latitude?: number;
  longitude?: number;
}

interface Recommendation {
  type: string;
  description: string;
  amount?: string;
}

interface HistoryReportOptions {
  userId: string;
  days?: number; // Default 30 days
}

interface RecommendationReportOptions {
  userName: string;
  data: SensorData;
  recommendations: Recommendation[];
}

/**
 * Calculate overall soil health percentage
 */
const calculateHealthPercentage = (data: SensorData): number => {
  const ph = data.pH || data.ph || 0;
  
  const optimalRanges = {
    nitrogen: { optimal: 280, min: 0, max: 560 },
    phosphorus: { optimal: 55, min: 0, max: 110 },
    potassium: { optimal: 205, min: 0, max: 410 },
    ph: { optimal: 6.5, min: 4.5, max: 8.5 },
    moisture: { optimal: 50, min: 0, max: 100 },
    temperature: { optimal: 25, min: 0, max: 50 },
  };
  
  const getHealthPercentage = (value: number, optimal: number, min: number, max: number) => {
    if (value === optimal) return 100;
    if (value < optimal) {
      const range = optimal - min;
      const distance = optimal - value;
      return Math.max(0, Math.min(100, 100 - (distance / range) * 100));
    } else {
      const range = max - optimal;
      const distance = value - optimal;
      return Math.max(0, Math.min(100, 100 - (distance / range) * 100));
    }
  };
  
  const nHealth = getHealthPercentage(data.nitrogen || 0, optimalRanges.nitrogen.optimal, optimalRanges.nitrogen.min, optimalRanges.nitrogen.max);
  const pHealth = getHealthPercentage(data.phosphorus || 0, optimalRanges.phosphorus.optimal, optimalRanges.phosphorus.min, optimalRanges.phosphorus.max);
  const kHealth = getHealthPercentage(data.potassium || 0, optimalRanges.potassium.optimal, optimalRanges.potassium.min, optimalRanges.potassium.max);
  const phHealth = getHealthPercentage(ph, optimalRanges.ph.optimal, optimalRanges.ph.min, optimalRanges.ph.max);
  const moistureHealth = getHealthPercentage(data.moisture || 0, optimalRanges.moisture.optimal, optimalRanges.moisture.min, optimalRanges.moisture.max);
  const tempHealth = getHealthPercentage(data.temperature || 0, optimalRanges.temperature.optimal, optimalRanges.temperature.min, optimalRanges.temperature.max);
  
  const overallHealth = (nHealth + pHealth + kHealth + phHealth + moistureHealth + tempHealth) / 6;
  return Math.round(overallHealth);
};

/**
 * Get health color based on percentage
 */
const getHealthColor = (percentage: number): string => {
  if (percentage >= 90) return '#15803d'; // Dark green
  if (percentage >= 75) return '#16a34a'; // Bright green
  if (percentage >= 60) return '#84cc16'; // Yellow-green
  if (percentage >= 45) return '#eab308'; // Yellow
  if (percentage >= 25) return '#f97316'; // Orange
  return '#dc2626'; // Red
};

/**
 * Generate HTML for History Report
 */
const generateHistoryReportHTML = (data: SensorData[], dateRange: { start: string; end: string }): string => {
  // Calculate averages
  const avg = {
    nitrogen: data.reduce((sum, d) => sum + (d.nitrogen || 0), 0) / data.length,
    phosphorus: data.reduce((sum, d) => sum + (d.phosphorus || 0), 0) / data.length,
    potassium: data.reduce((sum, d) => sum + (d.potassium || 0), 0) / data.length,
    ph: data.reduce((sum, d) => sum + ((d.pH || d.ph) || 0), 0) / data.length,
    moisture: data.reduce((sum, d) => sum + (d.moisture || 0), 0) / data.length,
    temperature: data.reduce((sum, d) => sum + (d.temperature || 0), 0) / data.length,
  };
  
  const avgHealth = calculateHealthPercentage(avg as SensorData);
  const healthColor = getHealthColor(avgHealth);
  
  // Format dates
  const startDate = new Date(dateRange.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const endDate = new Date(dateRange.end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Soil Analysis Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #666; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #16a34a; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .stat-unit { font-size: 14px; color: #666; margin-left: 4px; }
        .health-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 16px; color: #fff; background: ${healthColor}; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .data-table th { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
        .data-table td { border: 1px solid #e5e7eb; padding: 10px; font-size: 11px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #666; }
        .recommendations { background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; border-radius: 4px; }
        .recommendation-item { margin-bottom: 10px; font-size: 13px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🌱 EarthSmell</div>
        <div class="title">Soil Analysis Report</div>
        <div class="subtitle">${startDate} - ${endDate}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Summary Statistics</div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="margin-bottom: 10px; font-size: 14px; color: #666;">Overall Soil Health</div>
          <span class="health-badge">${avgHealth}%</span>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Nitrogen (N)</div>
            <div class="stat-value">${avg.nitrogen.toFixed(1)}<span class="stat-unit">kg/ha</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Phosphorus (P)</div>
            <div class="stat-value">${avg.phosphorus.toFixed(1)}<span class="stat-unit">kg/ha</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Potassium (K)</div>
            <div class="stat-value">${avg.potassium.toFixed(1)}<span class="stat-unit">kg/ha</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">pH Level</div>
            <div class="stat-value">${avg.ph.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Moisture</div>
            <div class="stat-value">${avg.moisture.toFixed(1)}<span class="stat-unit">%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Temperature</div>
            <div class="stat-value">${avg.temperature.toFixed(1)}<span class="stat-unit">°C</span></div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Data Collection Summary</div>
        <p style="font-size: 14px; margin-bottom: 10px;">Total Readings: <strong>${data.length}</strong></p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>N (kg/ha)</th>
              <th>P (kg/ha)</th>
              <th>K (kg/ha)</th>
              <th>pH</th>
              <th>Moisture (%)</th>
              <th>Temp (°C)</th>
            </tr>
          </thead>
          <tbody>
            ${data.slice(0, 10).map(d => `
              <tr>
                <td>${d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>${d.nitrogen || 'N/A'}</td>
                <td>${d.phosphorus || 'N/A'}</td>
                <td>${d.potassium || 'N/A'}</td>
                <td>${(d.pH || d.ph) || 'N/A'}</td>
                <td>${d.moisture || 'N/A'}</td>
                <td>${d.temperature || 'N/A'}</td>
              </tr>
            `).join('')}
            ${data.length > 10 ? `<tr><td colspan="7" style="text-align: center; color: #666; font-style: italic;">Showing 10 of ${data.length} readings</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Key Observations</div>
        <div class="recommendations">
          <div class="recommendation-item">
            <strong>📊 Data Collection:</strong> ${data.length} readings collected over the period.
          </div>
          <div class="recommendation-item">
            <strong>🌡️ Temperature Range:</strong> ${Math.min(...data.map(d => d.temperature || 0)).toFixed(1)}°C - ${Math.max(...data.map(d => d.temperature || 0)).toFixed(1)}°C
          </div>
          <div class="recommendation-item">
            <strong>💧 Moisture Range:</strong> ${Math.min(...data.map(d => d.moisture || 0)).toFixed(1)}% - ${Math.max(...data.map(d => d.moisture || 0)).toFixed(1)}%
          </div>
          <div class="recommendation-item">
            <strong>⚖️ pH Stability:</strong> Average pH is ${avg.ph.toFixed(2)} (${avg.ph < 6.0 ? 'Acidic' : avg.ph > 7.5 ? 'Alkaline' : 'Optimal'})
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>EarthSmell Soil Monitoring System</strong></p>
        <p>Report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="margin-top: 10px;">For detailed recommendations, visit the EarthSmell app or consult your agricultural advisor.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML for Recommendation Report
 */
const generateRecommendationReportHTML = (userName: string, data: SensorData, recommendations: Recommendation[]): string => {
  const ph = data.pH || data.ph || 0;
  const health = calculateHealthPercentage(data);
  const healthColor = getHealthColor(health);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Soil Treatment Prescription</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #666; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #16a34a; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .patient-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .patient-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .current-values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .value-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
        .value-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
        .value-number { font-size: 22px; font-weight: bold; color: #1a1a1a; }
        .value-unit { font-size: 12px; color: #666; margin-left: 4px; }
        .health-section { text-align: center; margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
        .health-badge { display: inline-block; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 20px; color: #fff; background: ${healthColor}; }
        .prescription { background: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; border-radius: 4px; margin-top: 20px; }
        .prescription-item { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #bbf7d0; }
        .prescription-item:last-child { margin-bottom: 0; border-bottom: none; }
        .prescription-type { font-size: 14px; font-weight: bold; color: #15803d; margin-bottom: 5px; }
        .prescription-desc { font-size: 13px; line-height: 1.6; margin-bottom: 5px; }
        .prescription-amount { font-size: 13px; color: #15803d; font-weight: 600; }
        .warning { background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; border-radius: 4px; margin-top: 20px; }
        .warning-text { font-size: 13px; line-height: 1.6; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #666; }
        .rx-symbol { font-size: 48px; color: #16a34a; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🌱 EarthSmell</div>
        <div class="rx-symbol">℞</div>
        <div class="title">Soil Treatment Prescription</div>
        <div class="subtitle">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      
      <div class="section">
        <div class="patient-info">
          <div class="patient-name">Farmer: ${userName || 'User'}</div>
          <div class="subtitle">Prescription Date: ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Current Soil Analysis</div>
        <div class="current-values">
          <div class="value-card">
            <div class="value-label">Nitrogen (N)</div>
            <div class="value-number">${data.nitrogen}<span class="value-unit">kg/ha</span></div>
          </div>
          <div class="value-card">
            <div class="value-label">Phosphorus (P)</div>
            <div class="value-number">${data.phosphorus}<span class="value-unit">kg/ha</span></div>
          </div>
          <div class="value-card">
            <div class="value-label">Potassium (K)</div>
            <div class="value-number">${data.potassium}<span class="value-unit">kg/ha</span></div>
          </div>
          <div class="value-card">
            <div class="value-label">pH Level</div>
            <div class="value-number">${ph.toFixed(2)}</div>
          </div>
          <div class="value-card">
            <div class="value-label">Moisture</div>
            <div class="value-number">${data.moisture}<span class="value-unit">%</span></div>
          </div>
          <div class="value-card">
            <div class="value-label">Temperature</div>
            <div class="value-number">${data.temperature}<span class="value-unit">°C</span></div>
          </div>
        </div>
        
        <div class="health-section">
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Overall Soil Health Score</div>
          <span class="health-badge">${health}%</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Treatment Recommendations</div>
        <div class="prescription">
          ${recommendations.map((rec, index) => `
            <div class="prescription-item">
              <div class="prescription-type">${index + 1}. ${rec.type}</div>
              <div class="prescription-desc">${rec.description}</div>
              ${rec.amount ? `<div class="prescription-amount">📦 Amount: ${rec.amount}</div>` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="warning">
          <div class="warning-text">
            <strong>⚠️ Important Notes:</strong><br>
            • Follow recommended application rates carefully<br>
            • Apply treatments during appropriate weather conditions<br>
            • Re-test soil after 2-4 weeks to monitor progress<br>
            • Consult with agricultural experts for specific crop requirements<br>
            • Store all fertilizers and amendments safely away from children and animals
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>EarthSmell Soil Monitoring System</strong></p>
        <p>This prescription is based on current soil analysis data</p>
        <p style="margin-top: 10px;">For support or questions, contact your EarthSmell representative</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate History Report PDF
 */
export const generateHistoryReport = async (options: HistoryReportOptions): Promise<string> => {
  const { userId, days = 30 } = options;
  
  try {
    console.log('📄 Generating history report...');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch data from database
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data available for the selected period');
    }
    
    // Limit data to prevent memory issues
    const limitedData = data.slice(0, 100);
    
    // Generate HTML
    const html = generateHistoryReportHTML(limitedData, {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
    
    // Validate HTML size (max 5MB)
    const htmlSize = new Blob([html]).size;
    console.log(`📊 HTML size: ${(htmlSize / 1024).toFixed(2)} KB`);
    
    if (htmlSize > 5 * 1024 * 1024) {
      throw new Error('Report data too large. Please reduce the date range.');
    }
    
    // Generate PDF with timeout
    const { uri } = await Promise.race([
      Print.printToFileAsync({ 
        html,
        base64: false,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), 30000)
      ),
    ]);
    
    console.log('✅ History report generated:', uri);
    
    return uri;
  } catch (error: any) {
    console.error('❌ Error generating history report:', error);
    if (error.message?.includes('PDF data')) {
      throw new Error('Failed to write PDF. Try clearing app cache or reducing data range.');
    }
    throw error;
  }
};

/**
 * Generate Recommendation Report PDF
 */
export const generateRecommendationReport = async (options: RecommendationReportOptions): Promise<string> => {
  const { userName, data, recommendations } = options;
  
  try {
    console.log('📄 Generating recommendation report...');
    
    // Generate HTML
    const html = generateRecommendationReportHTML(userName, data, recommendations);
    
    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });
    console.log('✅ Recommendation report generated:', uri);
    
    return uri;
  } catch (error) {
    console.error('❌ Error generating recommendation report:', error);
    throw error;
  }
};

/**
 * Share PDF report
 */
export const shareReport = async (uri: string, title: string = 'Soil Report'): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
    
    console.log('✅ Report shared successfully');
  } catch (error) {
    console.error('❌ Error sharing report:', error);
    throw error;
  }
};
