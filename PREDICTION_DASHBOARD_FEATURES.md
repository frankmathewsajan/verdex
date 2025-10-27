# Prediction Dashboard Features

## Dashboard (app/(tabs)/index.tsx)

### ✅ Features Implemented

1. **Real-time Current Readings**
   - Fetches live data from Supabase Edge Function `/latest-soil-readings`
   - Displays Nitrogen (N), Phosphorus (P), Potassium (K), and pH Level
   - Shows timestamp of last reading
   - Auto-refreshes every 30 seconds silently

2. **Interactive Nutrient Filters**
   - Click any nutrient card to select it
   - Selected card highlighted with border
   - Filter options: Nitrogen, Phosphorus, Potassium, pH
   - Each nutrient has unique color coding:
     - Nitrogen: Red (#fb444a)
     - Phosphorus: Green (#0bda95)
     - Potassium: Orange (#ffa500)
     - pH: Blue (#00bfff)

3. **Prediction-Based Forecast Charts**
   - Fetches predictions from `/predict` Edge Function
   - Displays forecast data as SVG line charts
   - Shows grid lines for better readability
   - Dynamic chart generation based on forecast array
   - Time labels show hours into the future

4. **Trend Analysis**
   - Shows current value vs predicted values
   - Displays trend direction (increasing/decreasing)
   - Visual indicators with up/down arrows
   - Color-coded trends (green for up, red for down)

5. **Statistical Information**
   - Min, Mean, Max values from predictions
   - Range and Standard Deviation
   - Data points count
   - Organized in clean grid layout

6. **Smart Loading States**
   - Initial load shows full loading spinner
   - Background updates are silent (no re-render)
   - Manual refresh shows loading state
   - Error handling with retry button

## History Tab (app/(tabs)/history.tsx)

### ✅ Features Implemented

1. **Sensor Reading History**
   - Fetches from `raw_sensor_readings` table via Supabase REST API
   - Limited to 100 most recent readings
   - Ordered by recorded_at descending (newest first)

2. **Rich Data Display**
   - Shows all NPK values and pH
   - Displays additional metrics (moisture, temperature, EC)
   - Device ID for tracking
   - Timestamp for each reading

3. **Card-Based UI**
   - Clean card layout for each reading
   - Grid display for main nutrients
   - Icons for additional metrics
   - Easy to scan and compare data

4. **Refresh Functionality**
   - Pull to refresh capability
   - Manual refresh button in header
   - Loading states
   - Error handling with retry

## API Integration

### Edge Functions Used

1. **`/functions/v1/latest-soil-readings`**
   - Returns latest reading from soil_readings table
   - Used for current values dashboard

2. **`/functions/v1/predict`**
   - Returns predictions from external ML API
   - Provides forecast arrays for N, P, K, pH
   - Includes statistics and trend analysis

3. **`/rest/v1/raw_sensor_readings`**
   - Standard Supabase REST endpoint
   - Fetches historical sensor data
   - Supports ordering and limiting

### Authentication
All API calls include:
- `Authorization: Bearer <anon-key>` header
- `apikey` header for REST endpoints
- Environment variables from `.env.local`

## UI/UX Enhancements

- **Color Coding**: Each nutrient has distinct colors
- **Interactive Cards**: Tap to filter/select nutrients
- **Smooth Updates**: Background refreshes don't disrupt UI
- **Clean Design**: SOIL.OS dark theme maintained
- **Responsive Charts**: SVG charts scale to screen width
- **Status Feedback**: Clear loading, error, and empty states

## Next Steps (Optional)

- [ ] Add date range filters for history
- [ ] Export history data to CSV
- [ ] Push notifications for alerts
- [ ] Historical chart comparisons
- [ ] Device switching if multiple devices
- [ ] Offline data caching
