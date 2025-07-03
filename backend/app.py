import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import google.generativeai as genai
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps

# SQLAlchemy imports for models
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

# Pydantic imports for schemas
from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_this_in_production')

# --- Add SQLAlchemy Engine Options for Connection Pooling ---
# These options help manage database connections more robustly,
# especially with cloud databases like Neon that might close idle connections.
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_recycle": 299, # Recycle connections after 299 seconds (less than Neon's typical 300s idle timeout)
    "pool_timeout": 30,  # Give up connecting after 30 seconds
    "pool_pre_ping": True # Test connections before use to ensure they are live
}

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

# --- Database Models (SQLAlchemy) ---
Base = declarative_base() # Re-declare Base here for consistency, though SQLAlchemy(app) might handle it

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(Integer, primary_key=True, index=True)
    email = db.Column(String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(String(255), nullable=False) # Renamed from hashed_password for consistency with existing code
    username = db.Column(String(80), nullable=True) # Max length 80
    profile_pic_url = db.Column(Text, nullable=True) # Changed to Text to accommodate long base64 strings
    timezone = db.Column(String(100), default="UTC+05:30 (Chennai)", nullable=True)
    is_approved = db.Column(Boolean, default=False, nullable=False)
    created_at = db.Column(DateTime, default=datetime.utcnow)

    # Establish a relationship with the Product model
    products = relationship("Product", back_populates="owner")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'profile_pic_url': self.profile_pic_url,
            'timezone': self.timezone,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Product(db.Model):
    __tablename__ = "products" # Changed from product_feature for clarity and consistency

    id = db.Column(Integer, primary_key=True, index=True)
    name = db.Column(String(255), index=True, nullable=False)
    discovery_document = db.Column(Text, nullable=True) # Use Text for potentially large documents
    is_archived = db.Column(Boolean, default=False)
    progress = db.Column(Integer, default=0)
    stage = db.Column(String(50), default="Research") # Increased string length for stage
    created_at = db.Column(DateTime, default=datetime.utcnow) # Changed from server_default=func.now() for consistency
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) # Changed for consistency

    # New: Foreign Key to link products to users
    user_id = db.Column(Integer, ForeignKey("users.id"), nullable=False) # Made nullable=False
    owner = relationship("User", back_populates="products")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'discovery_document': self.discovery_document,
            'is_archived': self.is_archived,
            'progress': self.progress,
            'stage': self.stage,
            'user_id': self.user_id, # Include user_id
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: Optional[str] = None
    profile_pic_url: Optional[str] = None
    timezone: Optional[str] = None
    is_approved: bool
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    profile_pic_url: Optional[str] = None
    timezone: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    discovery_document: Optional[str] = None
    is_archived: Optional[bool] = False
    progress: Optional[int] = 0
    stage: Optional[str] = "Research"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    name: Optional[str] = None
    progress: Optional[int] = None
    stage: Optional[str] = None
    is_archived: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AIDiscoveryDocumentRequest(BaseModel):
    product_name: str
    details: str
    product_id: int

class AIDiscoveryDocumentResponse(BaseModel):
    discovery_document: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: Optional[str] = None
    profile_pic_url: Optional[str] = None
    timezone: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


# --- IMPORTANT: Create database tables when the app is initialized by Gunicorn ---
with app.app_context():
    db.create_all()

# --- Teardown function to remove the session after each request ---
@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()

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
        'profile_pic_url': user.profile_pic_url,
        'timezone': user.timezone,
        'is_approved': user.is_approved,
        'exp': datetime.utcnow() + timedelta(hours=24) # Token expires in 24 hours
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        "message": "Login successful!",
        "token": token,
        "username": user.username,
        "profile_pic_url": user.profile_pic_url,
        "timezone": user.timezone
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


# --- API Routes for Product Management ---

@app.route('/api/products', methods=['GET'])
@token_required
def get_products(current_user):
    """Fetches all product features for the current user from the database, ordered by creation date."""
    products = Product.query.filter_by(user_id=current_user.id).order_by(Product.created_at.desc()).all()
    return jsonify([product.to_dict() for product in products])

@app.route('/api/products', methods=['POST'])
@token_required
def create_product(current_user):
    """Creates a new product feature for the current user in the database."""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Product name is required"}), 400

    new_product = Product(
        name=data['name'],
        discovery_document=data.get('discovery_document'),
        is_archived=data.get('is_archived', False),
        progress=data.get('progress', 0),
        stage=data.get('stage', 'Research'),
        user_id=current_user.id # Assign product to the current user
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify(new_product.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
@token_required
def get_product(current_user, product_id):
    """Fetches a single product feature by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first_or_404()
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@token_required
def update_product(current_user, product_id):
    """Updates an existing product feature by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first_or_404()
    data = request.json

    if 'name' in data:
        product.name = data['name']
    if 'discovery_document' in data:
        product.discovery_document = data['discovery_document']
    if 'is_archived' in data:
        product.is_archived = data['is_archived']
    if 'progress' in data:
        product.progress = data['progress']
    if 'stage' in data:
        product.stage = data['stage']

    db.session.commit()
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    """Deletes a product feature by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first_or_404()
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 204

@app.route('/api/generate-discovery-document', methods=['POST'])
@token_required
def generate_discovery_document(current_user):
    """
    Generates a product discovery document using Google Gemini Flash based on user input.
    Expects JSON with 'product_name', 'details', and 'product_id'.
    """
    data = request.json
    product_name = data.get('product_name')
    details = data.get('details')
    product_id = data.get('product_id') # Get product_id from request

    if not product_name or not details or product_id is None:
        return jsonify({"error": "Product name, details, and product_id are required"}), 400

    # Verify the product belongs to the current user
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or does not belong to the current user."}), 404

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