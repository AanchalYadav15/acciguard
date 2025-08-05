import sqlite3
from datetime import datetime
import json

class Database:
    def __init__(self):
        self.conn = sqlite3.connect('accident_predictions.db', check_same_thread=False)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()

        # Create predictions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            location TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            traffic_density TEXT,
            weather_condition TEXT,
            road_condition TEXT,
            time_of_day TEXT,
            historical_incidents INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Create recommendations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id INTEGER,
            recommendation TEXT NOT NULL,
            FOREIGN KEY (prediction_id) REFERENCES predictions (id)
        )
        ''')

        # Create high risk areas table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS high_risk_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id INTEGER,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            FOREIGN KEY (prediction_id) REFERENCES predictions (id)
        )
        ''')

        self.conn.commit()

    def save_prediction(self, data):
        cursor = self.conn.cursor()

        # Insert prediction
        cursor.execute('''
        INSERT INTO predictions (
            timestamp, location, risk_score, risk_level,
            traffic_density, weather_condition, road_condition,
            time_of_day, historical_incidents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['timestamp'],
            data['location'],
            data['risk_score'],
            data['risk_level'],
            data['risk_factors']['traffic_density'],
            data['risk_factors']['weather_condition'],
            data['risk_factors']['road_condition'],
            data['risk_factors']['time_of_day'],
            data['risk_factors']['historical_incidents']
        ))

        prediction_id = cursor.lastrowid

        # Insert recommendations
        for rec in data['recommendations']:
            cursor.execute('''
            INSERT INTO recommendations (prediction_id, recommendation)
            VALUES (?, ?)
            ''', (prediction_id, rec))

        # Insert high risk areas
        for area in data['high_risk_areas']:
            cursor.execute('''
            INSERT INTO high_risk_areas (prediction_id, latitude, longitude)
            VALUES (?, ?, ?)
            ''', (prediction_id, area[0], area[1]))

        self.conn.commit()
        return prediction_id

    def get_predictions(self, hours=24, limit=50):
        cursor = self.conn.cursor()

        # Get predictions with their associated data
        cursor.execute('''
        SELECT
            p.id, p.timestamp, p.location, p.risk_score, p.risk_level,
            p.traffic_density, p.weather_condition, p.road_condition,
            p.time_of_day, p.historical_incidents
        FROM predictions p
        WHERE datetime(timestamp) > datetime('now', '-' || ? || ' hours')
        ORDER BY p.timestamp DESC
        LIMIT ?
        ''', (hours, limit))

        predictions = []
        for row in cursor.fetchall():
            pred_id = row[0]

            # Get recommendations for this prediction
            cursor.execute('SELECT recommendation FROM recommendations WHERE prediction_id = ?', (pred_id,))
            recommendations = [r[0] for r in cursor.fetchall()]

            # Get high risk areas for this prediction
            cursor.execute('SELECT latitude, longitude FROM high_risk_areas WHERE prediction_id = ?', (pred_id,))
            high_risk_areas = [[float(r[0]), float(r[1])] for r in cursor.fetchall()]

            predictions.append({
                "timestamp": row[1],
                "location": row[2],
                "risk_score": row[3],
                "risk_level": row[4],
                "risk_factors": {
                    "traffic_density": row[5],
                    "weather_condition": row[6],
                    "road_condition": row[7],
                    "time_of_day": row[8],
                    "historical_incidents": row[9]
                },
                "recommendations": recommendations,
                "high_risk_areas": high_risk_areas
            })

        return predictions

    def get_stats(self):
        cursor = self.conn.cursor()

        # Get total predictions in last 24 hours
        cursor.execute('''
        SELECT COUNT(*) FROM predictions
        WHERE datetime(timestamp) > datetime('now', '-1 day')
        ''')
        total_predictions = cursor.fetchone()[0]

        # Get average risk score
        cursor.execute('SELECT AVG(risk_score) FROM predictions')
        avg_risk_score = cursor.fetchone()[0] or 0

        # Get most common factor
        cursor.execute('''
        SELECT weather_condition, COUNT(*) as count
        FROM predictions
        GROUP BY weather_condition
        ORDER BY count DESC
        LIMIT 1
        ''')
        most_common_factor = cursor.fetchone()

        return {
            "total_predictions": total_predictions,
            "avg_risk_score": round(avg_risk_score, 2),
            "most_common_factor": most_common_factor[0] if most_common_factor else "Unknown"
        }

    def close(self):
        self.conn.close()