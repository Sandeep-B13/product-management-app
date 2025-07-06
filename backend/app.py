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
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
# Ensure DATABASE_URL includes ?sslmode=require for Render PostgreSQL
db_url = os.environ.get('DATABASE_URL')
if db_url and "postgresql://" in db_url and not ("sslmode=" in db_url):
    # Append sslmode=require if not already present for PostgreSQL connections
    if "?" in db_url:
        db_url += "&sslmode=require"
    else:
        db_url += "?sslmode=require"

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_key_change_this_in_production')

# --- Add SQLAlchemy Engine Options for Connection Pooling ---
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

# --- Database Models ---

class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(80), nullable=True) # Added username
    timezone = Column(String(100), default="UTC+05:30 (Chennai)", nullable=True) # Added timezone
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships - backref for products is defined in Product model
    products = relationship("Product", back_populates="owner")
    interview_templates = relationship("InterviewTemplate", back_populates="user")
    # No direct relationship to tasks or reminders yet, will add in later phases

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'timezone': self.timezone,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    __tablename__ = 'products' # Renamed from product_feature

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Core Product Details
    name = Column(String(255), nullable=False)
    status = Column(String(50), default='Active', nullable=False) # 'Active', 'Completed', 'Cancelled', 'On-Hold'
    is_archived = Column(Boolean, default=False, nullable=False)
    progress = Column(Integer, default=0, nullable=False) # Overall product progress
    
    # Iteration Relationship
    parent_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    children = relationship("Product", backref=db.backref('parent', remote_side=[id]), cascade="all, delete-orphan")

    # Tab/Section Statuses (for progress calculation)
    research_status = Column(String(50), default='Not Started', nullable=False) # 'Not Started', 'In Progress', 'Completed', 'Skipped'
    prd_status = Column(String(50), default='Not Started', nullable=False)
    design_status = Column(String(50), default='Not Started', nullable=False)
    development_status = Column(String(50), default='Not Started', nullable=False)
    tech_doc_status = Column(String(50), default='Not Started', nullable=False)
    launch_training_status = Column(String(50), default='Not Started', nullable=False)

    # Content for each tab (Editor.js JSON will be stored as TEXT)
    research_document_json = Column(Text, nullable=True) # Renamed from discovery_document
    prd_document_json = Column(Text, nullable=True)
    design_notes_json = Column(Text, nullable=True)
    dev_specs_json = Column(Text, nullable=True)
    tech_doc_json = Column(Text, nullable=True)
    launch_training_json = Column(Text, nullable=True)
    important_notes_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="products")
    customer_interviews = relationship("CustomerInterview", back_populates="product", cascade="all, delete-orphan")
    # No direct relationship to tasks, design_links, repo_links, issues, tbd_items, launch_checklists, training_sessions, feedbacks yet, will add in later phases

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'status': self.status,
            'is_archived': self.is_archived,
            'progress': self.progress,
            'parent_id': self.parent_id,
            'research_status': self.research_status,
            'prd_status': self.prd_status,
            'design_status': self.design_status,
            'development_status': self.development_status,
            'tech_doc_status': self.tech_doc_status,
            'launch_training_status': self.launch_training_status,
            'research_document_json': self.research_document_json,
            'prd_document_json': self.prd_document_json,
            'design_notes_json': self.design_notes_json,
            'dev_specs_json': self.dev_specs_json,
            'tech_doc_json': self.tech_doc_json,
            'launch_training_json': self.launch_training_json,
            'important_notes_json': self.important_notes_json,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CustomerInterview(db.Model):
    __tablename__ = 'customer_interviews'

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=True)
    interview_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    interview_notes_json = Column(Text, nullable=True) # Editor.js JSON output
    ai_summary_json = Column(Text, nullable=True) # AI-generated summary of notes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="customer_interviews")

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'interview_notes_json': self.interview_notes_json,
            'ai_summary_json': self.ai_summary_json,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class InterviewTemplate(db.Model):
    __tablename__ = 'interview_templates'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    template_name = Column(String(255), nullable=False)
    template_questions_json = Column(Text, nullable=True) # Editor.js JSON output for questions
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="interview_templates")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'template_name': self.template_name,
            'template_questions_json': self.template_questions_json,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- Pydantic Schemas (Adjusted for new models and columns) ---
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
    timezone: Optional[str] = None
    is_approved: bool
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    timezone: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    status: Optional[str] = 'Active'
    is_archived: Optional[bool] = False
    progress: Optional[int] = 0
    parent_id: Optional[int] = None
    research_status: Optional[str] = 'Not Started'
    prd_status: Optional[str] = 'Not Started'
    design_status: Optional[str] = 'Not Started'
    development_status: Optional[str] = 'Not Started'
    tech_doc_status: Optional[str] = 'Not Started'
    launch_training_status: Optional[str] = 'Not Started'
    research_document_json: Optional[str] = None
    prd_document_json: Optional[str] = None
    design_notes_json: Optional[str] = None
    dev_specs_json: Optional[str] = None
    tech_doc_json: Optional[str] = None
    launch_training_json: Optional[str] = None
    important_notes_json: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    name: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None
    progress: Optional[int] = None
    research_status: Optional[str] = None
    prd_status: Optional[str] = None
    design_status: Optional[str] = None
    development_status: Optional[str] = None
    tech_doc_status: Optional[str] = None
    launch_training_status: Optional[str] = None
    research_document_json: Optional[str] = None
    prd_document_json: Optional[str] = None
    design_notes_json: Optional[str] = None
    dev_specs_json: Optional[str] = None
    tech_doc_json: Optional[str] = None
    launch_training_json: Optional[str] = None
    important_notes_json: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CustomerInterviewBase(BaseModel):
    product_id: int
    customer_name: str
    customer_email: Optional[EmailStr] = None
    interview_date: Optional[datetime] = None
    interview_notes_json: Optional[str] = None
    ai_summary_json: Optional[str] = None

class CustomerInterviewCreate(CustomerInterviewBase):
    pass

class CustomerInterviewUpdate(CustomerInterviewBase):
    product_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    interview_date: Optional[datetime] = None
    interview_notes_json: Optional[str] = None
    ai_summary_json: Optional[str] = None

class CustomerInterviewResponse(CustomerInterviewBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InterviewTemplateBase(BaseModel):
    template_name: str
    template_questions_json: Optional[str] = None

class InterviewTemplateCreate(InterviewTemplateBase):
    pass

class InterviewTemplateUpdate(InterviewTemplateBase):
    template_name: Optional[str] = None
    template_questions_json: Optional[str] = None

class InterviewTemplateResponse(InterviewTemplateBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AIDiscoveryDocumentRequest(BaseModel):
    product_name: str
    details: str
    product_id: int # To update the specific product's research_document_json

class AIDiscoveryDocumentResponse(BaseModel):
    discovery_document: str

class AIPRDGenerationRequest(BaseModel):
    product_id: int
    research_data: str # Input from research tab
    user_requirements: str # Additional user input for PRD
    prd_structure_confirmation: str # Confirmation from conversational AI

class AIPRDGenerationResponse(BaseModel):
    prd_document: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: Optional[str] = None
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
        'timezone': user.timezone,
        'is_approved': user.is_approved,
        'exp': datetime.utcnow() + timedelta(hours=24) # Token expires in 24 hours
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        "message": "Login successful!",
        "token": token,
        "username": user.username,
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
    if 'timezone' in data:
        current_user.timezone = data['timezone']

    try:
        db.session.commit()
        return jsonify({"message": "Profile updated successfully", "user": current_user.to_dict()}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error updating profile for user {current_user.id}: {e}")
        return jsonify({"message": "Failed to update profile due to a database error. Please try again."}), 500
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"An unexpected error occurred while updating profile for user {current_user.id}: {e}")
        return jsonify({"message": "An unexpected error occurred while updating profile. Please try again."}), 500


# --- API Routes for Product Management ---

@app.route('/api/products', methods=['GET'])
@token_required
def get_products(current_user):
    """Fetches all products for the current user, ordered by creation date."""
    products = Product.query.filter_by(user_id=current_user.id).order_by(Product.created_at.desc()).all()
    return jsonify([product.to_dict() for product in products])

@app.route('/api/products', methods=['POST'])
@token_required
def create_product(current_user):
    """Creates a new product for the current user in the database."""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Product name is required"}), 400

    # Handle parent_id for iteration items
    parent_id = data.get('parent_id')
    if parent_id:
        parent_product = Product.query.filter_by(id=parent_id, user_id=current_user.id).first()
        if not parent_product:
            return jsonify({"error": "Parent product not found or unauthorized"}), 404

    new_product = Product(
        user_id=current_user.id,
        name=data['name'],
        status=data.get('status', 'Active'),
        is_archived=data.get('is_archived', False),
        progress=data.get('progress', 0),
        parent_id=parent_id,
        research_status=data.get('research_status', 'Not Started'),
        prd_status=data.get('prd_status', 'Not Started'),
        design_status=data.get('design_status', 'Not Started'),
        development_status=data.get('development_status', 'Not Started'),
        tech_doc_status=data.get('tech_doc_status', 'Not Started'),
        launch_training_status=data.get('launch_training_status', 'Not Started'),
        research_document_json=data.get('research_document_json'),
        prd_document_json=data.get('prd_document_json'),
        design_notes_json=data.get('design_notes_json'),
        dev_specs_json=data.get('dev_specs_json'),
        tech_doc_json=data.get('tech_doc_json'),
        launch_training_json=data.get('launch_training_json'),
        important_notes_json=data.get('important_notes_json')
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify(new_product.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
@token_required
def get_product(current_user, product_id):
    """Fetches a single product by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@token_required
def update_product(current_user, product_id):
    """Updates an existing product by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    
    data = request.json

    # Update fields from request data
    for field in [
        'name', 'status', 'is_archived', 'progress',
        'research_status', 'prd_status', 'design_status', 'development_status',
        'tech_doc_status', 'launch_training_status',
        'research_document_json', 'prd_document_json', 'design_notes_json',
        'dev_specs_json', 'tech_doc_json', 'launch_training_json', 'important_notes_json'
    ]:
        if field in data:
            setattr(product, field, data[field])

    # Handle parent_id update (only if explicitly provided and valid)
    if 'parent_id' in data:
        if data['parent_id'] is None:
            product.parent_id = None
        else:
            parent_product = Product.query.filter_by(id=data['parent_id'], user_id=current_user.id).first()
            if not parent_product:
                return jsonify({"error": "Invalid parent_id or parent product not found"}), 400
            product.parent_id = data['parent_id']

    try:
        db.session.commit()
        return jsonify(product.to_dict())
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f"Database error updating product {product_id} for user {current_user.id}: {e}")
        return jsonify({"message": "Failed to update product due to a database error. Please try again."}), 500
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"An unexpected error occurred while updating product {product_id} for user {current_user.id}: {e}")
        return jsonify({"message": "An unexpected error occurred while updating product. Please try again."}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    """Deletes a product by ID for the current user."""
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 204

# --- AI Specific Endpoints ---

@app.route('/api/generate-research-document', methods=['POST'])
@token_required
def generate_research_document(current_user):
    """
    Generates a research document using Google Gemini Flash based on user input and updates the product.
    Expects JSON with 'product_id', 'prompt_text', and potentially 'scraped_data'.
    """
    data = request.json
    product_id = data.get('product_id')
    prompt_text = data.get('prompt_text')
    scraped_data = data.get('scraped_data', '') # Optional: data from ScrapingBee

    if not product_id or not prompt_text:
        return jsonify({"error": "Product ID and prompt text are required"}), 400

    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404

    # Construct the prompt for Gemini
    # For a conversational flow, you'd also pass chat history here
    full_prompt = f"Based on the following idea: '{prompt_text}'"
    if scraped_data:
        full_prompt += f"\n\nAlso consider this scraped market data: {scraped_data}"
    full_prompt += "\n\nGenerate a comprehensive market research document including analysis of similar features/functionalities in other software, competitor analysis (how they solve it, pricing, limitations), an ideal plan for the user, and how it differentiates from others. Structure it clearly."

    try:
        response = model.generate_content([full_prompt])
        generated_text = response.candidates[0].content.parts[0].text
        
        # Update the product's research_document_json
        product.research_document_json = generated_text
        product.research_status = 'Completed' # Mark research as completed upon generation
        db.session.commit()

        return jsonify({"research_document": generated_text, "message": "Research document generated and saved."})
    except Exception as e:
        db.session.rollback() # Rollback if Gemini call or DB commit fails
        app.logger.error(f"Error generating research document for product {product_id}: {e}")
        if hasattr(e, 'response') and e.response:
            app.logger.error(f"Gemini API error response: {e.response.text}")
            return jsonify({"error": f"Failed to generate research document: {e.response.text}"}), 500
        return jsonify({"error": "Failed to generate research document. Please try again later."}), 500

@app.route('/api/generate-prd-document', methods=['POST'])
@token_required
def generate_prd_document(current_user):
    """
    Generates a PRD document using Google Gemini Flash based on research data and user input.
    Expects JSON with 'product_id', 'user_requirements', 'prd_structure_confirmation'.
    """
    data = request.json
    product_id = data.get('product_id')
    user_requirements = data.get('user_requirements')
    prd_structure_confirmation = data.get('prd_structure_confirmation')

    if not product_id or not user_requirements or not prd_structure_confirmation:
        return jsonify({"error": "Product ID, user requirements, and PRD structure confirmation are required"}), 400

    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404

    # Use existing research document if available
    research_data = product.research_document_json if product.research_document_json else "No research document available."

    # Construct the prompt for Gemini
    full_prompt = (
        f"Generate a Product Requirements Document (PRD) based on the following research data:\n"
        f"{research_data}\n\n"
        f"User-specific requirements and additional details:\n"
        f"{user_requirements}\n\n"
        f"The user has confirmed the following PRD structure: {prd_structure_confirmation}\n\n"
        f"Include sections like Problem Statement, Goals, Target Audience, Features (with text descriptions of sample wireframes if relevant), Non-Functional Requirements, Success Metrics, and Future Considerations. Ensure the tone is professional and comprehensive."
    )

    try:
        response = model.generate_content([full_prompt])
        generated_text = response.candidates[0].content.parts[0].text
        
        # Update the product's prd_document_json
        product.prd_document_json = generated_text
        product.prd_status = 'Completed' # Mark PRD as completed upon generation
        db.session.commit()

        return jsonify({"prd_document": generated_text, "message": "PRD document generated and saved."})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error generating PRD document for product {product_id}: {e}")
        if hasattr(e, 'response') and e.response:
            app.logger.error(f"Gemini API error response: {e.response.text}")
            return jsonify({"error": f"Failed to generate PRD document: {e.response.text}"}), 500
        return jsonify({"error": "Failed to generate PRD document. Please try again later."}), 500

# --- API Routes for Customer Interviews ---
@app.route('/api/customer_interviews', methods=['POST'])
@token_required
def create_customer_interview(current_user):
    data = request.json
    product_id = data.get('product_id')
    customer_name = data.get('customer_name')
    customer_email = data.get('customer_email')
    interview_date_str = data.get('interview_date')

    if not product_id or not customer_name:
        return jsonify({"error": "Product ID and customer name are required"}), 400

    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404

    try:
        interview_date = datetime.fromisoformat(interview_date_str) if interview_date_str else datetime.utcnow()
    except ValueError:
        return jsonify({"error": "Invalid date format for interview_date. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400

    new_interview = CustomerInterview(
        product_id=product_id,
        customer_name=customer_name,
        customer_email=customer_email,
        interview_date=interview_date,
        interview_notes_json=data.get('interview_notes_json'),
        ai_summary_json=data.get('ai_summary_json')
    )
    db.session.add(new_interview)
    db.session.commit()
    return jsonify(new_interview.to_dict()), 201

@app.route('/api/customer_interviews/<int:interview_id>', methods=['GET'])
@token_required
def get_customer_interview(current_user, interview_id):
    interview = CustomerInterview.query.get(interview_id)
    if not interview or interview.product.user_id != current_user.id:
        return jsonify({"error": "Customer interview not found or unauthorized"}), 404
    return jsonify(interview.to_dict())

@app.route('/api/customer_interviews/<int:interview_id>', methods=['PUT'])
@token_required
def update_customer_interview(current_user, interview_id):
    interview = CustomerInterview.query.get(interview_id)
    if not interview or interview.product.user_id != current_user.id:
        return jsonify({"error": "Customer interview not found or unauthorized"}), 404
    
    data = request.json
    for field in ['customer_name', 'customer_email', 'interview_notes_json', 'ai_summary_json']:
        if field in data:
            setattr(interview, field, data[field])
    
    if 'interview_date' in data and data['interview_date'] is not None:
        try:
            interview.interview_date = datetime.fromisoformat(data['interview_date'])
        except ValueError:
            return jsonify({"error": "Invalid date format for interview_date. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400

    db.session.commit()
    return jsonify(interview.to_dict())

@app.route('/api/customer_interviews/<int:interview_id>', methods=['DELETE'])
@token_required
def delete_customer_interview(current_user, interview_id):
    interview = CustomerInterview.query.get(interview_id)
    if not interview or interview.product.user_id != current_user.id:
        return jsonify({"error": "Customer interview not found or unauthorized"}), 404
    db.session.delete(interview)
    db.session.commit()
    return jsonify({"message": "Customer interview deleted"}), 204

@app.route('/api/customer_interviews/product/<int:product_id>', methods=['GET'])
@token_required
def get_interviews_for_product(current_user, product_id):
    product = Product.query.filter_by(id=product_id, user_id=current_user.id).first()
    if not product:
        return jsonify({"error": "Product not found or unauthorized"}), 404
    
    interviews = CustomerInterview.query.filter_by(product_id=product_id).order_by(CustomerInterview.interview_date.desc()).all()
    return jsonify([interview.to_dict() for interview in interviews])

@app.route('/api/customer_interviews/generate_summary', methods=['POST'])
@token_required
def generate_interview_summary(current_user):
    data = request.json
    interview_id = data.get('interview_id')
    notes_content = data.get('notes_content')

    if not interview_id or not notes_content:
        return jsonify({"error": "Interview ID and notes content are required"}), 400

    interview = CustomerInterview.query.get(interview_id)
    if not interview or interview.product.user_id != current_user.id:
        return jsonify({"error": "Customer interview not found or unauthorized"}), 404

    prompt_parts = [
        f"Summarize the following customer interview notes, highlighting key insights, pain points, and feature requests:\n\n{notes_content}"
    ]

    try:
        response = model.generate_content(prompt_parts)
        generated_summary = response.candidates[0].content.parts[0].text
        
        interview.ai_summary_json = generated_summary
        db.session.commit()

        return jsonify({"ai_summary": generated_summary, "message": "Interview summary generated and saved."})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error generating interview summary for interview {interview_id}: {e}")
        if hasattr(e, 'response') and e.response:
            app.logger.error(f"Gemini API error response: {e.response.text}")
            return jsonify({"error": f"Failed to generate summary: {e.response.text}"}), 500
        return jsonify({"error": "Failed to generate summary. Please try again later."}), 500

# --- API Routes for Interview Templates ---
@app.route('/api/interview_templates', methods=['POST'])
@token_required
def create_interview_template(current_user):
    data = request.json
    template_name = data.get('template_name')
    template_questions_json = data.get('template_questions_json')

    if not template_name:
        return jsonify({"error": "Template name is required"}), 400

    new_template = InterviewTemplate(
        user_id=current_user.id,
        template_name=template_name,
        template_questions_json=template_questions_json
    )
    db.session.add(new_template)
    db.session.commit()
    return jsonify(new_template.to_dict()), 201

@app.route('/api/interview_templates/<int:template_id>', methods=['GET'])
@token_required
def get_interview_template(current_user, template_id):
    template = InterviewTemplate.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({"error": "Interview template not found or unauthorized"}), 404
    return jsonify(template.to_dict())

@app.route('/api/interview_templates', methods=['GET'])
@token_required
def get_all_interview_templates(current_user):
    templates = InterviewTemplate.query.filter_by(user_id=current_user.id).order_by(InterviewTemplate.created_at.desc()).all()
    return jsonify([template.to_dict() for template in templates])

@app.route('/api/interview_templates/<int:template_id>', methods=['PUT'])
@token_required
def update_interview_template(current_user, template_id):
    template = InterviewTemplate.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({"error": "Interview template not found or unauthorized"}), 404
    
    data = request.json
    if 'template_name' in data:
        template.template_name = data['template_name']
    if 'template_questions_json' in data:
        template.template_questions_json = data['template_questions_json']
    
    db.session.commit()
    return jsonify(template.to_dict())

@app.route('/api/interview_templates/<int:template_id>', methods=['DELETE'])
@token_required
def delete_interview_template(current_user, template_id):
    template = InterviewTemplate.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({"error": "Interview template not found or unauthorized"}), 404
    db.session.delete(template)
    db.session.commit()
    return jsonify({"message": "Interview template deleted"}), 204

@app.route('/api/interview_templates/generate_questions', methods=['POST'])
@token_required
def generate_interview_questions(current_user):
    data = request.json
    feature_idea = data.get('feature_idea')
    existing_questions = data.get('existing_questions', '')

    if not feature_idea:
        return jsonify({"error": "Feature idea is required to generate interview questions."}), 400

    prompt_parts = [
        f"Generate a set of customer interview questions and a suggested interview flow for a product/feature with the following idea: '{feature_idea}'. "
        f"If there are existing questions, incorporate them or build upon them: '{existing_questions}'. "
        f"Structure the output clearly with questions and flow steps."
    ]

    try:
        response = model.generate_content(prompt_parts)
        generated_questions = response.candidates[0].content.parts[0].text
        return jsonify({"generated_questions": generated_questions, "message": "Interview questions generated."})
    except Exception as e:
        app.logger.error(f"Error generating interview questions: {e}")
        if hasattr(e, 'response') and e.response:
            app.logger.error(f"Gemini API error response: {e.response.text}")
            return jsonify({"error": f"Failed to generate questions: {e.response.text}"}), 500
        return jsonify({"error": "Failed to generate questions. Please try again later."}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)