import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from config.sys_config import DOCUMENTS_FOLDER
from data_model.models import init_tables
from app.errors import handle_error
from flask_executor import Executor
from flask_jwt_extended import JWTManager
from config import sys_config



# Create executor instance at module level
executor = Executor()


def create_app():
    # global celery
    app = Flask(__name__)
    
    # Initialize executor with app
    executor.init_app(app)
    
    app.config.update(
        DOCUMENTS_FOLDER=DOCUMENTS_FOLDER,
        JWT_SECRET_KEY=sys_config.JWT_SECRET_KEY,
        JWT_TOKEN_LOCATION=sys_config.JWT_TOKEN_LOCATION,
        JWT_ACCESS_TOKEN_EXPIRES=sys_config.JWT_ACCESS_TOKEN_EXPIRES,
        JWT_REFRESH_TOKEN_EXPIRES=sys_config.JWT_REFRESH_TOKEN_EXPIRES,
        JWT_COOKIE_SECURE=sys_config.JWT_COOKIE_SECURE,
        JWT_COOKIE_CSRF_PROTECT=sys_config.JWT_COOKIE_CSRF_PROTECT,
        JWT_ACCESS_CSRF_HEADER_NAME=sys_config.JWT_ACCESS_CSRF_HEADER_NAME,
        JWT_CSRF_IN_COOKIES=sys_config.JWT_CSRF_IN_COOKIES,
    )
    # Initialize JWT
    jwt = JWTManager(app)

    # Simple in-memory blacklist for revoked tokens (replace with persistent store in production)
    token_blacklist = set()

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get('jti')
        return jti in token_blacklist

    # expose blacklist to app for AuthManager to use
    app.token_blacklist = token_blacklist

    init_tables()

    app.register_error_handler(code_or_exception=Exception, f=handle_error)

    with app.app_context():
        from .routes import init_routes
        init_routes(app)

        # Create necessary directories
        directories = [DOCUMENTS_FOLDER]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)


    return app
