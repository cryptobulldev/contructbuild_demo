import os
import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

# Ensure the DB engine uses an in-memory SQLite for tests to avoid touching external DB
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

from app import create_app
from app import auth as auth_module


@pytest.fixture
def app_instance():
    app = create_app()
    app.testing = True
    return app


@pytest.fixture
def client(app_instance):
    with app_instance.test_client() as client:
        yield client


def make_user(id='user-id', email='user@example.com', name='User'):
    return SimpleNamespace(id=id, email=email, name=name)


def test_register_endpoint_success(client):
    user = make_user()
    with patch('app.routes.AuthManager.register') as mock_register:
        mock_register.return_value = ('access-token-xyz', 'refresh-token-xyz', user)

        payload = {
            'email': user.email,
            'password': 'strongpassword',
            'name': user.name
        }
        resp = client.post('/api/auth/register', json=payload)

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['status_code'] == 'success'
        assert body['access_token'] == 'access-token-xyz'
        assert body['refresh_token'] == 'refresh-token-xyz'
        assert body['user']['email'] == user.email


def test_register_endpoint_validation_error_missing_field(client):
    # Missing 'name' should trigger validation error
    payload = {
        'email': 'a@b.com',
        'password': 'strongpassword'
    }
    resp = client.post('/api/auth/register', json=payload)
    assert resp.status_code == 400
    body = resp.get_json()
    # ErrorResponse sets additional info with 'error_code' key containing the specific error
    assert body.get('error_code') == 'validation_error'


def test_login_endpoint_success(client):
    user = make_user()
    with patch('app.routes.AuthManager.login') as mock_login:
        mock_login.return_value = ('access-1', 'refresh-1', user)

        payload = {
            'email': user.email,
            'password': 'strongpassword'
        }
        resp = client.post('/api/auth/login', json=payload)

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['status_code'] == 'success'
        assert body['access_token'] == 'access-1'
        assert body['refresh_token'] == 'refresh-1'
        assert body['user']['email'] == user.email


def test_login_endpoint_invalid_credentials(client):
    # Simulate AuthManager.login raising a ValidationError for bad creds
    from app.errors import ValidationError

    with patch('app.routes.AuthManager.login') as mock_login:
        mock_login.side_effect = ValidationError(params={'login_error': 'Invalid email or password'})

        payload = {
            'email': 'doesnotexist@example.com',
            'password': 'wrongpass'
        }
        resp = client.post('/api/auth/login', json=payload)
        assert resp.status_code == 400
        body = resp.get_json()
        assert body.get('error_code') == 'validation_error'


def test_authmanager_refresh_and_logout(app_instance):
    # Test AuthManager.refresh without invoking jwt_required decorator by calling the method directly
    with app_instance.app_context():
        # Patch get_jwt_identity and create_access_token
        with patch('app.auth.get_jwt_identity') as mock_get_jwt_identity, \
             patch('app.auth.create_access_token') as mock_create_access_token, \
             patch('app.auth.get_jwt') as mock_get_jwt:

            mock_get_jwt_identity.return_value = 'user-123'
            mock_create_access_token.return_value = 'new-access-token'
            # Call refresh
            resp = auth_module.AuthManager.refresh()
            assert resp.status_code == 200
            body = resp.get_json()
            assert body.get('access_token') == 'new-access-token'

            # Test logout: provide a fake jti via get_jwt
            mock_get_jwt.return_value = {'jti': 'jti-456'}
            # Ensure token_blacklist exists on app
            assert hasattr(app_instance, 'token_blacklist')
            assert 'jti-456' not in app_instance.token_blacklist

            resp2 = auth_module.AuthManager.logout()
            assert resp2.status_code == 200
            body2 = resp2.get_json()
            assert body2.get('status_code') == 'success'
            # jti should have been added to the blacklist
            assert 'jti-456' in app_instance.token_blacklist
