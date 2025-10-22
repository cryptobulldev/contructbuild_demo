from marshmallow import Schema, fields, validate
from data_model.enum import ProjectDocumentType, ProfessionalDocumentType, ProfessionalType, ProjectStatus, ProjectTeamRole
from app.auth_schema import LoginSchema, RegisterSchema, RefreshSchema, LogoutSchema

# Project Schemas


class ProjectGetAllSchema(Schema):
    pass


class ProjectGetByIdSchema(Schema):
    project_id = fields.UUID(required=True)


class ProjectCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))
    request_number = fields.Str(required=True)
    permit_number = fields.Str(required=False)
    construction_supervision_number = fields.Str(required=False)
    engineering_coordinator_number = fields.Str(required=False)
    firefighting_number = fields.Str(required=False)
    description = fields.Str(required=False)
    status = fields.Enum(ProjectStatus, by_value=True, required=False)
    status_due_date = fields.Date(required=False)
    docs_path = fields.Str(required=False)
    professionals = fields.List(fields.UUID(), required=False)


class ProjectUpdateSchema (Schema):
    id = fields.UUID(required=True)
    name = fields.Str(required=False, validate=validate.Length(min=1))
    request_number = fields.Str(required=False,allow_none=True)
    permit_number = fields.Str(required=False,allow_none=True)
    construction_supervision_number = fields.Str(required=False,allow_none=True)
    engineering_coordinator_number = fields.Str(required=False,allow_none=True)
    firefighting_number = fields.Str(required=False,allow_none=True)
    description = fields.Str(required=False,allow_none=True)
    status = fields.Enum(ProjectStatus, by_value=True, required=False)
    status_due_date = fields.Date(required=False, allow_none=True)
    docs_path = fields.Str(required=False,allow_none=True)


class ProjectDeleteSchema(Schema):
    project_id = fields.UUID(required=True)


class ProjectGetStatusesSchema(Schema):
    pass


class ProjectProfessionalAddSchema(Schema):
    project_id = fields.UUID(required=True)
    professional_id = fields.UUID(required=True)


class ProjectProfessionalRemoveSchema(Schema):
    project_id = fields.UUID(required=True)
    professional_id = fields.UUID(required=True)


class ProjectDocumentDownloadSchema(Schema):
    document_id = fields.UUID(required=True)
    project_id = fields.UUID(required=True)


class ProjectDocumentUploadSchema(Schema):
    project_id = fields.UUID(required=True)
    document_type = fields.Enum(ProjectDocumentType, by_value=True, required=False)
    document_name = fields.Str(required=True)
    status = fields.Str(required=True)
    mode = fields.Str(required=False, validate=validate.OneOf(['auto', 'manual']))

    file = fields.Raw(required=True)

class ProjectDocumentRemoveSchema(Schema):
    project_id = fields.UUID(required=True)
    document_id = fields.UUID(required=True)
    status = fields.Str(required=True)

class ProjectDocumentUpdateSchema(Schema):
    project_id = fields.UUID(required=True)
    document_id = fields.UUID(required=True)
    document_type = fields.Enum(ProjectDocumentType, by_value=True, required=True)
    file = fields.Raw(required=True)



class ProjectDocumentTypesSchema(Schema):
    pass


# Professional Schemas


class ProfessionalsGetSchema(Schema):
    pass


class ProfessionalGetSchema(Schema):
    professional_id = fields.UUID(required=True)


class ProfessionalCreateSchema(Schema):
    name = fields.Str(required=True)
    national_id = fields.Str(required=True)
    email = fields.Email(required=True)
    phone = fields.Str(required=True)
    address = fields.Str(required=True)
    license_number = fields.Str(required=True)
    license_expiration_date = fields.Date(required=True)
    professional_type = fields.Str(required=True)
    license_file_path = fields.Str(required=False)


class ProfessionalUpdateSchema(Schema):
    id = fields.UUID(required=True)
    name = fields.Str(required=False)
    national_id = fields.Str(required=False)
    email = fields.Email(required=False)
    phone = fields.Str(required=False)
    address = fields.Str(required=False)
    license_number = fields.Str(required=False)
    license_expiration_date = fields.Date(required=False)
    professional_type = fields.Enum(ProfessionalType, by_value=True, required=False)
    license_file_path = fields.Str(required=False)
    status = fields.Str(required=False)


class ProfessionalDeleteSchema(Schema):
    professional_id = fields.UUID(required=True)


class ProfessionalGetTypesSchema(Schema):
    pass


class ProfessionalGetStatusesSchema(Schema):
    pass


class ProfessionalDocumentDownloadSchema(Schema):
    document_id = fields.UUID(required=True)
    professional_id = fields.UUID(required=True)


class ProfessionalDocumentAddSchema(Schema):
    professional_id = fields.UUID(required=True)
    document_name = fields.Str(required=True)
    document_type = fields.Enum(ProfessionalDocumentType, by_value=True, required=True)
    file = fields.Raw(required=True)


class ProfessionalDocumentRemoveSchema(Schema):
    professional_id = fields.UUID(required=True)
    document_id = fields.UUID(required=True)


class ProfessionalDocumentTypesSchema(Schema):
    pass


class ProfessionalImportSchema(Schema):
    file = fields.Raw(required=True)


class ProjectTeamSchema(Schema):
    id = fields.UUID(required=True)
    project_id = fields.UUID(required=True)
    name = fields.Str(required=True)
    address = fields.Str(required=True)
    phone = fields.Str(required=True)
    email = fields.Str(required=False, allow_none=True)
    signature_file_path = fields.Str(required=False, allow_none=True)
    role = fields.Enum(ProjectTeamRole, by_value=True, required=True)
    created_at = fields.DateTime(required=True)
    updated_at = fields.DateTime(required=True)


class ProjectTeamCreateSchema(Schema):
    project_id = fields.UUID(required=True)
    name = fields.Str(required=True)
    address = fields.Str(required=True)
    phone = fields.Str(required=True)
    email = fields.Str(required=False, allow_none=True)
    signature_file_path = fields.Str(required=False, allow_none=True)
    role = fields.Enum(ProjectTeamRole, by_value=True, required=True)


class ProjectTeamUpdateSchema(Schema):
    id = fields.UUID(required=True)
    name = fields.Str(required=False)
    address = fields.Str(required=False)
    phone = fields.Str(required=False)
    email = fields.Str(required=False, allow_none=True)
    signature_file_path = fields.Str(required=False, allow_none=True)
    role = fields.Enum(ProjectTeamRole, by_value=True, required=False)


class ProjectTeamDeleteSchema(Schema):
    id = fields.UUID(required=True)


class ProjectTeamGetSchema(Schema):
    project_id = fields.UUID(required=True)


class Endpoints:
    # Auth endpoints
    LOGIN = "login"
    REGISTER = "register"
    REFRESH = "refresh"
    LOGOUT = "logout"
    
    GET_PROJECTS = "get_projects"
    GET_PROJECT = "get_project"
    CREATE_PROJECT = "create_project"
    UPDATE_PROJECT = "update_project"
    DELETE_PROJECT = "delete_project"
    GET_PROJECT_STATUSES = "get_project_statuses"

    ADD_PROJECT_PROFESSIONAL = "add_project_professional"
    REMOVE_PROJECT_PROFESSIONAL = "remove_project_professional"

    DOWNLOAD_PROJECT_DOCUMENT = "download_project_document"
    UPLOAD_PROJECT_DOCUMENT = "upload_project_document"
    REMOVE_PROJECT_DOCUMENT = "remove_project_document"
    UPDATE_PROJECT_DOCUMENT = "update_project_document"
    GET_PROJECT_DOCUMENT_TYPES = "get_project_document_types"

    GET_PROFESSIONALS = "get_professionals"
    GET_PROFESSIONAL = "get_professional"
    CREATE_PROFESSIONAL = "create_professional"
    IMPORT_PROFESSIONAL_FILE = "import_professional_file"
    UPDATE_PROFESSIONAL = "update_professional"
    DELETE_PROFESSIONAL = "delete_professional"
    GET_PROFESSIONAL_TYPES = "get_professional_types"
    GET_PROFESSIONAL_STATUSES = "get_professional_statuses"

    DOWNLOAD_PROFESSIONAL_DOCUMENT = "download_professional_document"
    ADD_PROFESSIONAL_DOCUMENT = "add_professional_document"
    REMOVE_PROFESSIONAL_DOCUMENT = "remove_professional_document"
    GET_PROFESSIONAL_DOCUMENT_TYPES = "get_professional_document_types"

    # Project Team Endpoints
    GET_PROJECT_TEAM = "get_project_team"
    CREATE_PROJECT_TEAM = "create_project_team"
    UPDATE_PROJECT_TEAM = "update_project_team"
    DELETE_PROJECT_TEAM = "delete_project_team"


API_ENDPOINTS = {
    Endpoints.LOGIN: {
        'method': 'POST',
        'schema': LoginSchema,
        'description': 'Login user'
    },
    Endpoints.REGISTER: {
        'method': 'POST',
        'schema': RegisterSchema,
        'description': 'Register new user'
    },
    Endpoints.REFRESH: {
        'method': 'POST',
        'schema': RefreshSchema,
        'description': 'Refresh access token'
    },
    Endpoints.LOGOUT: {
        'method': 'POST',
        'schema': LogoutSchema,
        'description': 'Logout user'
    },
    Endpoints.GET_PROJECTS: {
        'method': 'GET',
        'schema': ProjectGetAllSchema,
        'description': 'Get all projects'
    },
    Endpoints.GET_PROJECT: {
        'method': 'GET',
        'schema': ProjectGetByIdSchema,
        'description': 'Get project by ID'
    },
    Endpoints.CREATE_PROJECT: {
        'method': 'POST',
        'schema': ProjectCreateSchema,
        'description': 'Create a new project'
    },
    Endpoints.UPDATE_PROJECT: {
        'method': 'PUT',
        'schema': ProjectUpdateSchema,
        'description': 'Update an existing project'
    },
    Endpoints.DELETE_PROJECT: {
        'method': 'DELETE',
        'schema': ProjectDeleteSchema,
        'description': 'Delete a project'
    },
    Endpoints.GET_PROJECT_STATUSES: {
        'method': 'GET',
        'schema': ProjectGetStatusesSchema,
        'description': 'Get all project statuses'
    },
    Endpoints.ADD_PROJECT_PROFESSIONAL: {
        'method': 'POST',
        'schema': ProjectProfessionalAddSchema,
        'description': 'Add a professional to a project'
    },
    Endpoints.REMOVE_PROJECT_PROFESSIONAL: {
        'method': 'DELETE',
        'schema': ProjectProfessionalRemoveSchema,
        'description': 'Remove a professional from a project'
    },
    Endpoints.DOWNLOAD_PROJECT_DOCUMENT: {
        'method': 'GET',
        'schema': ProjectDocumentDownloadSchema,
        'description': 'Download a project document'
    },
    Endpoints.UPLOAD_PROJECT_DOCUMENT: {
        'method': 'POST',
        'schema': ProjectDocumentUploadSchema,
        'description': 'Upload a document for a project'
    },
    Endpoints.REMOVE_PROJECT_DOCUMENT: {
        'method': 'DELETE',
        'schema': ProjectDocumentRemoveSchema,
        'description': 'Remove a document from a project'
    },
    Endpoints.UPDATE_PROJECT_DOCUMENT: {
        'method': 'PUT',
        'schema': ProjectDocumentUpdateSchema,
        'description': 'Update an existing project document'
    },
    Endpoints.GET_PROJECT_DOCUMENT_TYPES: {
        'method': 'GET',
        # 'schema': ProjectDocumentTypesSchema,
        'description': 'Get all project document types'
    },
    Endpoints.GET_PROFESSIONALS: {
        'method': 'GET',
        'schema': ProfessionalsGetSchema,
        'description': 'Get all professionals'
    },
    Endpoints.GET_PROFESSIONAL: {
        'method': 'GET',
        'schema': ProfessionalGetSchema,
        'description': 'Get professional by ID'
    },
    Endpoints.CREATE_PROFESSIONAL: {
        'method': 'POST',
        'schema': ProfessionalCreateSchema,
        'description': 'Create a new professional'
    },
    Endpoints.IMPORT_PROFESSIONAL_FILE: {
        'method': 'POST',
        'schema': ProfessionalImportSchema,
        'description': 'Import professional data from file'
    },
    Endpoints.UPDATE_PROFESSIONAL: {
        'method': 'PUT',
        'schema': ProfessionalUpdateSchema,
        'description': 'Update an existing professional'
    },
    Endpoints.DELETE_PROFESSIONAL: {
        'method': 'DELETE',
        'schema': ProfessionalDeleteSchema,
        'description': 'Delete a professional'
    },
    Endpoints.GET_PROFESSIONAL_TYPES: {
        'method': 'GET',
        'schema': ProfessionalGetTypesSchema,
        'description': 'Get all professional types'
    },
    Endpoints.GET_PROFESSIONAL_STATUSES: {
        'method': 'GET',
        'schema': ProfessionalGetStatusesSchema,
        'description': 'Get all professional statuses'
    },
    Endpoints.DOWNLOAD_PROFESSIONAL_DOCUMENT: {
        'method': 'GET',
        'schema': ProfessionalDocumentDownloadSchema,
        'description': 'Download a professional document'
    },
    Endpoints.ADD_PROFESSIONAL_DOCUMENT: {
        'method': 'POST',
        'schema': ProfessionalDocumentAddSchema,
        'description': 'Add a document to a professional'
    },
    Endpoints.REMOVE_PROFESSIONAL_DOCUMENT: {
        'method': 'DELETE',
        'schema': ProfessionalDocumentRemoveSchema,
        'description': 'Remove a document from a professional'
    },
    Endpoints.GET_PROFESSIONAL_DOCUMENT_TYPES: {
        'method': 'GET',
        'schema': ProfessionalDocumentTypesSchema,
        'description': 'Get all professional document types'
    },
    Endpoints.GET_PROJECT_TEAM: {
        'method': 'GET',
        'schema': ProjectTeamGetSchema,
        'description': 'Get all project team members for a project'
    },
    Endpoints.CREATE_PROJECT_TEAM: {
        'method': 'POST',
        'schema': ProjectTeamCreateSchema,
        'description': 'Create a new project team member'
    },
    Endpoints.UPDATE_PROJECT_TEAM: {
        'method': 'PUT',
        'schema': ProjectTeamUpdateSchema,
        'description': 'Update a project team member'
    },
    Endpoints.DELETE_PROJECT_TEAM: {
        'method': 'DELETE',
        'schema': ProjectTeamDeleteSchema,
        'description': 'Delete a project team member'
    },
}
