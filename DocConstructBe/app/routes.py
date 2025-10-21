import os
import tempfile
from data_model.enum import DocumentStatus
from flask import send_file, request
from flask_jwt_extended import jwt_required

from app.auth import AuthManager
from app.errors import ValidationError, InvalidProjectProfessionalDocument
from app.api import (
    ProjectManager,
    ProfessionalManager,
    ProjectDocumentManager,
    is_document_professional_missing,
    get_project_releated_types,
    save_file_to_temp,
    ProjectTeamManager
)
from app.response import SuccessResponse
from app.api_schema import API_ENDPOINTS, Endpoints
from data_model.enum import enum_to_value, ProjectDocumentType,ProjectTeamRole
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def validate_request(endpoint):
    """Validate request data against schema"""
    endpoint = API_ENDPOINTS.get(endpoint)
    if not endpoint:
        raise ValidationError(params={"unknown_endpoint": endpoint})

    if request.method != endpoint['method']:
        raise ValidationError(
            params={
                "invalid_method": request.method,
                "expected_method": endpoint['method']
            }
        )

    schema = endpoint['schema']()

    if request.is_json:
        data = request.get_json()
        print('JSON data:', data)
        if 'status_code' in data:
            del data['status_code']
    elif request.method in ['GET', 'DELETE']:
        data = request.args.to_dict()
        print('GET data:', data)
    else:
        data = request.form.to_dict()
        print('Form data:', data)
        print('Files:', request.files)
        if 'file' in request.files:
            data['file'] = request.files['file']

    errors = schema.validate(data)
    if errors:
        # Create a more detailed error message that includes the field names
        detailed_errors = {}
        for field, error_msgs in errors.items():
            if isinstance(error_msgs, list):
                detailed_errors[field] = f"Field '{field}': {', '.join(error_msgs)}"
            else:
                detailed_errors[field] = f"Field '{field}': {error_msgs}"
        
        raise ValidationError(params={"validation_errors": detailed_errors})

    return schema.load(data)


def init_routes(app):
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = validate_request(endpoint=Endpoints.REGISTER)
        access_token, refresh_token, user = AuthManager.register(
            email=data.get('email'),
            password=data.get('password'),
            name=data.get('name')
        )
        return SuccessResponse({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }).generate_response()

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = validate_request(endpoint=Endpoints.LOGIN)
        access_token, refresh_token, user = AuthManager.login(
            email=data.get('email'),
            password=data.get('password')
        )
        return SuccessResponse({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }).generate_response()

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        validate_request(endpoint=Endpoints.REFRESH)
        return AuthManager.refresh()

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        validate_request(endpoint=Endpoints.LOGOUT)
        return AuthManager.logout()

    @app.route('/api/projects', methods=['GET'])
    @jwt_required()
    def get_projects():
        validate_request(endpoint=Endpoints.GET_PROJECTS)
        projects = ProjectManager().get_all()
        return SuccessResponse({
            'projects': [{
                'id': project.id,
                'name': project.name,
                'request_number': project.request_number,
                'permit_number': project.permit_number,
                'status': project.status,
                'status_due_date': project.status_due_date.isoformat() if project.status_due_date else None,
                'is_expired': any(
                    ProfessionalManager.get_professional_status(prof.license_expiration_date).value == 'Expired'
                    for prof in ProjectManager.get_project_professionals(project.id)
                ),
                'is_warning': (not any(
                    ProfessionalManager.get_professional_status(prof.license_expiration_date).value == 'Expired'
                    for prof in ProjectManager.get_project_professionals(project.id)
                ) and any(
                    ProfessionalManager.get_professional_status(prof.license_expiration_date).value == 'Warning'
                    for prof in ProjectManager.get_project_professionals(project.id)
                )),
                'team_members': [{
                    'id': team.id,
                    'name': team.name,
                    'role': ProjectTeamRole.map_to_value(team.role).name,
                } for team in project.team_members],
            } for project in projects]
        }).generate_response()

    @app.route('/api/project', methods=['GET'])
    @jwt_required()
    def get_project():
        data = validate_request(endpoint=Endpoints.GET_PROJECT)
        project = ProjectManager().get_by_id(project_id=str(data.get('project_id')))
        team_members = ProjectTeamManager.get_all_by_project(str(data.get('project_id')))
        return SuccessResponse({
            'project': {
                'id': project.id,
                'name': project.name,
                'request_number': project.request_number,
                'status': enum_to_value(project.status),
                'description': project.description,
                'permit_number': project.permit_number,
                'construction_supervision_number': project.construction_supervision_number,
                'engineering_coordinator_number': project.engineering_coordinator_number,
                'firefighting_number': project.firefighting_number,
                'status_due_date': project.status_due_date.isoformat() if project.status_due_date else None,
                'professionals': [{
                    'id': prof.professional_id,
                    'name': prof.professional.name,
                    'email': prof.professional.email,
                    'professional_type': prof.professional.professional_type,
                    'status': prof.professional.status
                } for prof in project.professionals],
                'documents': [{
                    'id': doc.id,
                    'name': doc.name,
                    'document_type': doc.document_type,
                    'status': doc.status,
                    'created_at': doc.created_at.isoformat(),
                } for doc in project.documents],
                'team_members': [{
                    'id': str(team.id),
                    'project_id': str(team.project_id),
                    'name': team.name,
                    'address': team.address,
                    'phone': team.phone,
                    'email': team.email,
                    'signature_file_path': team.signature_file_path,
                    'role': team.role.value,
                    'created_at': team.created_at.isoformat() if team.created_at else None,
                    'updated_at': team.updated_at.isoformat() if team.updated_at else None,
                } for team in team_members],
            }
        }).generate_response()

    @app.route('/api/project', methods=['POST'])
    @jwt_required()
    def create_project():
        data = validate_request(endpoint=Endpoints.CREATE_PROJECT)
        project = ProjectManager().create(
            name=data.get('name'),
            request_number=data.get('request_number'),
            description=data.get('description'),
            status=data.get('status'),
            status_due_date=data.get('status_due_date'),
        )
        return SuccessResponse({'id': str(project.id)}).generate_response()

    @app.route('/api/project', methods=['PUT'])
    @jwt_required()
    def update_project():
        data = validate_request(endpoint=Endpoints.UPDATE_PROJECT)
        
        ProjectManager().update(
            project_id=str(data.get('id')),
            name=data.get('name'),
            request_number=data.get('request_number'),
            description=data.get('description'),
            status=data.get('status'),
            status_due_date=data.get('status_due_date'),
            permit_number=data.get('permit_number'),
            construction_supervision_number=data.get('construction_supervision_number'),
            engineering_coordinator_number=data.get('engineering_coordinator_number'),
            firefighting_number=data.get('firefighting_number'),
        )
        return SuccessResponse().generate_response()

    @app.route('/api/project', methods=['DELETE'])
    @jwt_required()
    def delete_project():
        data = validate_request(endpoint=Endpoints.DELETE_PROJECT)
        ProjectManager().delete(project_id=str(data.get('project_id')))
        return SuccessResponse().generate_response()

    @app.route('/api/project/statuses', methods=['GET'])
    @jwt_required()
    def get_project_statuses():
        validate_request(endpoint=Endpoints.GET_PROJECT_STATUSES)
        return SuccessResponse({
            'statuses': ProjectManager().get_statuses()
        }).generate_response()

    @app.route('/api/project/professionals', methods=['POST'])
    @jwt_required()
    def add_professional_to_project():
        data = validate_request(Endpoints.ADD_PROJECT_PROFESSIONAL)
        project_professional = ProjectManager().attach_professional(
            str(data.get('project_id')),
            str(data.get('professional_id'))
        )
        return SuccessResponse({
            'id': project_professional.id,
            'project_id': project_professional.project_id,
            'professional_id': project_professional.professional_id
        }).generate_response()

    @app.route('/api/project/professionals', methods=['DELETE'])
    @jwt_required()
    def remove_professional_from_project():
        data = validate_request(Endpoints.REMOVE_PROJECT_PROFESSIONAL)
        ProjectManager().detach_professional(
            str(data.get('project_id')),
            str(data.get('professional_id'))
        )
        return SuccessResponse().generate_response()

    @app.route('/api/project/document', methods=['GET'])
    @jwt_required()
    def download_project_document():
        data = validate_request(endpoint=Endpoints.DOWNLOAD_PROJECT_DOCUMENT)
        project_document = ProjectManager().get_document(
            project_id=str(data.get('project_id')),
            document_id=str(data.get('document_id'))
        )
        return send_file(
            project_document.file_path,
            as_attachment=True,
            download_name=project_document.name
        )

    @app.route('/api/project/document', methods=['POST'])
    @jwt_required()
    def upload_project_document():
        data = validate_request(endpoint=Endpoints.UPLOAD_PROJECT_DOCUMENT)
        project_id = str(data.get('project_id'))
        document_type = data.get('document_type')
        document_status = data.get('status')
        is_autofill = data.get('mode', 'auto') == 'auto'
        if document_type == ProjectDocumentType.GENERAL:
            is_autofill = False
        
        file_path = save_file_to_temp(data.get('file'))
        if is_autofill:
            is_missing,missing_members = is_document_professional_missing(project_id=project_id, document_type=document_type)
            if is_missing:
                _,project_required_members_values = get_project_releated_types(document_type=document_type)
                raise InvalidProjectProfessionalDocument(
                    required_professionals_types=', '.join(project_required_members_values)
                )
            project_professionals = ProjectManager.get_project_professionals(project_id=project_id)
            team_members = ProjectTeamManager.get_all_by_project(project_id=project_id)
            document_professionals = ProjectDocumentManager.get_document_professionals(document_type=document_type,professionals=project_professionals)
            filled_pdf = ProjectDocumentManager.autofill_document(
                document_type=document_type,
                professionals=document_professionals,
                src_pdf_path=file_path,
                team_members=team_members
            )
        else:
            filled_pdf = file_path
        
        project_document = ProjectManager().add_document(
            file_path=filled_pdf,
            project_id=project_id,
            document_type=document_type,
            document_name=data.get('document_name'),
            document_status=document_status
        )
        return SuccessResponse({
            'id': project_document.id,
            'project_id': project_document.project_id,
        }).generate_response()

    @app.route('/api/project/document', methods=['DELETE'])
    @jwt_required()
    def delete_project_document():
        data = validate_request(endpoint=Endpoints.REMOVE_PROJECT_DOCUMENT)
        ProjectManager().remove_document(
            project_id=str(data.get('project_id')),
            document_id=str(data.get('document_id')),
            status=data.get('status')
        )
        return SuccessResponse().generate_response()

    @app.route('/api/project/document', methods=['PUT'])
    @jwt_required()
    def update_project_document():
        data = validate_request(endpoint=Endpoints.UPDATE_PROJECT_DOCUMENT)
        project_id = str(data.get('project_id'))
        document_id = str(data.get('document_id'))
        document_type = data.get('document_type')
        
        # Get the existing document
        project_document = ProjectManager().get_document(project_id=project_id, document_id=document_id)
        if not project_document:
            raise Exception("Document not found")
        
        # Save the new file
        file_path = save_file_to_temp(data.get('file'))
        
        # Check if professionals are missing for auto-fill
        is_missing, missing_members = is_document_professional_missing(project_id=project_id, document_type=document_type)
        if is_missing:
            _, project_required_members_values = get_project_releated_types(document_type=document_type)
            raise InvalidProjectProfessionalDocument(
                required_professionals_types=', '.join(project_required_members_values)
            )
        
        # Get project data for auto-fill
        project_professionals = ProjectManager.get_project_professionals(project_id=project_id)
        team_members = ProjectTeamManager.get_all_by_project(project_id=project_id)
        document_professionals = ProjectDocumentManager.get_document_professionals(document_type=document_type, professionals=project_professionals)
        
        # Auto-fill the document
        filled_pdf = ProjectDocumentManager.autofill_document(
            document_type=document_type,
            professionals=document_professionals,
            src_pdf_path=file_path,
            team_members=team_members
        )
        
        # Update the document with the filled version
        ProjectManager().add_document(
            file_path=filled_pdf,
            project_id=project_id,
            document_type=document_type,
            document_name=project_document.name,
            document_status=DocumentStatus.FILLED.value
        )
        
        return SuccessResponse({
            'id': document_id,
            'project_id': project_id,
        }).generate_response()

    @app.route('/api/project/document/types', methods=['GET'])
    @jwt_required()
    def get_project_document_types():
        return SuccessResponse({
            'document_types': ProjectManager().get_document_types()
        }).generate_response()

    @app.route('/api/project/document/statuses', methods=['GET'])
    @jwt_required()
    def get_project_document_statuses():
        return SuccessResponse({
            'document_statuses': ProjectManager().get_document_statuses()
        }).generate_response()

    ### Professionals ###
    @app.route('/api/professionals', methods=['GET'])
    @jwt_required()
    def get_professionals():
        validate_request(endpoint=Endpoints.GET_PROFESSIONALS)
        professionals = ProfessionalManager.get_all()
        return SuccessResponse({
            'professionals': [{
                'id': prof.id,
                'name': prof.name,
                'email': prof.email,
                'professional_type': prof.professional_type,
                'status': prof.status,
                'license_expiration_date': prof.license_expiration_date.isoformat() if prof.license_expiration_date else None,
            } for prof in professionals]
        }).generate_response()

    @app.route('/api/professional', methods=['GET'])
    @jwt_required()
    def get_professional():
        data = validate_request(endpoint=Endpoints.GET_PROFESSIONAL)
        professional = ProfessionalManager.get_by_id(professional_id=str(data.get('professional_id')))
        return SuccessResponse({
            'professional': {
                'id': professional.id,
                'name': professional.name,
                'national_id': professional.national_id,
                'email': professional.email,
                'phone': professional.phone,
                'address': professional.address,
                'license_number': professional.license_number,
                'license_expiration_date': professional.license_expiration_date.isoformat(),
                'professional_type': professional.professional_type,
                'status': professional.status,
                'license_file_path': professional.license_file_path,
                'documents': [{
                    'id': doc.id,
                    'name': doc.name,
                    'document_type': doc.document_type,
                    'status': doc.status,
                    'created_at': doc.created_at.isoformat(),
                } for doc in professional.documents]
            }
        }).generate_response()

    @app.route('/api/professional', methods=['POST'])
    @jwt_required()
    def create_professional():
        data = validate_request(endpoint=Endpoints.CREATE_PROFESSIONAL)
        # Create the professional
        professional = ProfessionalManager.create(
            name=data.get('name'),
            national_id=data.get('national_id'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            license_number=data.get('license_number'),
            license_expiration_date=data.get('license_expiration_date'),
            professional_type=enum_to_value(data.get('professional_type')),
            license_file_path=data.get('license_file_path')
        )
        
        return SuccessResponse({'id': professional.id}).generate_response()

    @app.route('/api/professional/import', methods=['POST'])
    @jwt_required()
    def import_professional_data():
        logger.info(f"Importing professional data")
        data = validate_request(endpoint=Endpoints.IMPORT_PROFESSIONAL_FILE)
        logger.info(f"Data: {data}")
        file = data.get('file')
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)
        
        # Extract data from the license file
        # Note: license_file_path is included for backward compatibility
        # but license files are now handled as LICENSE document type
        logger.info(f"Extracting professional data from {temp_path}")
        license_data = ProfessionalManager().extract_professional_data(temp_path)
        logger.info(f"License data: {license_data}")
        return SuccessResponse(license_data).generate_response()

    @app.route('/api/professional', methods=['PUT'])
    @jwt_required()
    def update_professional():
        data = validate_request(endpoint=Endpoints.UPDATE_PROFESSIONAL)
        ProfessionalManager().update(
            professional_id=str(data.get('id')),
            name=data.get('name'),
            national_id=data.get('national_id'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            license_number=data.get('license_number'),
            license_expiration_date=data.get('license_expiration_date'),
            professional_type=enum_to_value(data.get('professional_type')),
        )
        return SuccessResponse().generate_response()

    @app.route('/api/professional', methods=['DELETE'])
    @jwt_required()
    def delete_professional():
        data = validate_request(endpoint=Endpoints.DELETE_PROFESSIONAL)
        ProfessionalManager().delete(professional_id=str(data.get('professional_id')))
        return SuccessResponse().generate_response()

    @app.route('/api/professional/types', methods=['GET'])
    @jwt_required()
    def get_professional_types():
        validate_request(endpoint=Endpoints.GET_PROFESSIONAL_TYPES)
        return SuccessResponse({'types': ProfessionalManager().get_types()}).generate_response()

    @app.route('/api/professional/statuses', methods=['GET'])
    @jwt_required()
    def get_professional_statuses():
        validate_request(endpoint=Endpoints.GET_PROFESSIONAL_STATUSES)
        return SuccessResponse({'statuses': ProfessionalManager().get_statuses()}).generate_response()

    @app.route('/api/professional/document', methods=['GET'])
    @jwt_required()
    def download_professional_document():
        data = validate_request(endpoint=Endpoints.DOWNLOAD_PROFESSIONAL_DOCUMENT)
        professional_document = ProfessionalManager().get_document(
            professional_id=str(data.get('professional_id')),
            document_id=str(data.get('document_id'))
        )
        return send_file(
            professional_document.file_path,
            as_attachment=True,
            download_name=professional_document.name
        )

    @app.route('/api/professional/document', methods=['POST'])
    @jwt_required()
    def add_professional_document():
        data = validate_request(endpoint=Endpoints.ADD_PROFESSIONAL_DOCUMENT)
        file_path = save_file_to_temp(data.get('file'))
        professional_document = ProfessionalManager().add_document(
            file_path=file_path,
            professional_id=str(data.get('professional_id')),
            document_type=enum_to_value(data.get('document_type')),
            document_name=data.get('document_name')
        )
        return SuccessResponse({
            'id': professional_document.id,
            'professional_id': professional_document.professional_id
        }).generate_response()

    @app.route('/api/professional/document', methods=['DELETE'])
    @jwt_required()
    def remove_professional_document():
        data = validate_request(endpoint=Endpoints.REMOVE_PROFESSIONAL_DOCUMENT)
        ProfessionalManager().remove_document(
            professional_id=str(data.get('professional_id')),
            document_id=str(data.get('document_id'))
        )
        return SuccessResponse().generate_response()

    @app.route('/api/professional/document/types', methods=['GET'])
    @jwt_required()
    def get_professional_document_types():
        validate_request(endpoint=Endpoints.GET_PROFESSIONAL_DOCUMENT_TYPES)
        return SuccessResponse({
            'document_types': ProfessionalManager().get_document_types()
        }).generate_response()

    # Project Team routes
    @app.route('/api/project/teams', methods=['GET'])
    @jwt_required()
    def get_project_teams():
        data = validate_request(endpoint=Endpoints.GET_PROJECT_TEAM)
        project_id = str(data.get('project_id'))
        teams = ProjectTeamManager.get_all_by_project(project_id)
        return SuccessResponse({
            'teams': [
                {
                    'id': str(team.id),
                    'project_id': str(team.project_id),
                    'name': team.name,
                    'address': team.address,
                    'phone': team.phone,
                    'email': team.email,
                    'signature_file_path': team.signature_file_path,
                    'created_at': team.created_at.isoformat() if team.created_at else None,
                    'updated_at': team.updated_at.isoformat() if team.updated_at else None,
                    'role': team.role.value,
                } for team in teams
            ]
        }).generate_response()

    @app.route('/api/project/teams', methods=['POST'])
    @jwt_required()
    def create_project_team():
        data = validate_request(endpoint=Endpoints.CREATE_PROJECT_TEAM)
        team = ProjectTeamManager.create(
            project_id=str(data.get('project_id')),
            name=data.get('name'),
            address=data.get('address'),
            phone=data.get('phone'),
            role=data.get('role'),
            email=data.get('email'),
            signature_file_path=data.get('signature_file_path'),
        )
        return SuccessResponse({'id': str(team.id)}).generate_response()

    @app.route('/api/project/teams', methods=['PUT'])
    @jwt_required()
    def update_project_team():
        data = validate_request(endpoint=Endpoints.UPDATE_PROJECT_TEAM)
        team = ProjectTeamManager.update(
            team_id=str(data.get('id')),
            name=data.get('name'),
            address=data.get('address'),
            phone=data.get('phone'),
            role=data.get('role'),
            email=data.get('email'),
            signature_file_path=data.get('signature_file_path'),
        )
        return SuccessResponse({'id': str(team.id)}).generate_response()

    @app.route('/api/project/teams', methods=['DELETE'])
    @jwt_required()
    def delete_project_team():
        data = validate_request(endpoint=Endpoints.DELETE_PROJECT_TEAM)
        ProjectTeamManager.delete(team_id=str(data.get('id')))
        return SuccessResponse().generate_response()

    @app.route('/api/project/team/roles', methods=['GET'])
    @jwt_required()
    def get_project_team_roles():
        from data_model.enum import ProjectTeamRole
        roles = [{
            'value': role.value,
            'name': role.name
        } for role in ProjectTeamRole]
        return SuccessResponse({'roles': roles}).generate_response()

def get_permit_owner_for_project(project_id):
    from data_model.models import ProjectTeamMember
    from data_model.enum import ProjectTeamRole
    from database.database import db_session
    return db_session.query(ProjectTeamMember).filter_by(
        project_id=project_id,
        role=ProjectTeamRole.PERMIT_OWNER.value
    ).first()