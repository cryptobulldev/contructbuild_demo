from flask import current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

from app.response import SuccessResponse
from data_model.models import User
from database.database import db_session
from app.errors import (
    UserAlreadyExists,
    ValidationError,
)

class AuthManager:
    @staticmethod
    def register(email: str, password: str, name: str) -> dict:
        """Register a new user"""
        existing_user = db_session.query(User).filter(User.email == email).first()
        if existing_user:
            raise UserAlreadyExists()

        hashed_password = generate_password_hash(password)
        user = User(
            email=email,
            password=hashed_password,
            name=name
        )
        
        db_session.add(user)
        db_session.commit()

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return access_token, refresh_token, user

    @staticmethod
    def login(email: str, password: str) -> dict:
        """Login user and return tokens"""
        user = db_session.query(User).filter(User.email == email).first()

        if not user or not check_password_hash(user.password, password):
            raise ValidationError(params={"login_error": "Invalid email or password"})

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return access_token, refresh_token, user

    @staticmethod
    def refresh() -> dict:
        """Refresh access token"""
        identity = get_jwt_identity()
        access_token = create_access_token(identity=identity)
        
        return SuccessResponse({
            'access_token': access_token
        }).generate_response()

    @staticmethod
    def logout() -> dict:
        """Logout user by blacklisting the current tokens"""
        jwt = get_jwt()
        jti = jwt["jti"]
        # Add current token's jti to the application's blacklist
        try:
            blacklist = current_app.token_blacklist
            blacklist.add(jti)
        except Exception:
            # If blacklist not available, ignore but warn
            pass

        return SuccessResponse({"message":"Successfully logged out"}).generate_response()