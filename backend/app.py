import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import google.generativeai as genai
from datetime import datetime, timedelta # Import timedelta for JWT expiration
from werkzeug.security import generate_password_hash, check_password_hash # For password hashing
import jwt # For JSON Web Tokens
from functools import wraps # Import wraps for decorator

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Add a secret key for JWT signing. Generate a strong one!
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_this_in_production')

# --- CORS Configuration ---
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://product-management-app-zeta.vercel.app"]}})

# --- Google Gemini API Configuration ---
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file or Render.")
genai.configure(api_key=GEMINI_API_KEY)

generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

db = SQLAlchemy(app)

# --- Database Models ---

class User(db.Model):
    __tablename__ = 'users' # Table name for users

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(80), unique=False, nullable=True)
    profile_pic_url = db.Column(db.String(255), nullable=True) # New: Added profile picture URL column
    timezone = db.Column(db.String(100), nullable=True) # New: Added timezone column
    is_approved = db.Column(db.Boolean, default=False, nullable=False) # Approval status
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'profile_pic_url': self.profile_pic_url, # Include in dictionary representation
            'timezone': self.timezone, # Include in dictionary representation
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProductFeature(db.Model):
    __tablename__ = 'product_feature'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    discovery_document = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Add a user_id to link products to users (optional for now, but good for future)
    # user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # user = db.relationship('User', backref='product_features') # If you uncomment user_id

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'discovery_document': self.discovery_document,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- IMPORTANT: Create database tables when the app is initialized by Gunicorn ---
with app.app_context():
    db.create_all()

# --- Authentication Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# --- Authentication Endpoints ---

@app.route('/api/signup', methods=['POST'])
def signup():
    """Registers a new user. User is unapproved by default."""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')

    if not email or not password or not username:
        return jsonify({"message": "Email, password, and username are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered. Please log in or use a different email."}), 409

    new_user = User(email=email, username=username)
    new_user.set_password(password)
    # is_approved defaults to False as per requirements

    db.session.add(new_user)
    db.session.commit()

    # Placeholder for owner notification (no actual email sent)
    app.logger.info(f"New user signed up: {email}. Awaiting approval by app owner.")

    return jsonify({"message": "Sign up successful! Your account is awaiting approval by the app owner."}), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Logs in a user and provides a JWT if approved."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found. Please sign up first."}), 404

    if not user.check_password(password):
        return jsonify({"message": "Invalid credentials. Please check your email and password."}), 401

    if not user.is_approved:
        return jsonify({"message": "Your account is awaiting approval by the app owner. Please try again later."}), 403

    # If approved, generate JWT
    token_payload = {
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'profile_pic_url': user.profile_pic_url, # Include profile_pic_url in JWT payload
        'timezone': user.timezone, # Include timezone in JWT payload
        'is_approved': user.is_approved,
        'exp': datetime.utcnow() + timedelta(hours=24) # Token expires in 24 hours
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        "message": "Login successful!",
        "token": token,
        "username": user.username,
        "profile_pic_url": user.profile_pic_url, # Return profile_pic_url directly
        "timezone": user.timezone # Return timezone directly
    }), 200

@app.route('/api/admin/approve_user/<int:user_id>', methods=['POST'])
def approve_user(user_id):
    """
    Admin endpoint to approve a user.
    NOTE: This endpoint is NOT secured with authentication yet.
    In a real application, only an authenticated admin should access this.
    For now, it's a simple way for you to test the approval flow.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.is_approved:
        return jsonify({"message": f"User {user.email} is already approved."}), 200

    user.is_approved = True
    db.session.commit()
    app.logger.info(f"User {user.email} (ID: {user.id}) has been approved by app owner.")
    return jsonify({"message": f"User {user.email} has been approved."}), 200

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Fetches the authenticated user's profile information."""
    return jsonify(current_user.to_dict()), 200

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Updates the authenticated user's profile information."""
    data = request.json

    if 'username' in data:
        current_user.username = data['username']
    if 'profile_pic_url' in data:
        current_user.profile_pic_url = data['profile_pic_url']
    if 'timezone' in data:
        current_user.timezone = data['timezone']

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": current_user.to_dict()}), 200


# --- API Routes for Product Management (will be protected later) ---

@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetches all product features from the database, ordered by creation date."""
    products = ProductFeature.query.order_by(ProductFeature.created_at.desc()).all()
    return jsonify([product.to_dict() for product in products])

@app.route('/api/products', methods=['POST'])
def create_product():
    """Creates a new product feature in the database."""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Product name is required"}), 400

    new_product = ProductFeature(name=data['name'])
    db.session.add(new_product)
    db.session.commit()
    return jsonify(new_product.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Fetches a single product feature by ID."""
    product = ProductFeature.query.get_or_404(product_id)
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Updates an existing product feature by ID."""
    product = ProductFeature.query.get_or_404(product_id)
    data = request.json

    if 'name' in data:
        product.name = data['name']
    if 'discovery_document' in data:
        product.discovery_document = data['discovery_document']

    db.session.commit()
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Deletes a product feature by ID."""
    product = ProductFeature.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 204

@app.route('/api/generate-discovery-document', methods=['POST'])
def generate_discovery_document():
    """
    Generates a product discovery document using Google Gemini Flash based on user input.
    Expects JSON with 'product_name' and 'details'.
    """
    data = request.json
    product_name = data.get('product_name')
    details = data.get('details')

    if not product_name or not details:
        return jsonify({"error": "Product name and details are required"}), 400

    prompt_parts = [
        f"Generate a comprehensive product discovery document for a product/feature named '{product_name}' with the following details:\n\n{details}\n\nThe document should include sections like: 'Problem Statement', 'Proposed Solution', 'Target Audience', 'Key Features', 'Success Metrics', 'Potential Risks', and 'Future Considerations'. Ensure the tone is professional and concise."
    ]

    try:
        response = model.generate_content(prompt_parts)
        generated_text = response.candidates[0].content.parts[0].text
        return jsonify({"discovery_document": generated_text})
    except Exception as e:
        app.logger.error(f"Error generating discovery document: {e}")
        if hasattr(e, 'response') and e.response:
            app.logger.error(f"Gemini API error response: {e.response.text}")
            return jsonify({"error": f"Failed to generate discovery document: {e.response.text}"}), 500
        return jsonify({"error": "Failed to generate discovery document. Please try again later."}), 500

# This block only runs when you execute app.py directly (e.g., for local development)
if __name__ == '__main__':
    app.run(debug=True, port=5000)