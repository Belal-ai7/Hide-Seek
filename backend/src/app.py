import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}})

@app.route('/api/data')
def get_data():
    return jsonify({"message": "Hello from Flask Backend!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)