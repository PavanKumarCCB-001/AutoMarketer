from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3 , requests   # Requests for Google Trends API
import google.generativeai as genai
from transformers import pipeline   # For HuggingFace fallback
import os, datetime
from pytrends.request import TrendReq
import hashlib  # For password hashing

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

genai.configure(api_key='')  # Gemini API key
DB_NAME = 'msme.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # Allows dictionary-like access
    return conn

# Initialize DB with products and drafts tables
def init_db():
    conn = get_db_connection()
    conn.execute('''CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,offers TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, content TEXT, product_id INTEGER)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users  (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, organization TEXT)''')
    try:
        conn.execute('''ALTER TABLE drafts ADD COLUMN generated_at TEXT''')
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        conn.execute('''ALTER TABLE drafts ADD COLUMN user_id INTEGER''')
    except sqlite3.OperationalError:
        pass  # Ignore if columns already exist
    try:
        conn.execute('''ALTER TABLE products ADD COLUMN user_id INTEGER''')
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

init_db()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'up'})

# NEW: Get all products
@app.route('/products', methods=['GET'])
def get_products():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        return jsonify([]), 200
    products = conn.execute('SELECT * FROM products WHERE user_id = ?',(user['id'],)).fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])

# NEW: Add a new product
@app.route('/products', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name')
    description = data.get('description', '')
    offers = data.get('offers', '')
    user_email = data.get('user_email')  # We'll send from frontend
    
    if not name or not user_email:
        return jsonify({'error': 'Name and user required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    cursor = conn.execute('INSERT INTO products (name, description, offers, user_id) VALUES (?, ?, ?,?)', (name, description, offers,user['id']) )
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': product_id, 'message': 'Product added successfully'}), 201

# NEW: Generate content endpoint
@app.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    product_id = data.get('product_id')
    platform = data.get('platform')
    user_email = data.get('user_email')

    if not product_id or not platform or not user_email:
        return jsonify({'error': 'Missing product_id, platform, or user_email'}), 400

    conn = get_db_connection()

    # Fetch product
    product = conn.execute('SELECT * FROM products WHERE id = ? AND user_id IN (SELECT id FROM users WHERE email = ?)', 
                           (product_id, user_email)).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or not yours'}), 404

    # Fetch user_id safely
    user_row = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user_row:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    user_id = user_row['id']

    product_name = product['name']
    description = product['description'] or ''
    offers = product['offers'] or ''

    # Mock trending hashtags (reliable for demo)
    trending_keywords = ['smallbusiness', 'handmade', 'supportlocal', 'shoplocal', 'msme', 'madeinindia', 'artisan', 'entrepreneur']
    if 'wallet' in product_name.lower():
        trending_keywords += ['leatherwallet', 'mensfashion', 'everydaycarry', 'giftsforhim']
    elif 'laptop' in product_name.lower():
        trending_keywords += ['gaminglaptop', 'tech', 'productivity', 'asusrog']
    trend_hashtags = ' '.join([f'#{kw}' for kw in trending_keywords[:8]])

    # Build prompt
    platform_prompts = {
        'instagram': f"Write an engaging Instagram caption for '{product_name}'. Description: {description}. Offer: {offers}. Short, fun, 5-8 emojis, call to action. Include these hashtags: {trend_hashtags}",
        'linkedin': f"Write a professional LinkedIn post promoting '{product_name}' from an MSME. Description: {description}. Highlight offer: {offers}. Authentic, end with CTA.",
        'email': f"Write a promotional email subject + body for '{product_name}'. Description: {description}. Offer: {offers}. Make it urgent and persuasive.",
        'blog': f"Write a 150-200 word blog summary introducing '{product_name}' from a local MSME. Description: {description}. Offer: {offers}. Storytelling style."
    }
    prompt = platform_prompts.get(platform.lower(), "Write engaging marketing content.")

    # Generate content safely
    content = "Sorry, generation failed. Try again."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')  # or gemini-2.5-flash if it works for you
        response = model.generate_content(prompt)
        content = response.text.strip()
    except Exception as e:
        print("Gemini failed:", str(e))
        # Fallback message only — no HuggingFace to avoid torch issues
        content = f"Sample {platform} content for {product_name}: Elevate your style with premium quality! {trend_hashtags}"

    # Save draft — now 100% safe
    try:
        conn.execute(
            'INSERT INTO drafts (type, content, product_id, user_id, generated_at) VALUES (?, ?, ?, ?, ?)',
            (platform, content, product_id, user_id, datetime.datetime.now().isoformat())
        )
        conn.commit()
    except Exception as db_e:
        print("DB save error:", db_e)

    conn.close()

    return jsonify({
        'content': content,
        'platform': platform,
        'product_name': product_name
    })

@app.route('/drafts', methods=['GET'])
def get_drafts():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        return jsonify([]), 200
    drafts = conn.execute('''SELECT d.id, d.type, d.content, d.generated_at, p.name as product_name 
        FROM drafts d JOIN products p ON d.product_id = p.id 
        WHERE d.user_id = ? ORDER BY d.id DESC ''', (user['id'],)).fetchall()
    conn.close()
    return jsonify([dict(d) for d in drafts])

# NEW: Delete a product
@app.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    data = request.json or {}
    user_email = data.get('user_email')

    if not user_email:
        return jsonify({'error': 'user_email required'}), 400

    conn = get_db_connection()
    
    # Check if product belongs to user
    product = conn.execute('SELECT p.id FROM products p JOIN users u ON p.user_id = u.id WHERE p.id = ? AND u.email = ?', 
                           (product_id, user_email)).fetchone()
    
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or not yours'}), 404

    # Delete related drafts first
    conn.execute('DELETE FROM drafts WHERE product_id = ?', (product_id,))
    
    # Delete product
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    
    conn.commit()
    conn.close()

    return jsonify({'message': 'Product deleted successfully'}), 200

# NEW: Signup endpoint
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    organization = data.get('organization', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (email, password_hash, organization) VALUES (?, ?, ?)',
                     (email, hash_password(password), organization))
        conn.commit()
        return jsonify({'message': 'Signup successful'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400
    finally:
        conn.close()

# NEW: Login endpoint
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if user and user['password_hash'] == hash_password(password):
        return jsonify({'message': 'Login successful', 'user': {'id': user['id'], 'email': user['email'], 'organization': user['organization']}})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port, debug=False)