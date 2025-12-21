from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import requests
import google.generativeai as genai
import os
import datetime
import hashlib
from dotenv import load_dotenv
from flask import send_from_directory
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all for demo (change to your Vercel URL in production)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

DB_NAME = 'msme.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''CREATE TABLE IF NOT EXISTS products 
                    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                     name TEXT NOT NULL, 
                     description TEXT, 
                     offers TEXT, 
                     user_id INTEGER)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS drafts 
                    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                     type TEXT, 
                     content TEXT, 
                     product_id INTEGER, 
                     user_id INTEGER, 
                     generated_at TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS users 
                    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                     email TEXT UNIQUE NOT NULL, 
                     password_hash TEXT NOT NULL, 
                     organization TEXT)''')
    conn.commit()
    conn.close()

init_db()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'up'})

# Products - GET (filtered by user)
@app.route('/products', methods=['GET'])
def get_products():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        conn.close()
        return jsonify([]), 200
    
    products = conn.execute('SELECT * FROM products WHERE user_id = ?', (user['id'],)).fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])

# Products - POST
@app.route('/products', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name')
    description = data.get('description', '')
    offers = data.get('offers', '')
    user_email = data.get('user_email')
    
    if not name or not user_email:
        return jsonify({'error': 'Name and user_email required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    
    cursor = conn.execute('INSERT INTO products (name, description, offers, user_id) VALUES (?, ?, ?, ?)', 
                          (name, description, offers, user['id']))
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': product_id, 'message': 'Product added successfully'}), 201

# Delete product
@app.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    data = request.json or {}
    user_email = data.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400

    conn = get_db_connection()
    product = conn.execute('SELECT p.id FROM products p JOIN users u ON p.user_id = u.id WHERE p.id = ? AND u.email = ?', 
                           (product_id, user_email)).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or not yours'}), 404

    conn.execute('DELETE FROM drafts WHERE product_id = ?', (product_id,))
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Product deleted successfully'}), 200

# Generate content
@app.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    product_id = data.get('product_id')
    platform = data.get('platform')
    user_email = data.get('user_email')

    if not product_id or not platform or not user_email:
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ? AND user_id IN (SELECT id FROM users WHERE email = ?)', 
                           (product_id, user_email)).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or not yours'}), 404

    user_row = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user_row:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    user_id = user_row['id']

    product_name = product['name']
    description = product['description'] or ''
    offers = product['offers'] or ''

    # Mock hashtags
    trending_keywords = ['smallbusiness', 'handmade', 'supportlocal', 'shoplocal', 'msme', 'madeinindia', 'artisan', 'entrepreneur']
    if 'wallet' in product_name.lower():
        trending_keywords += ['leatherwallet', 'mensfashion', 'everydaycarry']
    elif 'laptop' in product_name.lower():
        trending_keywords += ['gaminglaptop', 'tech', 'productivity']
    trend_hashtags = ' '.join([f'#{kw}' for kw in trending_keywords[:8]])

    platform_prompts = {
        'instagram': f"Write an engaging Instagram caption for '{product_name}'. {description}. Offer: {offers}. Short, fun, 5-8 emojis, call to action. Hashtags: {trend_hashtags}",
        'linkedin': f"Write a professional LinkedIn post for '{product_name}'. {description}. Highlight offer: {offers}. End with CTA.",
        'email': f"Write a promotional email subject + body for '{product_name}'. {description}. Offer: {offers}. Urgent and persuasive.",
        'blog': f"Write a 150-200 word blog post introducing '{product_name}' from an MSME. {description}. Offer: {offers}. Storytelling style."
    }
    prompt = platform_prompts.get(platform.lower(), "Write marketing content.")

    content = "Sorry, generation failed."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        content = response.text.strip()
    except Exception as e:
        print("Gemini failed:", str(e))
        content = f"Sample {platform} content for {product_name}. {trend_hashtags}"

    # Save draft
    conn.execute('INSERT INTO drafts (type, content, product_id, user_id, generated_at) VALUES (?, ?, ?, ?, ?)',
                 (platform, content, product_id, user_id, datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return jsonify({'content': content, 'platform': platform, 'product_name': product_name})

# Drafts history
@app.route('/drafts', methods=['GET'])
def get_drafts():
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'user_email required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ?', (user_email,)).fetchone()
    if not user:
        conn.close()
        return jsonify([]), 200
    
    drafts = conn.execute('''
        SELECT d.id, d.type, d.content, d.generated_at, p.name as product_name 
        FROM drafts d 
        JOIN products p ON d.product_id = p.id 
        WHERE d.user_id = ? 
        ORDER BY d.id DESC
    ''', (user['id'],)).fetchall()
    conn.close()
    return jsonify([dict(d) for d in drafts])

# Signup
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

# Login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if user and user['password_hash'] == hash_password(password):
        return jsonify({
            'message': 'Login successful', 
            'user': {
                'id': user['id'], 
                'email': user['email'], 
                'organization': user['organization']
            }
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Ayrshare - Instagram & LinkedIn
# Ayrshare - Instagram & LinkedIn
@app.route('/post_social', methods=['POST'])
def post_social():
    data = request.json
    content = data.get('content')
    platform = data.get('platform')
    product_name = data.get('product_name', 'product')  # ← Get from frontend
    api_key = os.getenv('AYRSHARE_API_KEY')

    if not content or not platform:
        return jsonify({'error': 'Missing content or platform'}), 400

    payload = {
        "post": content,
        "platforms": [platform]
    }

    # Add relevant image for Instagram
    if platform == 'instagram':
        query = product_name.lower().replace(' ', '+')
        image_url = f"https://source.unsplash.com/1080x1080/?{query},product,professional"
        payload["mediaUrls"] = [image_url]

    try:
        response = requests.post(
            "https://app.ayrshare.com/api/post",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        result = response.json()
        if response.status_code == 200:
            return jsonify({'message': 'Posted successfully!', 'data': result}), 200
        else:
            return jsonify({'error': result}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    data = request.json
    content = data.get('content')
    platform = data.get('platform')
    api_key = os.getenv('AYRSHARE_API_KEY')

    if not content or not platform:
        return jsonify({'error': 'Missing content or platform'}), 400

    payload = {
        "post": content,
        "platforms": [platform]
    }

    # Add image for Instagram (required)
    if platform == 'instagram':
        # Random high-quality product image from Unsplash
        payload["mediaUrls"] = [f"https://source.unsplash.com/1080x1080/?{product_name.lower().replace(' ', '+')},product"]

    try:
        response = requests.post(
            "https://app.ayrshare.com/api/post",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        result = response.json()
        if response.status_code == 200:
            return jsonify({'message': 'Posted successfully!', 'data': result}), 200
        else:
            return jsonify({'error': result}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_and_post_instagram', methods=['POST'])
def generate_and_post_instagram():
    data = request.json
    content = data.get('content')
    product_description = data.get('product_description', 'product')
    platform = 'instagram'
    api_key = os.getenv('AYRSHARE_API_KEY')

    if not content:
        return jsonify({'error': 'Missing content'}), 400

    # Use high-quality random product image from Unsplash (always works)
    # You can customize query: ?product, ?wallet, ?phone, ?jewelry
    query = product_description.lower().replace(' ', '+')
    image_url = f"https://source.unsplash.com/1080x1080/?{query},product,professional"

    payload = {
        "post": content,
        "platforms": [platform],
        "mediaUrls": [image_url]
    }

    try:
        response = requests.post(
            "https://app.ayrshare.com/api/post",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        result = response.json()
        if response.status_code == 200:
            return jsonify({'message': 'Posted to Instagram with image!', 'data': result}), 200
        else:
            return jsonify({'error': result}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# Brevo - Email
@app.route('/send_email', methods=['POST'])
def send_email():
    data = request.json
    content = data.get('content')
    recipient = data.get('recipient')
    api_key = os.getenv('BREVO_API_KEY')

    if not content or not recipient:
        return jsonify({'error': 'Missing content or recipient'}), 400

    # Convert plain text to nice HTML with formatting
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h1 style="color: #2c3e50; text-align: center;">Exclusive Offer from AutoMarketer</h1>
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <div style="font-size: 16px; white-space: pre-wrap;">
            {content.replace('\n', '<br>')}
          </div>
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #7f8c8d; font-size: 14px;">
              Sent via <strong>AutoMarketer</strong> — Your AI Marketing Agent
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    payload = {
        "sender": {"name": "AutoMarketer", "email": "gunda.pavan.g@gmail.com"},  # ← Your verified Brevo email
        "to": [{"email": recipient}],
        "subject": "Exclusive Offer from AutoMarketer",
        "htmlContent": html_content
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": api_key, "content-type": "application/json", "accept": "application/json"}
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# Blogger - Blog Post
@app.route('/post_blog', methods=['POST'])
def post_blog():
    data = request.json
    content = data.get('content')
    title = data.get('title', 'New Post from AutoMarketer')
    blog_id = os.getenv('BLOGGER_BLOG_ID')  # Add to .env
    api_key = os.getenv('BLOGGER_API_KEY')

    if not content:
        return jsonify({'error': 'Missing content'}), 400

    payload = {
        "kind": "blogger#post",
        "title": title,
        "content": content
    }

    try:
        response = requests.post(
            f"https://www.googleapis.com/blogger/v3/blogs/{blog_id}/posts?key={api_key}",
            json=payload
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    else:
        return send_from_directory('static', 'index.html')

port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port, debug=True)