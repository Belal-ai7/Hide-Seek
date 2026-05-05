import os
from flask import Flask, render_template, jsonify

app = Flask(__name__, 
            template_folder='ui/templates', 
            static_folder='ui/static')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def status():
    return jsonify({"status": "Game Server Running", "player": "Moaz"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)