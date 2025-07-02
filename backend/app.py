import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import google.generativeai as genai
from datetime import datetime, timedelta
import jwt # Import JWT library for token decoding and encoding

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Database Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- CORS Configuration ---
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://product-management-app-zeta.vercel.app"]}})

# --- JWT Configuration ---
# IMPORTANT: Use a strong, randomly generated secret key in production
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your_super_secret_jwt_key_here')
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_EXPIRATION_DAYS'] = 7 # Token valid for 7 days

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
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
]

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

# --- User Model for Authentication (Simplified) ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False) # In a real app, hash passwords!

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email
        }

# --- Helper to get user ID from token ---
def get_user_id_from_request():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        app.logger.warning("No Authorization header provided.")
        return None
    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = payload.get('user_id') # Assuming 'user_id' is stored in the token payload
        if not user_id:
            app.logger.warning("User ID not found in token payload.")
        return user_id
    except jwt.ExpiredSignatureError:
        app.logger.warning("JWT token has expired.")
        return None
    except jwt.InvalidTokenError as e:
        app.logger.warning(f"Invalid JWT token: {e}")
        return None
    except Exception as e:
        app.logger.error(f"Error processing Authorization header or decoding token: {e}")
        return None

# --- Database Model Definition ---
class ProductFeature(db.Model):
    __tablename__ = 'product_feature'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False) # Link to user account
    name = db.Column(db.String(255), nullable=False)
    discovery_document = db.Column(db.Text, nullable=True)
    is_archived = db.Column(db.Boolean, default=False) # New field for archiving
    progress = db.Column(db.Integer, default=0) # New field for progress (0-100)
    stage = db.Column(db.String(50), default='Research') # New field for Kanban stage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'discovery_document': self.discovery_document,
            'isArchived': self.is_archived, # Consistent naming with frontend
            'progress': self.progress,
            'stage': self.stage,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None, # Ensure 'Z' for UTC
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None # Ensure 'Z' for UTC
        }

# --- IMPORTANT: Create database tables when the app is initialized by Gunicorn ---
with app.app_context():
    db.create_all()

# --- Authentication Routes (Simplified for demonstration) ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password') # In a real app, hash this password!

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User with this email already exists"}), 409

    # For simplicity, password_hash is just the password. In production, use werkzeug.security.generate_password_hash
    new_user = User(email=email, password_hash=password) 
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully. Please log in."}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    # In a real app, use werkzeug.security.check_password_hash
    if user and user.password_hash == password: 
        # Generate JWT token
        expiration = datetime.utcnow() + timedelta(days=app.config['JWT_EXPIRATION_DAYS'])
        token_payload = {
            'user_id': user.id, # Use user.id as the user identifier in the token
            'email': user.email,
            'exp': expiration
        }
        token = jwt.encode(token_payload, app.config['JWT_SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])
        return jsonify({"message": "Login successful", "token": token}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

# --- API Routes ---

@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetches all product features for the current user, ordered by creation date."""
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    products = ProductFeature.query.filter_by(user_id=user_id).order_by(ProductFeature.created_at.desc()).all()
    return jsonify([product.to_dict() for product in products])

@app.route('/api/products', methods=['POST'])
def create_product():
    """Creates a new product feature for the current user in the database."""
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Product name is required"}), 400

    new_product = ProductFeature(
        user_id=user_id,
        name=data['name'],
        discovery_document=data.get('discovery_document'), # Can be provided on creation
        is_archived=data.get('isArchived', False),
        progress=data.get('progress', 0),
        stage=data.get('stage', 'Research')
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify(new_product.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Fetches a single product feature by ID for the current user."""
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    product = ProductFeature.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Updates an existing product feature by ID for the current user."""
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    product = ProductFeature.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    
    data = request.json

    if 'name' in data:
        product.name = data['name']
    if 'discovery_document' in data:
        product.discovery_document = data['discovery_document']
    if 'isArchived' in data:
        product.is_archived = data['isArchived'] # Update is_archived status
    if 'progress' in data:
        product.progress = data['progress']
    if 'stage' in data:
        product.stage = data['stage']

    db.session.commit()
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Deletes a product feature by ID for the current user."""
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    product = ProductFeature.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 204

@app.route('/api/generate-discovery-document', methods=['POST'])
def generate_discovery_document():
    """
    Generates a product discovery document using Google Gemini Pro based on user input.
    Expects JSON with 'product_name' and 'details'.
    """
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

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