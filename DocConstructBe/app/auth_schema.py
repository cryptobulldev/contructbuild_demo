from marshmallow import Schema, fields, validate

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    name = fields.Str(required=True)

class RefreshSchema(Schema):
    pass  # No fields needed as we'll get the refresh token from cookies/headers

class LogoutSchema(Schema):
    pass  # No fields needed