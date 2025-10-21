import os
import yaml
import logging
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'd44046fb08d6fc89b1dd683a57af77cb0ec454c76253445d4d1017489a33ffc8')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
JWT_TOKEN_LOCATION = ['headers']
JWT_ACCESS_COOKIE_NAME = 'access_token_cookie'
JWT_REFRESH_COOKIE_NAME = 'refresh_token_cookie'
JWT_COOKIE_SECURE = os.getenv('ENVIRONMENT', 'development') == 'production'
JWT_COOKIE_CSRF_PROTECT = True
JWT_ACCESS_CSRF_HEADER_NAME = "X-CSRF-TOKEN"
JWT_CSRF_IN_COOKIES = True

# Set up base application path using environment variables with a default value
#APP_PATH = "/home/ubuntu/doc-construct/"
#APP_CODE = 'DocConstructBe'
APP_PATH = os.getenv('APP_PATH')
APP_CODE = '/app'

DOCUMENTS_FOLDER = os.path.join(APP_PATH, "documents")

CONFIG = os.path.join(APP_CODE, "config")
TTF_PATH = os.path.join(CONFIG, "Alef-Regular.ttf")

CONFIG_FALLBACK = os.path.join(CONFIG,"config.yaml")

PROF_DOC_CONFIG = os.path.join(CONFIG, "docs")

# Set up logging
logging.basicConfig(level=logging.INFO)

def get_host_path(container_path):
    if container_path.startswith(APP_PATH):
        relative_path = os.path.relpath(container_path, APP_PATH)
        return os.path.join("/home/ubuntu/docconstruct", relative_path)
    elif container_path.startswith(APP_CODE):
        relative_path = os.path.relpath(container_path, APP_CODE)
        return os.path.join("/home/ubuntu/DocConstructBe", relative_path)
    else:
        return "Unknown host path"

def get_config(config_file=CONFIG):
    script_dir = os.path.dirname(os.path.realpath(__file__))
    config_file = os.path.join(script_dir, config_file)
    if os.path.exists(CONFIG_FALLBACK):
        config_file = CONFIG_FALLBACK
    with open(config_file, 'r') as file:
        config = yaml.safe_load(file)
    return config
