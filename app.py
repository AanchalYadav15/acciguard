from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from database import Database
from flask_socketio import SocketIO, emit
from prediction_processor import PredictionProcessor
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
db = Database()
processor = PredictionProcessor()

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'json'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload-predict', methods=['POST'])
def upload_predict():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file format. Please upload CSV or JSON file"}), 400

        # Process the file and get predictions
        predictions = processor.process_file(file)

        # Save predictions to database
        for prediction in predictions:
            db.save_prediction(prediction)
            # Emit each prediction to connected clients
            socketio.emit('new_prediction', prediction)

        return jsonify({
            "message": "File processed successfully",
            "predictions_count": len(predictions)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get input data from request
        data = {
            'location': request.form.get("location", ""),
            'time_of_day': request.form.get("time", ""),
            'weather_condition': request.form.get("weather", ""),
            'traffic_density': request.form.get("traffic_density", ""),
            'road_condition': request.form.get("road_condition", ""),
            'historical_incidents': request.form.get("past_accidents", 0),
            'latitude': request.form.get("latitude", 28.6),
            'longitude': request.form.get("longitude", 77.1)
        }

        # Generate prediction
        prediction = processor._generate_prediction(data)

        # Save to database
        db.save_prediction(prediction)

        # Emit the new prediction to all connected clients
        socketio.emit('new_prediction', prediction)

        return jsonify(prediction)

    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/get-high-risk-areas', methods=['GET'])
def get_high_risk_areas():
    try:
        hours = request.args.get('hours', default=24, type=int)
        predictions = db.get_predictions(hours=hours)
        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/get-stats', methods=['GET'])
def get_stats():
    try:
        stats = db.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)})

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send initial data to the newly connected client
    emit('initial_data', {
        'predictions': db.get_predictions(),
        'stats': db.get_stats()
    })

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, debug=True)
