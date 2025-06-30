from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(override=True) # Load environment variables from .env file

app = Flask(__name__)
CORS(app) # Enable CORS for all origins in development (will restrict for production later)

# Database Configuration (for Render/Neon.tech)
# For local development, it defaults to a local SQLite file.
# For deployment, it will use the DATABASE_URL environment variable set on Render.
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Suppresses a warning
db = SQLAlchemy(app)

# Configure Google Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found. AI features will not work.")
    # You might want to raise an error or halt execution here for production
else:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Database Model for Product/Feature ---
# This model will store the product/feature name and its generated discovery document.
class ProductFeature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    discovery_document = db.Column(db.Text) # To store the AI-generated document
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def to_dict(self):
        # Converts a ProductFeature object to a dictionary for JSON serialization
        return {
            'id': self.id,
            'name': self.name,
            'discovery_document': self.discovery_document,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- API Routes ---

@app.route('/')
def index():
    return "Product Management Backend is running!"

# Get all product/feature entries
@app.route('/api/products', methods=['GET'])
def get_products():
    products = ProductFeature.query.order_by(ProductFeature.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products])

# Create a new product/feature entry
@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Product name is required"}), 400

    new_product = ProductFeature(name=name)
    db.session.add(new_product)
    db.session.commit()
    return jsonify(new_product.to_dict()), 201

# Get details of a specific product/feature
@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = ProductFeature.query.get_or_404(product_id)
    return jsonify(product.to_dict())

# AI-powered route to generate the discovery document
@app.route('/api/products/<int:product_id>/generate-discovery', methods=['POST'])
def generate_discovery_document(product_id):
    product = ProductFeature.query.get_or_404(product_id)
    user_input = request.json.get('userInput', '') # Input from frontend chat/form

    if not GEMINI_API_KEY:
        return jsonify({"error": "AI API key not configured on the server."}), 500

    try:
        # Initialize the generative model
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Construct the prompt for the AI
        prompt = f"""
        You are an AI Product Manager assistant. Your goal is to help define a new product feature or product.
        The product/feature name is: "{product.name}".
        Here is some user input/details about the feature provided by the product manager: "{user_input}"

        Based on this information, generate a high-level Discovery Document.
        The document should include the following sections. Provide content for each section:
        1.  **Feature/Product Overview:** A brief description of the product or feature.
        2.  **Core Logic/Functionality:** How the product or feature is expected to work at a high level, step-by-step if applicable.
        3.  **High-Level Goals/Objectives:** What this product/feature aims to achieve (e.g., improve user engagement, solve a specific user problem, increase revenue, competitive advantage).
        4.  **Key Assumptions:** Any critical assumptions being made about users, market conditions, existing infrastructure, or technology.
        5.  **Out of Scope (for this MVP/initial phase):** Clearly list what this product/feature will *not* include in its initial release to manage expectations.
        6.  **Potential Success Metrics (How to measure success):** How we might measure the success of this product/feature (e.g., DAU, retention, conversion rate, usage of specific features, customer satisfaction scores).

        Format the output clearly using Markdown, with bold headings and bullet points where appropriate.
        Ensure the content is detailed enough to serve as a strong starting point for a product manager.
        """

        response = model.generate_content(prompt)
        discovery_doc_content = response.text

        # Update the product in the database with the generated document
        product.discovery_document = discovery_doc_content
        db.session.commit()

        return jsonify({"discovery_document": discovery_doc_content}), 200

    except Exception as e:
        # Log the full exception for debugging
        print(f"Error during AI generation: {e}")
        return jsonify({"error": f"Failed to generate discovery document: {str(e)} Please check your API key and input."}), 500

# This block ensures that `db.create_all()` is called only when `app.py` is executed directly.
# It creates tables based on the ProductFeature model if they don't exist.
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000) # Run on port 5000 for local development