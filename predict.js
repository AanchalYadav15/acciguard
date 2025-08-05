// Risk factors and their weights
const RISK_WEIGHTS = {
    weather: {
        clear: 1,
        rainy: 2.5,
        foggy: 3,
        snowy: 3.5
    },
    roadCondition: {
        good: 1,
        moderate: 2,
        poor: 3
    },
    timeRiskFactors: {
        morning: 1.5,    // 6-10
        afternoon: 1,    // 10-16
        evening: 2,      // 16-20
        night: 2.5       // 20-6
    }
};

// Store historical data
let historicalData = [];

// Initialize map and markers array
let map = L.map('map').setView([40.7128, -74.0060], 13);
let markers = [];
let heatLayer = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Process uploaded file
async function processFile() {
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];

    if (!file) {
        showError('Please select a file to process');
        return;
    }

    try {
        const fileContent = await readFile(file);
        if (file.name.endsWith('.csv')) {
            historicalData = parseCSV(fileContent);
        } else if (file.name.endsWith('.json')) {
            historicalData = JSON.parse(fileContent);
        } else {
            throw new Error('Unsupported file format');
        }

        // Validate and normalize historical data
        historicalData = historicalData.filter(record => validateHistoricalRecord(record));

        if (historicalData.length === 0) {
            throw new Error('No valid records found in the file');
        }

        // Show success message
        showSuccess(`Successfully processed ${historicalData.length} historical records`);

        // Update map with historical data points
        updateMapWithHistoricalData();

        // Show historical data analysis
        showHistoricalDataAnalysis();

        // Store data for high-risk areas page
        storeHighRiskData();

        // Add button to view high-risk areas
        addViewHighRiskButton();
    } catch (error) {
        showError('Error processing file: ' + error.message);
    }
}

// Validate historical record
function validateHistoricalRecord(record) {
    // Check required fields
    const requiredFields = ['weather', 'roadCondition', 'time'];
    const hasRequiredFields = requiredFields.every(field => record[field]);

    // Normalize data
    if (hasRequiredFields) {
        record.weather = record.weather.toLowerCase();
        record.roadCondition = record.roadCondition.toLowerCase();
        record.trafficDensity = parseInt(record.trafficDensity) || 50;
        record.accidents = parseInt(record.accidents) || 0;

        // Convert various time formats to HH:mm
        try {
            const timeMatch = record.time.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                const [_, hours, minutes] = timeMatch;
                record.time = `${hours.padStart(2, '0')}:${minutes}`;
            }
        } catch (e) {
            return false;
        }
    }

    return hasRequiredFields;
}

// Show historical data analysis
function showHistoricalDataAnalysis() {
    const analysis = analyzeHistoricalData();

    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'alert alert-info';
    analysisDiv.style.marginTop = '20px';

    analysisDiv.innerHTML = `
        <h4>Historical Data Analysis:</h4>
        <div class="row">
            <div class="col-md-6">
                <h5>Risk Factors:</h5>
                <ul>
                    <li>Most risky weather: ${analysis.riskiestWeather}</li>
                    <li>Most risky time: ${analysis.riskiestTime}</li>
                    <li>Average traffic density: ${analysis.avgTrafficDensity}%</li>
                </ul>
            </div>
            <div class="col-md-6">
                <h5>Statistics:</h5>
                <ul>
                    <li>Total incidents: ${historicalData.length}</li>
                    <li>Average risk score: ${analysis.avgRiskScore}%</li>
                    <li>High risk incidents: ${analysis.highRiskCount} (${analysis.highRiskPercentage}%)</li>
                </ul>
            </div>
        </div>
        <div class="mt-3">
            <h5>Recommendations based on historical data:</h5>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `;

    const mapContainer = document.querySelector('.map-container');
    const existingAnalysis = mapContainer.nextElementSibling;
    if (existingAnalysis && existingAnalysis.classList.contains('alert')) {
        existingAnalysis.remove();
    }
    mapContainer.insertAdjacentElement('afterend', analysisDiv);
}

// Analyze historical data
function analyzeHistoricalData() {
    const analysis = {
        weatherCounts: {},
        timeCounts: {},
        totalRiskScore: 0,
        highRiskCount: 0,
        totalTrafficDensity: 0,
        recommendations: []
    };

    historicalData.forEach(record => {
        const riskScore = calculateHistoricalRiskScore(record) * 100;

        // Count weather conditions
        analysis.weatherCounts[record.weather] = (analysis.weatherCounts[record.weather] || 0) + 1;

        // Count time periods
        const timePeriod = getTimePeriod(parseInt(record.time.split(':')[0]));
        analysis.timeCounts[timePeriod] = (analysis.timeCounts[timePeriod] || 0) + 1;

        // Track high risk incidents
        if (riskScore >= 66) {
            analysis.highRiskCount++;
        }

        analysis.totalRiskScore += riskScore;
        analysis.totalTrafficDensity += record.trafficDensity;
    });

    // Calculate statistics
    const riskiestWeather = Object.entries(analysis.weatherCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    const riskiestTime = Object.entries(analysis.timeCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

    // Generate recommendations
    if (analysis.weatherCounts['rainy'] > historicalData.length * 0.3) {
        analysis.recommendations.push('Exercise extra caution during rainy conditions');
    }
    if (analysis.timeCounts['night'] > historicalData.length * 0.3) {
        analysis.recommendations.push('Avoid night-time travel when possible');
    }
    if (analysis.totalTrafficDensity / historicalData.length > 70) {
        analysis.recommendations.push('Consider alternative routes during peak hours');
    }

    return {
        riskiestWeather: riskiestWeather.charAt(0).toUpperCase() + riskiestWeather.slice(1),
        riskiestTime: riskiestTime.charAt(0).toUpperCase() + riskiestTime.slice(1),
        avgRiskScore: Math.round(analysis.totalRiskScore / historicalData.length),
        highRiskCount: analysis.highRiskCount,
        highRiskPercentage: Math.round((analysis.highRiskCount / historicalData.length) * 100),
        avgTrafficDensity: Math.round(analysis.totalTrafficDensity / historicalData.length),
        recommendations: analysis.recommendations
    };
}

// Read file content
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Parse CSV content
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            const values = line.split(',').map(v => v.trim());
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index];
            });
            return record;
        });
}

// Update map with historical data
function updateMapWithHistoricalData() {
    // Clear existing heat layer
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    // Convert historical data to heat layer points
    const points = historicalData
        .filter(data => data.latitude && data.longitude)
        .map(data => {
            return [
                parseFloat(data.latitude),
                parseFloat(data.longitude),
                calculateHistoricalRiskScore(data)
            ];
        });

    // Create and add heat layer
    heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        max: 1.0,
        gradient: {
            0.4: 'blue',
            0.6: 'lime',
            0.8: 'orange',
            1.0: 'red'
        }
    }).addTo(map);
}

// Calculate risk score from historical data
function calculateHistoricalRiskScore(data) {
    let score = 0;

    // Weather factor
    if (data.weather) {
        score += (RISK_WEIGHTS.weather[data.weather.toLowerCase()] || 1) * 10;
    }

    // Road condition factor
    if (data.roadCondition) {
        score += (RISK_WEIGHTS.roadCondition[data.roadCondition.toLowerCase()] || 1) * 10;
    }

    // Time factor
    if (data.time) {
        const hour = parseInt(data.time.split(':')[0]);
        const timePeriod = getTimePeriod(hour);
        score += RISK_WEIGHTS.timeRiskFactors[timePeriod] * 10;
    }

    // Traffic density factor
    if (data.trafficDensity) {
        score += (parseInt(data.trafficDensity) / 10);
    }

    // Past accidents factor
    if (data.accidents) {
        score += Math.min(parseInt(data.accidents) * 2, 10);
    }

    return Math.min(Math.round(score), 100) / 100; // Normalize to 0-1 for heatmap
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    insertAlert(errorDiv);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    insertAlert(successDiv);
}

// Insert alert message
function insertAlert(alertDiv) {
    const fileUploadContainer = document.querySelector('.file-upload-container');
    const existingAlert = fileUploadContainer.nextElementSibling;
    if (existingAlert && existingAlert.classList.contains('alert')) {
        existingAlert.remove();
    }
    fileUploadContainer.insertAdjacentElement('afterend', alertDiv);
}

// Get time period based on hour
function getTimePeriod(hour) {
    if (hour >= 6 && hour < 10) return 'morning';
    if (hour >= 10 && hour < 16) return 'afternoon';
    if (hour >= 16 && hour < 20) return 'evening';
    return 'night';
}

// Calculate risk score (0-100)
function calculateRiskScore(data) {
    let score = 0;
    const hour = parseInt(data.time.split(':')[0]);
    const timePeriod = getTimePeriod(hour);

    // Basic factors
    score += RISK_WEIGHTS.weather[data.weather] * 10;
    score += RISK_WEIGHTS.roadCondition[data.roadCondition] * 10;
    score += RISK_WEIGHTS.timeRiskFactors[timePeriod] * 10;
    score += (data.trafficDensity / 10);
    score += Math.min(data.pastAccidents * 2, 10);

    // Historical data influence
    if (historicalData.length > 0) {
        const locationInfluence = calculateLocationInfluence(data);
        score = (score * 0.7) + (locationInfluence * 0.3); // 70% current factors, 30% historical
    }

    return Math.min(Math.round(score), 100);
}

// Calculate location-based risk influence from historical data
function calculateLocationInfluence(currentData) {
    if (historicalData.length === 0) return 0;

    // Get current coordinates
    const currentLat = parseFloat(currentData.latitude);
    const currentLon = parseFloat(currentData.longitude);

    // Find relevant historical incidents (within ~1km radius)
    const relevantIncidents = historicalData.filter(incident => {
        const incidentLat = parseFloat(incident.latitude);
        const incidentLon = parseFloat(incident.longitude);

        // Rough distance calculation (in km)
        const distance = calculateDistance(currentLat, currentLon, incidentLat, incidentLon);
        return distance <= 1;
    });

    if (relevantIncidents.length === 0) return 0;

    // Calculate average historical risk score
    const totalRisk = relevantIncidents.reduce((sum, incident) =>
        sum + calculateHistoricalRiskScore(incident) * 100, 0);

    return totalRisk / relevantIncidents.length;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI/180);
}

// Convert address to coordinates using OpenStreetMap Nominatim API
async function getCoordinates(location) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
        const data = await response.json();
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        throw new Error('Location not found');
    } catch (error) {
        throw new Error('Failed to geocode location');
    }
}

// Update map with risk visualization
function updateMap(coordinates, riskScore) {
    // Clear existing markers
    markers.forEach(marker => map.removeMarker(marker));
    markers = [];

    // Add new marker
    const color = riskScore < 33 ? 'green' : riskScore < 66 ? 'orange' : 'red';
    const marker = L.circleMarker(coordinates, {
        radius: 20,
        fillColor: color,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
    }).addTo(map);

    marker.bindPopup(`Risk Score: ${riskScore}%`).openPopup();
    markers.push(marker);
    map.setView(coordinates, 15);
}

// Show prediction results
function showPredictionResults(riskScore, geocodingFailed) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'alert ' + (riskScore < 33 ? 'alert-success' : riskScore < 66 ? 'alert-warning' : 'alert-danger');
    resultDiv.style.marginTop = '20px';
    resultDiv.innerHTML = `
        <h4>Accident Risk Analysis Results:</h4>
        ${geocodingFailed ? '<p class="text-warning"><small>* Location could not be found on map. Analysis based on provided factors and historical data.</small></p>' : ''}
        <p>Risk Score: ${riskScore}%</p>
        <p>Risk Level: ${riskScore < 33 ? 'Low' : riskScore < 66 ? 'Moderate' : 'High'}</p>
        <p>Recommendations:</p>
        <ul>
            ${riskScore >= 66 ? '<li>Extreme caution advised</li>' : ''}
            ${riskScore >= 33 ? '<li>Maintain safe distance</li>' : ''}
            <li>Follow traffic rules</li>
            <li>Stay alert</li>
        </ul>
        ${historicalData.length > 0 ? `<p><small>* Analysis includes patterns from ${historicalData.length} historical incidents</small></p>` : ''}
    `;

    const form = document.querySelector('form');
    const existingAlert = form.nextElementSibling;
    if (existingAlert && existingAlert.classList.contains('alert')) {
        existingAlert.remove();
    }
    form.insertAdjacentElement('afterend', resultDiv);
}

// Main prediction function
async function predictAccident() {
    try {
        // Get form values
        const data = {
            location: document.getElementById('location').value,
            time: document.getElementById('time').value,
            weather: document.getElementById('weather').value,
            trafficDensity: parseInt(document.getElementById('trafficDensity').value),
            roadCondition: document.getElementById('roadCondition').value,
            pastAccidents: parseInt(document.getElementById('pastAccidents').value) || 0
        };

        // Validate inputs
        if (!data.time || !data.weather || !data.roadCondition) {
            throw new Error('Please fill in all required fields');
        }

        let coordinates = null;
        let geocodingFailed = false;

        // Try to get coordinates if location is provided
        if (data.location.trim()) {
            try {
                coordinates = await getCoordinates(data.location);
                data.latitude = coordinates[0];
                data.longitude = coordinates[1];
            } catch (error) {
                geocodingFailed = true;
                console.warn('Geocoding failed:', error);
            }
        }

        // Calculate risk score
        const riskScore = calculateRiskScore(data);

        // Update map if coordinates are available
        if (coordinates) {
            updateMap(coordinates, riskScore);
        } else if (historicalData.length > 0) {
            // If no coordinates but we have historical data, show the heatmap
            updateMapWithHistoricalData();
        }

        // Show results with appropriate message
        showPredictionResults(riskScore, geocodingFailed);

    } catch (error) {
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = error.message;
        const form = document.querySelector('form');
        const existingAlert = form.nextElementSibling;
        if (existingAlert && existingAlert.classList.contains('alert')) {
            existingAlert.remove();
        }
        form.insertAdjacentElement('afterend', errorDiv);
    }
}

// Store high risk data for high-risk-areas page
function storeHighRiskData() {
    const highRiskData = historicalData.map(record => {
        const riskScore = calculateHistoricalRiskScore(record) * 100;
        const hour = parseInt(record.time.split(':')[0]);
        const timePeriod = getTimePeriod(hour);

        return {
            location: record.location || 'Unknown Location',
            risk_level: getRiskLevel(riskScore),
            risk_score: Math.round(riskScore),
            risk_factors: {
                traffic_density: record.trafficDensity + '%',
                weather_condition: record.weather.charAt(0).toUpperCase() + record.weather.slice(1),
                road_condition: record.roadCondition.charAt(0).toUpperCase() + record.roadCondition.slice(1),
                time_of_day: timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1),
                historical_incidents: record.accidents || 0
            },
            latitude: record.latitude,
            longitude: record.longitude,
            timestamp: new Date().toISOString(),
            recommendations: generateRecommendations(riskScore, record)
        };
    });

    // Store in localStorage
    localStorage.setItem('highRiskData', JSON.stringify(highRiskData));
    localStorage.setItem('lastUpdated', new Date().toISOString());
}

// Get risk level based on score
function getRiskLevel(score) {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}

// Generate recommendations based on risk factors
function generateRecommendations(riskScore, data) {
    const recommendations = [];

    if (riskScore >= 60) {
        recommendations.push('Extreme caution required in this area');
    }

    if (data.weather === 'rainy' || data.weather === 'snowy' || data.weather === 'foggy') {
        recommendations.push(`Exercise additional caution during ${data.weather} conditions`);
    }

    if (data.roadCondition === 'poor') {
        recommendations.push('Reduce speed due to poor road conditions');
    }

    if (parseInt(data.trafficDensity) > 70) {
        recommendations.push('Consider alternative routes during peak hours');
    }

    if (data.accidents > 2) {
        recommendations.push('Area has history of multiple incidents');
    }

    const hour = parseInt(data.time.split(':')[0]);
    if (hour >= 20 || hour <= 5) {
        recommendations.push('Extra vigilance required during night-time travel');
    }

    return recommendations;
}

// Add button to view high-risk areas
function addViewHighRiskButton() {
    const existingButton = document.querySelector('.view-high-risk-btn');
    if (existingButton) {
        return;
    }

    const button = document.createElement('div');
    button.className = 'col-12 text-center mt-3';
    button.innerHTML = `
        <a href="high-risk-areas.html" class="btn btn-warning btn-lg">
            View High Risk Areas Analysis
        </a>
    `;

    const formContainer = document.querySelector('.form-container');
    formContainer.appendChild(button);
}