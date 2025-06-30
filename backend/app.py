import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import google.generativeai as genai
from datetime import datetime # Import datetime for timestamp fields

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Database Configuration ---
# Get the DATABASE_URL from environment variables.
# This will be set on Render. Locally, it comes from your .env file.
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Suppress a warning

db = SQLAlchemy(app)

# --- CORS Configuration ---
# Allow requests from your local React development server and the deployed Vercel frontend.
# Replace 'https://product-management-app-zeta.vercel.app' with your actual Vercel URL
# if it changes.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://product-management-app-zeta.vercel.app"]}})

# --- Google Gemini API Configuration ---
# Get the GEMINI_API_KEY from environment variables.
# This will be set on Render. Locally, it comes from your .env file.
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file or Render.")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the Gemini Pro model
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
    model_name="gemini-pro",
    generation_config=generation_config,
    safety_settings=safety_settings
)

# --- Database Model Definition ---
class ProductFeature(db.Model):
    __tablename__ = 'product_feature' # Explicitly set table name for clarity

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    discovery_document = db.Column(db.Text, nullable=True) # To store AI generated content
    created_at = db.Column(db.DateTime, default=datetime.utcnow) # Use datetime.utcnow for timezone-naive UTC
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        # Convert datetime objects to ISO format strings for JSON serialization
        return {
            'id': self.id,
            'name': self.name,
            'discovery_document': self.discovery_document,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- IMPORTANT: Create database tables when the app is initialized by Gunicorn ---
# This block will run when Gunicorn imports the `app` object.
# It will create tables if they don't exist.
with app.app_context():
    db.create_all()

# --- API Routes ---

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
    Generates a product discovery document using Google Gemini Pro based on user input.
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
        # Access the text from the response.candidates structure
        generated_text = response.candidates[0].content.parts[0].text
        return jsonify({"discovery_document": generated_text})
    except Exception as e:
        app.logger.error(f"Error generating discovery document: {e}")
        return jsonify({"error": "Failed to generate discovery document. Please try again later."}), 500

# This block only runs when you execute app.py directly (e.g., for local development)
if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run on port 5000 for local development