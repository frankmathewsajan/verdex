import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Location {
  latitude: number;
  longitude: number;
  isLive: boolean;
}

interface GoogleMapProps {
  locations: Location[];
  height?: number;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const GoogleMap: React.FC<GoogleMapProps> = ({ locations, height = 300 }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // VIT AP University coordinates
  const VIT_AP_LAT = 16.5085;
  const VIT_AP_LNG = 80.5134;

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Filter out duplicate/very close locations (within 10 meters)
  const filterCloseLocations = (locs: Location[]) => {
    if (locs.length === 0) return locs;
    
    const filtered: Location[] = [locs[0]];
    const MIN_DISTANCE = 10; // 10 meters threshold
    
    for (let i = 1; i < locs.length; i++) {
      const isDuplicate = filtered.some(existing => {
        const distance = calculateDistance(
          existing.latitude, existing.longitude,
          locs[i].latitude, locs[i].longitude
        );
        return distance < MIN_DISTANCE;
      });
      
      if (!isDuplicate) {
        filtered.push(locs[i]);
      }
    }
    
    return filtered;
  };

  // Calculate maximum distance between any two points
  const getMaxDistance = (locs: Location[]) => {
    if (locs.length < 2) return 0;
    
    let maxDist = 0;
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const dist = calculateDistance(
          locs[i].latitude, locs[i].longitude,
          locs[j].latitude, locs[j].longitude
        );
        maxDist = Math.max(maxDist, dist);
      }
    }
    return maxDist;
  };

  // Smart centering: prioritize live data, then historical, then VIT AP
  const getCenterCoordinates = () => {
    const liveLocations = locations.filter(loc => loc.isLive);
    
    if (liveLocations.length > 0) {
      // Center on live locations (red markers)
      const filtered = filterCloseLocations(liveLocations);
      const lat = filtered.reduce((sum, loc) => sum + loc.latitude, 0) / filtered.length;
      const lng = filtered.reduce((sum, loc) => sum + loc.longitude, 0) / filtered.length;
      
      // If all locations are very close (within 50m), zoom to max
      const maxDist = getMaxDistance(filtered);
      const zoom = maxDist < 50 ? 20 : maxDist < 100 ? 18 : maxDist < 500 ? 16 : 15;
      
      return { lat, lng, zoom };
    } else if (locations.length > 0) {
      // Center on historical locations (green markers)
      const filtered = filterCloseLocations(locations);
      const lat = filtered.reduce((sum, loc) => sum + loc.latitude, 0) / filtered.length;
      const lng = filtered.reduce((sum, loc) => sum + loc.longitude, 0) / filtered.length;
      
      // If all locations are very close (within 50m), zoom to max
      const maxDist = getMaxDistance(filtered);
      const zoom = maxDist < 50 ? 20 : maxDist < 100 ? 18 : maxDist < 500 ? 16 : 13;
      
      return { lat, lng, zoom };
    } else {
      // Default to VIT AP University
      return { lat: VIT_AP_LAT, lng: VIT_AP_LNG, zoom: 15 };
    }
  };

  const { lat: centerLat, lng: centerLng, zoom } = getCenterCoordinates();

  // Use filtered locations for markers (remove duplicates)
  const uniqueLocations = filterCloseLocations(locations);

  // Generate markers HTML
  const generateMarkers = () => {
    return uniqueLocations.map((loc, index) => {
      const color = loc.isLive ? '#fb444a' : '#0bda95'; // Red for live, Green for historical
      const title = loc.isLive ? 'Live Reading' : `Reading ${index + 1}`;
      
      return `
        <gmp-advanced-marker 
          position="${loc.latitude},${loc.longitude}" 
          title="${title}">
          <div style="
            width: 20px; 
            height: 20px; 
            background-color: ${color}; 
            border: 3px solid white; 
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        </gmp-advanced-marker>
      `;
    }).join('\n');
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Soil Reading Locations</title>
        <script async src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAIXtUM9R3YqAK2Nh6XkGor2EfCjQ5R1zE&callback=initMap&libraries=maps,marker&v=beta">
        </script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          #map {
            height: 100%;
            width: 100%;
          }
          /* Hide map type controls */
          .gm-style .gm-style-mtc,
          .gm-bundled-control,
          .gm-svpc {
            display: none !important;
          }
        </style>
        <script>
          let map;
          
          async function initMap() {
            const { Map } = await google.maps.importLibrary("maps");
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
            
            map = new Map(document.getElementById("map"), {
              center: { lat: ${centerLat}, lng: ${centerLng} },
              zoom: ${zoom},
              mapId: "DEMO_MAP_ID",
              mapTypeId: 'satellite', // Set satellite as default
              disableDefaultUI: false, // Keep zoom controls
              mapTypeControl: false, // Hide map type control button
              streetViewControl: false, // Hide street view
              fullscreenControl: false, // Hide fullscreen button
            });

            // Add markers
            ${uniqueLocations.map((loc, index) => {
              const color = loc.isLive ? '#fb444a' : '#0bda95';
              const title = loc.isLive ? 'Live Reading' : `Reading ${index + 1}`;
              return `
              const marker${index} = document.createElement('div');
              marker${index}.style.width = '20px';
              marker${index}.style.height = '20px';
              marker${index}.style.backgroundColor = '${color}';
              marker${index}.style.border = '3px solid white';
              marker${index}.style.borderRadius = '50%';
              marker${index}.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              
              new AdvancedMarkerElement({
                map: map,
                position: { lat: ${loc.latitude}, lng: ${loc.longitude} },
                content: marker${index},
                title: "${title}"
              });
              `;
            }).join('\n')}

            ${locations.length === 0 ? `
              // VIT AP University marker
              const vitMarker = document.createElement('div');
              vitMarker.style.width = '25px';
              vitMarker.style.height = '25px';
              vitMarker.style.backgroundColor = '#4285F4';
              vitMarker.style.border = '3px solid white';
              vitMarker.style.borderRadius = '50%';
              vitMarker.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
              
              new AdvancedMarkerElement({
                map: map,
                position: { lat: ${VIT_AP_LAT}, lng: ${VIT_AP_LNG} },
                content: vitMarker,
                title: "VIT AP University"
              });
            ` : ''}
          }
          
          window.initMap = initMap;
        </script>
      </head>
      <body>
        <div id="map"></div>
      </body>
    </html>
  `;

  return (
    <>
      {/* Normal View */}
      <View style={[styles.container, { height }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
        
        {/* Fullscreen Button */}
        <TouchableOpacity 
          style={styles.fullscreenButton}
          onPress={() => setIsFullscreen(true)}
        >
          <Ionicons name="expand-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.fullscreenWebview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          {/* Info Badge */}
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              {uniqueLocations.filter(loc => loc.isLive).length > 0 ? '🔴 Live' : '📍'} {uniqueLocations.length} location{uniqueLocations.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#3a3d42',
    position: 'relative',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#1a1b1e',
  },
  fullscreenWebview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  infoBadge: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  infoBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GoogleMap;
