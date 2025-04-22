from flask import Flask, send_from_directory, request, jsonify
import json
from datetime import datetime
import os

app = Flask(__name__, static_url_path='')

# Путь к файлу с сообщениями обратной связи
FEEDBACK_FILE = 'feedback.json'

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/models/<path:path>')
def send_model(path):
    return send_from_directory('models', path)

@app.route('/save-feedback', methods=['POST'])
def save_feedback():
    try:
        # Получаем данные из запроса
        feedback_data = request.json
        
        # Загружаем существующие сообщения
        if os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as file:
                data = json.load(file)
        else:
            data = {"messages": []}
        
        # Добавляем новое сообщение
        feedback_data['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        data['messages'].append(feedback_data)
        
        # Сохраняем обновленные данные
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
        
        return jsonify({"status": "success"}), 200
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Маршрут для обслуживания статических файлов (JS, CSS)
@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)