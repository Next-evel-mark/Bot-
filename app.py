from flask import Flask, request, jsonify
import subprocess
import uuid
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Simple in-memory store for users and bots (for demo only)
users = {}  # username -> {password_hash, bots: [bot_ids]}
bots = {}   # bot_id -> {owner, status}

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    if username in users:
        return jsonify({"error": "username already exists"}), 400
    users[username] = {
        "password_hash": generate_password_hash(password),
        "bots": []
    }
    return jsonify({"message": "User registered successfully."}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user = users.get(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid username or password"}), 401
    # In a real app, return JWT or session token here
    return jsonify({"message": "Login successful"})

@app.route('/deploy_bot', methods=['POST'])
def deploy_bot():
    data = request.json
    username = data.get('username')  # for demo purposes, pass username here
    repo_url = data.get('repo_url')
    if username not in users:
        return jsonify({"error": "User not found"}), 404
    if not repo_url:
        return jsonify({"error": "repo_url required"}), 400

    bot_id = str(uuid.uuid4())
    clone_path = f'/tmp/{bot_id}'

    try:
        # Clone GitHub repo
        subprocess.run(['git', 'clone', repo_url, clone_path], check=True)

        # Build Docker image named as bot_id (repo must have a Dockerfile)
        subprocess.run(['docker', 'build', '-t', bot_id, clone_path], check=True)

        # Run Docker container detached
        subprocess.run([
            'docker', 'run', '-d',
            '--name', bot_id,
            '--memory', '512m',         # resource limit example
            '--cpus', '0.5',            # limit CPU
            bot_id
        ], check=True)

        # Update user and bot records
        users[username]['bots'].append(bot_id)
        bots[bot_id] = {"owner": username, "status": "running"}

        return jsonify({"message": f"Bot deployed successfully with id {bot_id}"}), 201

    except subprocess.CalledProcessError as e:
        # Cleanup on failure
        if os.path.exists(clone_path):
            subprocess.run(['rm', '-rf', clone_path])
        return jsonify({"error": "Failed to clone, build, or run bot container"}), 500

@app.route('/list_bots', methods=['GET'])
def list_bots():
    username = request.args.get('username')
    if username not in users:
        return jsonify({"error": "User not found"}), 404
    user_bots = users[username]['bots']
    return jsonify({"bots": user_bots})

@app.route('/stop_bot', methods=['POST'])
def stop_bot():
    data = request.json
    bot_id = data.get('bot_id')
    username = data.get('username')
    if bot_id not in bots or bots[bot_id]['owner'] != username:
        return jsonify({"error": "Bot not found or unauthorized"}), 404

    try:
        subprocess.run(['docker', 'stop', bot_id], check=True)
        bots[bot_id]['status'] = 'stopped'
        return jsonify({"message": f"Bot {bot_id} stopped successfully"})
    except subprocess.CalledProcessError:
        return jsonify({"error": "Failed to stop bot"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
