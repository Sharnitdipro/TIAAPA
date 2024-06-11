import openai
import fitz  # PyMuPDF
import dropbox
from flask import Flask, render_template, request, jsonify
import logging
from langchain_openai import OpenAIEmbeddings, OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import create_qa_with_sources_chain
from dotenv import load_dotenv
import os

app = Flask(__name__)

# Load environment variables from .env file
load_dotenv()

# Read API keys and tokens from environment variables
openai.api_key = os.getenv("")
dropbox_access_token = os.getenv("")

# Configure logging
logging.basicConfig(level=logging.DEBUG)

conversation_history = []

# Initialize Dropbox client
dbx = dropbox.Dropbox(dropbox_access_token)

def download_pdf_files_from_dropbox(dropbox_folder_path):
    pdf_contents = []
    try:
        for entry in dbx.files_list_folder(dropbox_folder_path).entries:
            if isinstance(entry, dropbox.files.FileMetadata) and entry.name.endswith('.pdf'):
                _, res = dbx.files_download(entry.path_lower)
                pdf_contents.append(res.content)
    except Exception as e:
        app.logger.error(f"Error downloading files from Dropbox: {e}")
    return pdf_contents

def extract_text_from_pdfs(pdf_contents):
    all_text = ""
    for pdf_content in pdf_contents:
        try:
            pdf_document = fitz.open("pdf", pdf_content)
            for page_num in range(pdf_document.page_count):
                page = pdf_document.load_page(page_num)
                all_text += page.get_text()
        except Exception as e:
            app.logger.error(f"Error extracting text from PDF: {e}")
    return all_text

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_response', methods=['POST'])
def get_response():
    user_input = request.json.get('user_input')
    app.logger.debug(f"Received user input: {user_input}")
    
    try:
        response = generate_response(user_input)
        app.logger.debug(f"Generated response: {response}")
        success = True
    except Exception as e:
        app.logger.error(f"Error generating response: {e}")
        response = "Sorry, I couldn't process your request at the moment."
        success = False
    
    conversation_history.append({'role': 'user', 'content': user_input})
    conversation_history.append({'role': 'assistant', 'content': response})
    
    return jsonify({'response': response, 'success': success})

def generate_response(prompt):
    dropbox_folder_path = 'home/Chatbot'  # Update with your Dropbox folder path
    pdf_contents = download_pdf_files_from_dropbox(dropbox_folder_path)
    pdf_text = extract_text_from_pdfs(pdf_contents)
    
    # Use LangChain to create a QA chain with the extracted PDF text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    texts = text_splitter.split_text(pdf_text)
    embeddings = OpenAIEmbeddings(openai_api_key=openai.api_key)
    vectorstore = FAISS.from_texts(texts, embeddings)
    qa_chain = create_qa_with_sources_chain(OpenAI(temperature=0.7, openai_api_key=openai.api_key), vectorstore)
    
    # Generate a response using the QA chain
    try:
        response = qa_chain.run(prompt)
    except Exception as e:
        app.logger.error(f"Error running QA chain: {e}")
        return "Sorry, I couldn't process your request at the moment."
    
    return response

if __name__ == '__main__':
    app.run(debug=True)
