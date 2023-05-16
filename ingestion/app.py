import os, pinecone
from dotenv import load_dotenv
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Pinecone
from langchain.document_loaders import DirectoryLoader

# Load variables from .env file
load_dotenv()

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
PINECONE_INDEX_NAME = os.environ["PINECONE_INDEX_NAME"]
PINECONE_ENVIRONMENT = os.environ["PINECONE_ENVIRONMENT"]

# Target root files directory to for documents to load
loader = DirectoryLoader('./files', glob='*')

# Load documents
documents = loader.load()

# Split documents into chunks before creating embeddings
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100, length_function=len)

docs = text_splitter.split_documents(documents)

# Initialize OpenAIEmbeddings x
embeddings = OpenAIEmbeddings()

pinecone.init(
    api_key=PINECONE_API_KEY,
    environment=PINECONE_ENVIRONMENT
)

index_name = PINECONE_INDEX_NAME

Pinecone.from_documents(docs, embeddings, index_name=index_name)

print("Complete")