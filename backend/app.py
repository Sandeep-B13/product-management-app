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
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
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
    username = Column(String(80), nullable=True)
    timezone = Column(String(100), default="UTC+05:30 (Chennai)", nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="owner")
    interview_templates = relationship("InterviewTemplate", back_populates="user")
    assigned_tasks = relationship("Task", back_populates="assigned_user", foreign_keys='Task.assigned_to_user_id')
    product_accesses = relationship("ProductAccess", back_populates="user")
    # NEW: Reminders created by this user
    reminders = relationship("Reminder", back_populates="user")

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
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False) # Owner of the product
    
    # Core Product Details
    name = Column(String(255), nullable=False)
    status = Column(String(50), default='Active', nullable=False) # 'Active', 'Completed', 'Cancelled', 'On-Hold'
    is_archived = Column(Boolean, default=False, nullable=False)
    progress = Column(Integer, default=0, nullable=False) # Overall product progress
    
    # Iteration Relationship - ENHANCED
    parent_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    iteration_number = Column(Integer, default=1, nullable=False) # Track iteration sequence
    children = relationship("Product", backref=db.backref('parent', remote_side=[id]), cascade="all, delete-orphan")

    # Tab/Section Statuses (for progress calculation)
    research_status = Column(String(50), default='Not Started', nullable=False) # 'Not Started', 'In Progress', 'Completed', 'Skipped'
    prd_status = Column(String(50), default='Not Started', nullable=False)
    design_status = Column(String(50), default='Not Started', nullable=False)
    development_status = Column(String(50), default='Not Started', nullable=False)
    tech_doc_status = Column(String(50), default='Not Started', nullable=False)
    launch_training_status = Column(String(50), default='Not Started', nullable=False)

    # Content for each tab (Editor.js JSON will be stored as TEXT)
    research_document_json = Column(Text, nullable=True)
    prd_document_json = Column(Text, nullable=True)
    design_notes_json = Column(Text, nullable=True)
    dev_specs_json = Column(Text, nullable=True)
    tech_doc_json = Column(Text, nullable=True)
    launch_training_json = Column(Text, nullable=True)
    important_notes_json = Column(Text, nullable=True)
    
    # NEW: Additional content fields for missing tabs
    feedback_json = Column(Text, nullable=True)
    repo_links_json = Column(Text, nullable=True) # JSON array of links
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="products")
    customer_interviews = relationship("CustomerInterview", back_populates="product", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="product", cascade="all, delete-orphan")
    product_accesses = relationship("ProductAccess", back_populates="product", cascade="all, delete-orphan")
    # NEW: Reminders for this product
    reminders = relationship("Reminder", back_populates="product", cascade="all, delete-orphan")

    def get_iteration_context(self):
        """Get context from parent and sibling iterations for AI prompts"""
        context = {}
        if self.parent_id:
            parent = Product.query.get(self.parent_id)
            if parent:
                context['parent'] = {
                    'name': parent.name,
                    'research_document': parent.research_document_json,
                    'prd_document': parent.prd_document_json,
                    'design_notes': parent.design_notes_json,
                    'important_notes': parent.important_notes_json
                }
                # Get sibling iterations
                siblings = Product.query.filter_by(parent_id=self.parent_id).filter(Product.id != self.id).all()
                context['siblings'] = []
                for sibling in siblings:
                    context['siblings'].append({
                        'name': sibling.name,
                        'iteration_number': sibling.iteration_number,
                        'research_document': sibling.research_document_json,
                        'prd_document': sibling.prd_document_json,
                        'important_notes': sibling.important_notes_json
                    })
        return context

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'status': self.status,
            'is_archived': self.is_archived,
            'progress': self.progress,
            'parent_id': self.parent_id,
            'iteration_number': self.iteration_number,
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
            'feedback_json': self.feedback_json,
            'repo_links_json': self.repo_links_json,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'product_accesses': [pa.to_dict() for pa in self.product_accesses],
            # NEW: Include children iterations
            'children': [child.to_dict() for child in self.children] if self.children else [],
            'parent_name': self.parent.name if self.parent else None
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

class Task(db.Model):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey('users.id'), nullable=True) # Can be null if unassigned
    status = Column(String(50), default='To Do', nullable=False) # 'To Do', 'In Progress', 'Done', 'Blocked', 'Archived'
    priority = Column(String(50), default='Medium', nullable=False) # 'Low', 'Medium', 'High', 'Critical'
    due_date = Column(DateTime, nullable=True)
    # NEW: Enhanced task fields
    is_adhoc = Column(Boolean, default=True, nullable=False) # True for adhoc tasks, False for structured tasks
    task_type = Column(String(50), default='General', nullable=False) # 'General', 'Bug', 'Feature', 'Research', etc.
    estimated_hours = Column(Integer, nullable=True)
    actual_hours = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="tasks")
    assigned_user = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'title': self.title,
            'description': self.description,
            'assigned_to_user_id': self.assigned_to_user_id,
            'assigned_to_username': self.assigned_user.username if self.assigned_user else None,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'is_adhoc': self.is_adhoc,
            'task_type': self.task_type,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProductAccess(db.Model):
    __tablename__ = 'product_accesses'

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    role = Column(String(50), nullable=False) # 'owner', 'editor', 'viewer'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Ensure a user can only have one role per product
    __table_args__ = (UniqueConstraint('product_id', 'user_id', name='_product_user_uc'),)

    # Relationships
    product = relationship("Product", back_populates="product_accesses")
    user = relationship("User", back_populates="product_accesses")

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'user_email': self.user.email,
            'user_username': self.user.username,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# NEW: Reminder Model
class Reminder(db.Model):
    __tablename__ = 'reminders'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True) # Can be null for general reminders
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True) # Can be null for product-level reminders
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reminder_type = Column(String(50), default='General', nullable=False) # 'General', 'Task', 'Product', 'Meeting'
    reminder_date = Column(DateTime, nullable=False)
    is_acknowledged = Column(Boolean, default=False, nullable=False)
    is_snoozed = Column(Boolean, default=False, nullable=False)
    snooze_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reminders")
    product = relationship("Product", back_populates="reminders")
    task = relationship("Task")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'title': self.title,
            'description': self.description,
            'reminder_type': self.reminder_type,
            'reminder_date': self.reminder_date.isoformat() if self.reminder_date else None,
            'is_acknowledged': self.is_acknowledged,
            'is_snoozed': self.is_snoozed,
            'snooze_until': self.snooze_until.isoformat() if self.snooze_until else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- Pydantic Schemas (Enhanced) ---
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
    iteration_number: Optional[int] = 1
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
    feedback_json: Optional[str] = None
    repo_links_json: Optional[str] = None

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
    feedback_json: Optional[str] = None
    repo_links_json: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# NEW: Iteration Creation Schema
class IterationCreate(BaseModel):
    parent_id: int
    name: str
    description: Optional[str] = None

class ReminderBase(BaseModel):
    product_id: Optional[int] = None
    task_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    reminder_type: Optional[str] = 'General'
    reminder_date: datetime

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(ReminderBase):
    title: Optional[str] = None
    reminder_date: Optional[datetime] = None
    is_acknowledged: Optional[bool] = None
    is_snoozed: Optional[bool] = None
    snooze_until: Optional[datetime] = None

class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    product_name: Optional[str] = None
    task_title: Optional[str] = None
    is_acknowledged: bool
    is_snoozed: bool
    snooze_until: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Keep existing schemas for other models...
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

class TaskBase(BaseModel):
    product_id: int
    title: str
    description: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    status: Optional[str] = 'To Do'
    priority: Optional[str] = 'Medium'
    due_date: Optional[datetime] = None
    is_adhoc: Optional[bool] = True
    task_type: Optional[str] = 'General'
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    product_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    is_adhoc: Optional[bool] = None
    task_type: Optional[str] = None
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    product_name: Optional[str] = None
    assigned_to_username: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductAccessBase(BaseModel):
    product_id: int
    user_id: int
    role: str # 'owner', 'editor', 'viewer'

class ProductAccessCreate(ProductAccessBase):
    pass

class ProductAccessUpdate(ProductAccessBase):
    role: Optional[str] = None

class ProductAccessResponse(ProductAccessBase):
    id: int
    user_email: EmailStr
    user_username: Optional[str] = None
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

class AIPRDGenerationRequest(BaseModel):
    product_id: int
    research_data: str
    user_requirements: str
    prd_structure_confirmation: str

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

# --- Helper function to check product access ---
def check_product_access(user_id, product_id, required_role='viewer'):
    product = Product.query.get(product_id)
    if not product:
        return False, "Product not found"

    # Owners always have full access
    if product.user_id == user_id:
        return True, product

    # Check ProductAccess table
    access = ProductAccess.query.filter_by(product_id=product_id, user_id=user_id).first()
    if not access:
        return False, "Access denied: User does not have any role for this product"

    # Define role hierarchy
    role_hierarchy = {'viewer': 0, 'editor': 1, 'owner': 2}
    if role_hierarchy.get(access.role, -1) >= role_hierarchy.get(required_role, 0):
        return True, product
    
    return False, f"Access denied: User role '{access.role}' is insufficient for '{required_role}'"


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

@app.route('/api/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    """Fetches all registered users (for assigning tasks/collaboration)."""
    # In a real app, you might want to restrict this to admins or only return limited user info
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])


# --- API Routes for Product Management ---

@app.route('/api/products', methods=['GET'])
@token_required
def get_products(current_user):
    """Fetches all products for the current user, ordered by creation date, including those they have access to."""
    # Get products owned by the user
    owned_products = Product.query.filter_by(user_id=current_user.id).all()
    
    # Get products the user has access to via ProductAccess
    accessed_products_ids = [pa.product_id for pa in current_user.product_accesses]
    accessed_products = Product.query.filter(Product.id.in_(accessed_products_ids)).all()

    # Combine and remove duplicates (if a user owns and has access via ProductAccess)
    all_products = {p.id: p for p in owned_products}
    for p in accessed_products:
        all_products[p.id] = p
    
    sorted_products = sorted(all_products.values(), key=lambda p: p.created_at, reverse=True)

    return jsonify([product.to_dict() for product in sorted_products])

@app.route('/api/products', methods=['POST'])
@token_required
def create_product(current_user):
    """Creates a new product for the current user in the database."""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Product name is required"}), 400

    # Handle parent_id for iteration items
    parent_id = data.get('parent_id')
    iteration_number = 1
    
    if parent_id:
        # Check if parent product exists and current user has access to it (e.g., owner or editor)
        can_access_parent, msg = check_product_access(current_user.id, parent_id, required_role='editor')
        if not can_access_parent:
            return jsonify({"error": f"Parent product not found or {msg}"}), 404
        
        # Calculate next iteration number
        existing_iterations = Product.query.filter_by(parent_id=parent_id).all()
        if existing_iterations:
            iteration_number = max([p.iteration_number for p in existing_iterations]) + 1

    new_product = Product(
        user_id=current_user.id, # Owner is the creator
        name=data['name'],
        status=data.get('status', 'Active'),
        is_archived=data.get('is_archived', False),
        progress=data.get('progress', 0),
        parent_id=parent_id,
        iteration_number=iteration_number,
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
        important_notes_json=data.get('important_notes_json'),
        feedback_json=data.get('feedback_json'),
        repo_links_json=data.get('repo_links_json')
    )
    db.session.add(new_product)
    db.session.commit()

    # Automatically grant owner access to the creator in ProductAccess table
    owner_access = ProductAccess(product_id=new_product.id, user_id=current_user.id, role='owner')
    db.session.add(owner_access)
    db.session.commit()

    return jsonify(new_product.to_dict()), 201

# NEW: Create Iteration Endpoint
@app.route('/api/products/<int:product_id>/iterations', methods=['POST'])
@token_required
def create_iteration(current_user, product_id):
    """Creates a new iteration for a product."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    parent_product = product_or_msg
    data = request.json
    
    if not data or 'name' not in data:
        return jsonify({"error": "Iteration name is required"}), 400

    # Calculate next iteration number
    existing_iterations = Product.query.filter_by(parent_id=product_id).all()
    iteration_number = max([p.iteration_number for p in existing_iterations]) + 1 if existing_iterations else 1

    # Create iteration with context from parent
    iteration_name = data['name']
    if not iteration_name.startswith(f"{parent_product.name} - Iteration"):
        iteration_name = f"{parent_product.name} - Iteration {iteration_number}: {iteration_name}"

    new_iteration = Product(
        user_id=current_user.id,
        name=iteration_name,
        status='Active',
        parent_id=product_id,
        iteration_number=iteration_number,
        # Copy some context from parent if needed
        important_notes_json=data.get('description', f"Iteration {iteration_number} of {parent_product.name}")
    )
    
    db.session.add(new_iteration)
    db.session.commit()

    # Grant owner access to the creator
    owner_access = ProductAccess(product_id=new_iteration.id, user_id=current_user.id, role='owner')
    db.session.add(owner_access)
    db.session.commit()

    return jsonify(new_iteration.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
@token_required
def get_product(current_user, product_id):
    """Fetches a single product by ID for the current user, checking access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    return jsonify(product_or_msg.to_dict())

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@token_required
def update_product(current_user, product_id):
    """Updates an existing product by ID for the current user, checking editor access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg # If access is granted, product_or_msg is the product object
    data = request.json

    # Update fields from request data
    for field in [
        'name', 'status', 'is_archived', 'progress',
        'research_status', 'prd_status', 'design_status', 'development_status',
        'tech_doc_status', 'launch_training_status',
        'research_document_json', 'prd_document_json', 'design_notes_json',
        'dev_specs_json', 'tech_doc_json', 'launch_training_json', 'important_notes_json',
        'feedback_json', 'repo_links_json'
    ]:
        if field in data:
            setattr(product, field, data[field])

    # Handle parent_id update (only if explicitly provided and valid)
    if 'parent_id' in data:
        if data['parent_id'] is None:
            product.parent_id = None
        else:
            # Check access to the new parent product
            can_access_new_parent, msg = check_product_access(current_user.id, data['parent_id'], required_role='editor')
            if not can_access_new_parent:
                return jsonify({"error": f"Invalid parent_id or {msg}"}), 400
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
    """Deletes a product by ID for the current user, checking owner access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='owner')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 204

# --- AI Specific Endpoints (Enhanced with iteration context) ---

@app.route('/api/generate-research-document', methods=['POST'])
@token_required
def generate_research_document(current_user):
    """
    Generates a research document using Google Gemini Flash based on user input and updates the product.
    Enhanced with iteration context.
    """
    data = request.json
    product_id = data.get('product_id')
    prompt_text = data.get('prompt_text')
    scraped_data = data.get('scraped_data', '') # Optional: data from ScrapingBee

    if not product_id or not prompt_text:
        return jsonify({"error": "Product ID and prompt text are required"}), 400

    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg

    # Get iteration context if this is an iteration
    context = product.get_iteration_context()
    
    # Construct the prompt for Gemini with iteration context
    full_prompt = f"Based on the following idea: '{prompt_text}'"
    
    if context.get('parent'):
        full_prompt += f"\n\nThis is an iteration of the parent product '{context['parent']['name']}'. "
        full_prompt += f"Parent research: {context['parent']['research_document'] or 'No parent research available'}"
        
        if context.get('siblings'):
            full_prompt += f"\n\nPrevious iterations:"
            for sibling in context['siblings']:
                full_prompt += f"\n- {sibling['name']} (Iteration {sibling['iteration_number']}): {sibling['research_document'] or 'No research'}"
    
    if scraped_data:
        full_prompt += f"\n\nAlso consider this scraped market data: {scraped_data}"
    
    full_prompt += "\n\nGenerate a comprehensive market research document including analysis of similar features/functionalities in other software, competitor analysis (how they solve it, pricing, limitations), an ideal plan for the user, and how it differentiates from others. Structure it clearly."
    
    if context.get('parent'):
        full_prompt += " Consider the parent product context and previous iterations to build upon existing research."

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
    Enhanced with iteration context.
    """
    data = request.json
    product_id = data.get('product_id')
    user_requirements = data.get('user_requirements')
    prd_structure_confirmation = data.get('prd_structure_confirmation')

    if not product_id or not user_requirements or not prd_structure_confirmation:
        return jsonify({"error": "Product ID, user requirements, and PRD structure confirmation are required"}), 400

    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg

    # Use existing research document if available
    research_data = product.research_document_json if product.research_document_json else "No research document available."
    
    # Get iteration context
    context = product.get_iteration_context()

    # Construct the prompt for Gemini with iteration context
    full_prompt = (
        f"Generate a Product Requirements Document (PRD) based on the following research data:\n"
        f"{research_data}\n\n"
        f"User-specific requirements and additional details:\n"
        f"{user_requirements}\n\n"
        f"The user has confirmed the following PRD structure: {prd_structure_confirmation}\n\n"
    )
    
    if context.get('parent'):
        full_prompt += f"This is an iteration of the parent product '{context['parent']['name']}'. "
        full_prompt += f"Parent PRD: {context['parent']['prd_document'] or 'No parent PRD available'}\n\n"
        
        if context.get('siblings'):
            full_prompt += f"Previous iterations:\n"
            for sibling in context['siblings']:
                full_prompt += f"- {sibling['name']} (Iteration {sibling['iteration_number']}): {sibling['prd_document'] or 'No PRD'}\n"
            full_prompt += "\n"
    
    full_prompt += (
        f"Include sections like Problem Statement, Goals, Target Audience, Features (with text descriptions of sample wireframes if relevant), "
        f"Non-Functional Requirements, Success Metrics, and Future Considerations. Ensure the tone is professional and comprehensive."
    )
    
    if context.get('parent'):
        full_prompt += " Consider the parent product context and previous iterations to build upon existing PRDs and avoid duplication."

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

# --- API Routes for Customer Interviews (Keep existing) ---
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

    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg

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
    if not interview:
        return jsonify({"error": "Customer interview not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, interview.product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    return jsonify(interview.to_dict())

@app.route('/api/customer_interviews/<int:interview_id>', methods=['PUT'])
@token_required
def update_customer_interview(current_user, interview_id):
    interview = CustomerInterview.query.get(interview_id)
    if not interview:
        return jsonify({"error": "Customer interview not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, interview.product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

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
    if not interview:
        return jsonify({"error": "Customer interview not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, interview.product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    db.session.delete(interview)
    db.session.commit()
    return jsonify({"message": "Customer interview deleted"}), 204

@app.route('/api/customer_interviews/product/<int:product_id>', methods=['GET'])
@token_required
def get_interviews_for_product(current_user, product_id):
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
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
    if not interview:
        return jsonify({"error": "Customer interview not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, interview.product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

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

# --- API Routes for Interview Templates (Keep existing) ---
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


# --- API Routes for Tasks (Enhanced) ---

@app.route('/api/tasks', methods=['GET'])
@token_required
def get_all_tasks(current_user):
    """Get all tasks across all products the user has access to."""
    # Get all products the user has access to
    owned_products = Product.query.filter_by(user_id=current_user.id).all()
    accessed_products_ids = [pa.product_id for pa in current_user.product_accesses]
    accessed_products = Product.query.filter(Product.id.in_(accessed_products_ids)).all()
    
    all_products = {p.id: p for p in owned_products}
    for p in accessed_products:
        all_products[p.id] = p
    
    product_ids = list(all_products.keys())
    
    # Get all tasks from these products
    tasks = Task.query.filter(Task.product_id.in_(product_ids)).order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).all()
    
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks/my-day', methods=['GET'])
@token_required
def get_my_day_tasks(current_user):
    """Get tasks and reminders for today - My Day view."""
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)
    
    # Get all products the user has access to
    owned_products = Product.query.filter_by(user_id=current_user.id).all()
    accessed_products_ids = [pa.product_id for pa in current_user.product_accesses]
    accessed_products = Product.query.filter(Product.id.in_(accessed_products_ids)).all()
    
    all_products = {p.id: p for p in owned_products}
    for p in accessed_products:
        all_products[p.id] = p
    
    product_ids = list(all_products.keys())
    
    # Get tasks due today or overdue
    tasks_today = Task.query.filter(
        Task.product_id.in_(product_ids),
        Task.due_date <= tomorrow,
        Task.status.in_(['To Do', 'In Progress', 'Blocked'])
    ).order_by(Task.priority.desc(), Task.due_date.asc()).all()
    
    # Get reminders for today
    reminders_today = Reminder.query.filter(
        Reminder.user_id == current_user.id,
        Reminder.reminder_date <= tomorrow,
        Reminder.is_acknowledged == False
    ).order_by(Reminder.reminder_date.asc()).all()
    
    return jsonify({
        'tasks': [task.to_dict() for task in tasks_today],
        'reminders': [reminder.to_dict() for reminder in reminders_today]
    })

@app.route('/api/products/<int:product_id>/tasks', methods=['POST'])
@token_required
def create_task(current_user, product_id):
    """Creates a new task for a specific product, checking editor access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    data = request.json
    if not data or 'title' not in data:
        return jsonify({"error": "Task title is required"}), 400

    new_task = Task(
        product_id=product_id,
        title=data['title'],
        description=data.get('description'),
        assigned_to_user_id=data.get('assigned_to_user_id'),
        status=data.get('status', 'To Do'),
        priority=data.get('priority', 'Medium'),
        due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
        is_adhoc=data.get('is_adhoc', True),
        task_type=data.get('task_type', 'General'),
        estimated_hours=data.get('estimated_hours'),
        actual_hours=data.get('actual_hours')
    )
    db.session.add(new_task)
    db.session.commit()
    # Fetch task again to include assigned_user.username
    task_with_user = Task.query.get(new_task.id)
    return jsonify(task_with_user.to_dict()), 201

@app.route('/api/products/<int:product_id>/tasks', methods=['GET'])
@token_required
def get_tasks_for_product(current_user, product_id):
    """Fetches all tasks for a specific product, checking viewer access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    tasks = Task.query.filter_by(product_id=product_id).order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@token_required
def get_task(current_user, task_id):
    """Fetches a single task by ID, checking viewer access to its product."""
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, task.product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(current_user, task_id):
    """Updates an existing task by ID, checking editor access to its product."""
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, task.product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    data = request.json
    for field in ['title', 'description', 'assigned_to_user_id', 'status', 'priority', 'is_adhoc', 'task_type', 'estimated_hours', 'actual_hours']:
        if field in data:
            setattr(task, field, data[field])
    
    if 'due_date' in data and data['due_date'] is not None:
        try:
            task.due_date = datetime.fromisoformat(data['due_date'])
        except ValueError:
            return jsonify({"error": "Invalid date format for due_date. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400
    elif 'due_date' in data and data['due_date'] is None: # Allow clearing due date
        task.due_date = None

    db.session.commit()
    # Fetch task again to include assigned_user.username
    task_with_user = Task.query.get(task.id)
    return jsonify(task_with_user.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(current_user, task_id):
    """Deletes a task by ID, checking editor access to its product."""
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    can_access, product_or_msg = check_product_access(current_user.id, task.product_id, required_role='editor')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"}), 204

# --- NEW: API Routes for Reminders ---

@app.route('/api/reminders', methods=['GET'])
@token_required
def get_reminders(current_user):
    """Get all reminders for the current user."""
    reminders = Reminder.query.filter_by(user_id=current_user.id).order_by(Reminder.reminder_date.asc()).all()
    return jsonify([reminder.to_dict() for reminder in reminders])

@app.route('/api/reminders', methods=['POST'])
@token_required
def create_reminder(current_user):
    """Create a new reminder."""
    data = request.json
    if not data or 'title' not in data or 'reminder_date' not in data:
        return jsonify({"error": "Title and reminder date are required"}), 400

    # Validate product access if product_id is provided
    if data.get('product_id'):
        can_access, product_or_msg = check_product_access(current_user.id, data['product_id'], required_role='viewer')
        if not can_access:
            return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404

    try:
        reminder_date = datetime.fromisoformat(data['reminder_date'])
    except ValueError:
        return jsonify({"error": "Invalid date format for reminder_date. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400

    new_reminder = Reminder(
        user_id=current_user.id,
        product_id=data.get('product_id'),
        task_id=data.get('task_id'),
        title=data['title'],
        description=data.get('description'),
        reminder_type=data.get('reminder_type', 'General'),
        reminder_date=reminder_date
    )
    db.session.add(new_reminder)
    db.session.commit()
    return jsonify(new_reminder.to_dict()), 201

@app.route('/api/reminders/<int:reminder_id>', methods=['PUT'])
@token_required
def update_reminder(current_user, reminder_id):
    """Update a reminder."""
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=current_user.id).first()
    if not reminder:
        return jsonify({"error": "Reminder not found or unauthorized"}), 404

    data = request.json
    for field in ['title', 'description', 'reminder_type', 'is_acknowledged', 'is_snoozed']:
        if field in data:
            setattr(reminder, field, data[field])
    
    if 'reminder_date' in data and data['reminder_date'] is not None:
        try:
            reminder.reminder_date = datetime.fromisoformat(data['reminder_date'])
        except ValueError:
            return jsonify({"error": "Invalid date format for reminder_date. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400
    
    if 'snooze_until' in data and data['snooze_until'] is not None:
        try:
            reminder.snooze_until = datetime.fromisoformat(data['snooze_until'])
        except ValueError:
            return jsonify({"error": "Invalid date format for snooze_until. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400

    db.session.commit()
    return jsonify(reminder.to_dict())

@app.route('/api/reminders/<int:reminder_id>', methods=['DELETE'])
@token_required
def delete_reminder(current_user, reminder_id):
    """Delete a reminder."""
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=current_user.id).first()
    if not reminder:
        return jsonify({"error": "Reminder not found or unauthorized"}), 404
    
    db.session.delete(reminder)
    db.session.commit()
    return jsonify({"message": "Reminder deleted"}), 204

@app.route('/api/reminders/<int:reminder_id>/acknowledge', methods=['POST'])
@token_required
def acknowledge_reminder(current_user, reminder_id):
    """Acknowledge a reminder."""
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=current_user.id).first()
    if not reminder:
        return jsonify({"error": "Reminder not found or unauthorized"}), 404
    
    reminder.is_acknowledged = True
    reminder.is_snoozed = False
    reminder.snooze_until = None
    db.session.commit()
    return jsonify(reminder.to_dict())

@app.route('/api/reminders/<int:reminder_id>/snooze', methods=['POST'])
@token_required
def snooze_reminder(current_user, reminder_id):
    """Snooze a reminder."""
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=current_user.id).first()
    if not reminder:
        return jsonify({"error": "Reminder not found or unauthorized"}), 404
    
    data = request.json
    if not data or 'snooze_until' not in data:
        return jsonify({"error": "snooze_until date is required"}), 400
    
    try:
        snooze_until = datetime.fromisoformat(data['snooze_until'])
    except ValueError:
        return jsonify({"error": "Invalid date format for snooze_until. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}), 400
    
    reminder.is_snoozed = True
    reminder.snooze_until = snooze_until
    db.session.commit()
    return jsonify(reminder.to_dict())

# --- API Routes for Product Collaboration / Access Control (Keep existing) ---

@app.route('/api/products/<int:product_id>/access', methods=['GET'])
@token_required
def get_product_accesses(current_user, product_id):
    """Fetches all users with access to a product, checking viewer access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='viewer')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg
    accesses = ProductAccess.query.filter_by(product_id=product.id).all()
    return jsonify([pa.to_dict() for pa in accesses])

@app.route('/api/products/<int:product_id>/access', methods=['POST'])
@token_required
def invite_user_to_product(current_user, product_id):
    """Invites a user to a product (adds ProductAccess entry), checking owner access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='owner')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg
    data = request.json
    user_email = data.get('user_email')
    role = data.get('role')

    if not user_email or not role:
        return jsonify({"error": "User email and role are required"}), 400
    if role not in ['editor', 'viewer']: # Owner role is assigned automatically to creator
        return jsonify({"error": "Invalid role. Must be 'editor' or 'viewer'."}), 400

    target_user = User.query.filter_by(email=user_email).first()
    if not target_user:
        return jsonify({"error": "User with this email not found"}), 404
    
    if target_user.id == current_user.id:
        return jsonify({"error": "Cannot invite yourself to a product you own"}), 400

    existing_access = ProductAccess.query.filter_by(product_id=product.id, user_id=target_user.id).first()
    if existing_access:
        return jsonify({"message": f"User {user_email} already has '{existing_access.role}' access to this product."}), 409

    new_access = ProductAccess(product_id=product.id, user_id=target_user.id, role=role)
    db.session.add(new_access)
    db.session.commit()
    return jsonify(new_access.to_dict()), 201

@app.route('/api/products/<int:product_id>/access/<int:user_id>', methods=['PUT'])
@token_required
def update_user_product_role(current_user, product_id, user_id):
    """Updates a user's role for a product, checking owner access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='owner')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg
    data = request.json
    new_role = data.get('role')

    if not new_role:
        return jsonify({"error": "New role is required"}), 400
    if new_role not in ['editor', 'viewer', 'owner']:
        return jsonify({"error": "Invalid role. Must be 'owner', 'editor', or 'viewer'."}), 400

    if user_id == current_user.id:
        return jsonify({"error": "Cannot change your own role via this endpoint. You are the product owner."}), 400
    
    access = ProductAccess.query.filter_by(product_id=product.id, user_id=user_id).first()
    if not access:
        return jsonify({"error": "User does not have access to this product"}), 404
    
    access.role = new_role
    db.session.commit()
    return jsonify(access.to_dict())

@app.route('/api/products/<int:product_id>/access/<int:user_id>', methods=['DELETE'])
@token_required
def remove_user_from_product(current_user, product_id, user_id):
    """Removes a user's access from a product, checking owner access."""
    can_access, product_or_msg = check_product_access(current_user.id, product_id, required_role='owner')
    if not can_access:
        return jsonify({"error": product_or_msg}), 403 if "Access denied" in product_or_msg else 404
    
    product = product_or_msg

    if user_id == current_user.id:
        return jsonify({"error": "Cannot remove yourself as owner from a product. Transfer ownership first."}), 400

    access = ProductAccess.query.filter_by(product_id=product.id, user_id=user_id).first()
    if not access:
        return jsonify({"message": "User does not have access to this product"}), 404
    
    db.session.delete(access)
    db.session.commit()
    return jsonify({"message": "User access removed successfully"}), 204


if __name__ == '__main__':
    app.run(debug=True, port=5000)