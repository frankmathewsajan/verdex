### **App Specification & Developer Guide: Soil Nutrient Monitor**

-----

### 1\. Product Overview

We are building a mobile application for monitoring and analyzing soil nutrient data. The app provides live data ("Present"), long-term analysis ("History"), daily activity tracking ("Map"), and actionable advice ("Recommendation"). It is designed around these four primary modules and a set of core services (Reporting, Messaging).

-----

### 2\. Core User Flow

This is the required user journey from app launch to the main dashboard.

1.  **Launch App** ➔ User is presented with the **Login Screen**.
2.  **Successful Login** ➔ User is routed to the **Language Selection Screen**.
      * **Options:** English (Active), Hindi (Inactive), Telugu (Inactive).
3.  **Language Selected** ➔ User lands on the **Main Menu (Home Screen)**.
4.  **Home Screen** ➔ User can select one of the four core modules.

-----

### 3\. Component Specifications (Feature Deep Dive)

This guide breaks down each feature into its components and user stories.

#### 🏠 Component 1: Main Menu (Home Screen)

  * **User Story:** "As a user, I want a clear dashboard so I can easily navigate to the app's main functions."
  * **Layout:** A 2x2 grid.
  * **Modules:**
    1.  **Present** (Live Data)
    2.  **History** (Data & Trends)
    3.  **Map** (Daily Tracking)
    4.  **Recommendation** (Fertilizer Prescription)

#### ⚡ Component 2: Present (Live Data View)

  * **User Story:** "As a user, I want to see the *live* soil data from my connected device so I can understand the *current* soil health."
  * **Features:**
      * **Connection Indicator:** Must be in the phone's top status bar area.
          * **State 1 (Receiving):** A **blinking green** symbol.
          * **State 2 (Not Receiving):** A **red** symbol.
      * **Parameter Display:** A list of all live parameters (NPK, Moisture, Temperature, pH, etc.).
      * **Visuals:** Each parameter must have a "battery-style" icon with a color scale from **dark red to dark green** to show health.
      * **Data:** The exact percentage or value (e.g., "2.5%") must be displayed *below* each icon.
      * **Summary Chart:** A **pie chart** in the corner visualizing the proportions of the parameters.

#### 🗓️ Component 3: History (Data & Trend Analysis)

  * **User Story:** "As a user, I want to review my *past* data to see trends and track soil health over time."
  * **Features:**
      * **Data Scope:** Must pull data for the **last one month**.
      * **Main View:** A **calendar** that highlights dates that contain saved data.
      * **Drill-Down:** When a user clicks a date, the app must show a list of the different **locations** and **times** where data was collected on that day.
      * **Trend Graph:** A line graph below the calendar.
          * **X-Axis:** Date (spanning the last month).
          * **Averaging Logic (Key Requirement):** The graph must plot the **daily average** for each parameter. If 5 spots were measured on one day, the graph plots the average of those 5 readings as a single point for that day.

#### 🗺️ Component 4: Map (Daily Activity View)

  * **User Story:** "As a user, I want to see my *entire path for today* and view exactly where I collected data on a map."
  * **Features:**
      * **Data Scope:** **Today only.**
      * **Initial View:** The map must open centered on the user's **current location**.
      * **Display Logic:** Place pins on the map *only* at the specific locations where data was collected today.
      * **Data on Pin:** When a pin is tapped, it must show the **time** that data was collected at that spot.

#### 🔬 Component 5: Recommendation (Fertilizer Prescription)

  * **User Story:** "As a user, I want to select a crop I plan to grow and get a simple, actionable prescription for the fertilizers I need, based on my most recent soil data."
  * **Workflow:**
    1.  User taps "Recommendation."
    2.  The app *automatically* (and *hidden* from the user) fetches the **most recent data point** (e.g., from yesterday or 10 minutes ago) from the History store.
    3.  The app displays the **Crop Selection View**.
  * **Features (Crop Selection View):**
      * A grid of 5-6 prominent crop icons (e.g., Paddy, Cotton, Tomato, Chili, Maize, Pulses).
      * An option to "Add New Crop" (for unlisted crops).
  * **Workflow (continued):**
    4\.  User selects a crop (e.g., "Paddy").
    5\.  The app sends the `MostRecentData` and `SelectedCrop` to the cloud backend.
    6\.  The backend performs an "inherent calculation" (hidden logic) to create one combined prescription.
    7\.  The app displays the **Prescription View**.
  * **Features (Prescription View):**
      * **CRITICAL:** This must be a static **page**, *not* a chatbot interface.
      * **Header:** "Recommendations for: Paddy"
      * **Data Context:** "Based on your soil data from: Date & Time of Most Recent Data"
      * **Prescription:** A clear, combined list of required fertilizers/medications (e.g., "Fertilizer A: X kg/acre," "Fertilizer B: Y kg/acre"). This list does *not* explain *why* (e.g., "for nitrogen..."). It is a final prescription.
      * **Action Bar (on the side):** A set of three icons:
        1.  **Message**
        2.  **Voice**
        3.  **Report**

-----

### 4\. Core Services (Shared Functions)

This section describes shared services used by the components above.

  * **Service 1: Report Generation**
      * **History Report:** Accessed from the **History** tab. Generates a PDF of the last 30 days, including trend graphs and map paths.
      * **Recommendation Report:** Accessed from the **Recommendation** tab. Generates a PDF of only the *current* prescription (the recent data point used + the resulting fertilizer list).
  * **Service 2: Messaging**
      * Accessed from the **Recommendation** tab.
      * Function: Sends the text of the prescription via SMS to the farmer's mobile.
  * **Service 3: Voice**
      * Accessed from the **Recommendation** tab.
      * Function: Uses Text-to-Speech (TTS) to read the prescription aloud in the user's selected language (English, Hindi, or Telugu).

-----

### 5\. Simplified Data Model

Each time the user takes a measurement, a `DataPoint` object must be saved to the server. This model powers all app features.

```
DataPoint {
  id: "unique_id_123",
  timestamp: "2025-11-10T12:30:00Z",
  location: {
    latitude: 16.5062,
    longitude: 80.6480
  },
  parameters: {
    nitrogen: 2.5,
    potassium: 1.8,
    phosphorus: 1.1,
    pH: 6.8,
    moisture: 35.0
  }
}
```

  * **Present:** Reads live data from the device *before* it's saved as a `DataPoint`.
  * **History:** Queries all `DataPoint`s where `timestamp` is in the last 30 days.
  * **Map:** Queries all `DataPoint`s where `timestamp` is *today*.
  * **Recommendation:** Queries for the *single latest* `DataPoint` by `timestamp`.

That covers all four modules\! Does this complete developer guide look correct?