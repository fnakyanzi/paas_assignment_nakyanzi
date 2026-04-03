from flask import Flask, request, jsonify
import psycopg2
import os

app = Flask(__name__)

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@app.route('/')
def home():
    return "Railway Flask App Running 🚀"

@app.route('/create', methods=['POST'])
def create():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO users (name) VALUES (%s)", (data['name'],))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "User created"})

@app.route('/users')
def users():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    data = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
