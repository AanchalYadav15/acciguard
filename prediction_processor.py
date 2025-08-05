import pandas as pd
import numpy as np
from datetime import datetime
import json

class PredictionProcessor:
    def __init__(self):
        # Initialize prediction weights
        self.weights = {
            'traffic_density': 0.3,
            'historical_incidents': 0.25,
            'weather_condition': 0.2,
            'road_condition': 0.15,
            'time_of_day': 0.1
        }

        # Risk factor mappings
        self.weather_risk = {
            'rain': 0.8,
            'snow': 0.9,
            'fog': 0.7,
            'clear': 0.2,
            'cloudy': 0.4
        }

        self.road_condition_risk = {
            'poor': 0.9,
            'fair': 0.5,
            'good': 0.2,
            'excellent': 0.1
        }

        self.traffic_density_risk = {
            'very high': 0.9,
            'high': 0.7,
            'medium': 0.5,
            'low': 0.2
        }

        self.time_risk = {
            'peak_morning': 0.8,
            'peak_evening': 0.8,
            'night': 0.6,
            'off_peak': 0.3
        }

    def process_file(self, file):
        """Process uploaded file and return predictions"""
        file_ext = file.filename.split('.')[-1].lower()

        if file_ext == 'csv':
            return self._process_csv(file)
        elif file_ext == 'json':
            return self._process_json(file)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or JSON file.")

    def _process_csv(self, file):
        """Process CSV file and return predictions"""
        df = pd.read_csv(file)
        predictions = []

        for _, row in df.iterrows():
            prediction = self._generate_prediction(row)
            predictions.append(prediction)

        return predictions

    def _process_json(self, file):
        """Process JSON file and return predictions"""
        data = json.load(file)
        predictions = []

        if isinstance(data, list):
            for item in data:
                prediction = self._generate_prediction(item)
                predictions.append(prediction)
        else:
            prediction = self._generate_prediction(data)
            predictions.append(prediction)

        return predictions

    def _generate_prediction(self, data):
        """Generate prediction for a single data point"""
        # Calculate risk score
        risk_score = self._calculate_risk_score(data)

        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)

        # Generate recommendations
        recommendations = self._generate_recommendations(risk_level, data)

        # Generate high-risk coordinates (simulated)
        high_risk_areas = self._generate_high_risk_areas(data)

        return {
            "timestamp": datetime.now().isoformat(),
            "location": data.get('location', 'Unknown Location'),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "high_risk_areas": high_risk_areas,
            "risk_factors": {
                "traffic_density": data.get('traffic_density', 'medium').lower(),
                "weather_condition": data.get('weather_condition', 'clear').lower(),
                "road_condition": data.get('road_condition', 'good').lower(),
                "time_of_day": data.get('time_of_day', 'off_peak').lower(),
                "historical_incidents": int(data.get('historical_incidents', 0))
            },
            "recommendations": recommendations
        }

    def _calculate_risk_score(self, data):
        """Calculate risk score based on various factors"""
        score = 0

        # Traffic density contribution
        traffic = data.get('traffic_density', 'medium').lower()
        score += self.weights['traffic_density'] * self.traffic_density_risk.get(traffic, 0.5)

        # Historical incidents contribution
        incidents = int(data.get('historical_incidents', 0))
        incident_score = min(incidents / 10, 1)  # Normalize to 0-1
        score += self.weights['historical_incidents'] * incident_score

        # Weather condition contribution
        weather = data.get('weather_condition', 'clear').lower()
        score += self.weights['weather_condition'] * self.weather_risk.get(weather, 0.2)

        # Road condition contribution
        road = data.get('road_condition', 'good').lower()
        score += self.weights['road_condition'] * self.road_condition_risk.get(road, 0.2)

        # Time of day contribution
        time = data.get('time_of_day', 'off_peak').lower()
        score += self.weights['time_of_day'] * self.time_risk.get(time, 0.3)

        return int(score * 100)  # Convert to 0-100 scale

    def _determine_risk_level(self, risk_score):
        """Determine risk level based on risk score"""
        if risk_score >= 80:
            return "Very High"
        elif risk_score >= 60:
            return "High"
        elif risk_score >= 40:
            return "Medium"
        else:
            return "Low"

    def _generate_recommendations(self, risk_level, data):
        """Generate recommendations based on risk level and factors"""
        recommendations = []

        if risk_level in ["Very High", "High"]:
            recommendations.extend([
                "Increase police patrol in the area",
                "Install additional traffic signals",
                "Add warning signs"
            ])

            if data.get('weather_condition', '').lower() in ['rain', 'snow', 'fog']:
                recommendations.append("Install weather warning systems")

            if int(data.get('historical_incidents', 0)) > 5:
                recommendations.append("Conduct thorough safety audit")

        elif risk_level == "Medium":
            recommendations.extend([
                "Monitor traffic patterns",
                "Consider road maintenance",
                "Review signage"
            ])

        else:
            recommendations.extend([
                "Regular monitoring",
                "Maintain current safety measures"
            ])

        return recommendations

    def _generate_high_risk_areas(self, data):
        """Generate high-risk area coordinates (simulated)"""
        # In a real application, this would use actual geographic data
        base_lat = float(data.get('latitude', 28.6))
        base_lon = float(data.get('longitude', 77.1))

        return [
            [base_lat + np.random.uniform(-0.1, 0.1), base_lon + np.random.uniform(-0.1, 0.1)],
            [base_lat + np.random.uniform(-0.1, 0.1), base_lon + np.random.uniform(-0.1, 0.1)]
        ]