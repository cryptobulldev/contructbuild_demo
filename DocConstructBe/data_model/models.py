from datetime import date, datetime, UTC
import re
from sqlalchemy import Column, String, Date, ForeignKey, UniqueConstraint, DateTime, Boolean, Enum as SqlEnum
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash

import enum
from app.errors import ValidationError
from database.base_model import Base
from database.database import engine
from database.database import UUID_F




class Project(Base):
    __tablename__ = 'projects'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    name = Column(String, nullable=False)
    request_number = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
    status_due_date = Column(Date, nullable=True)
    docs_path = Column(String, nullable=True)
    permit_number = Column(String, nullable=True)
    construction_supervision_number = Column(String, nullable=True)
    engineering_coordinator_number = Column(String, nullable=True)
    firefighting_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC), nullable=False)
    __table_args__ = (
        UniqueConstraint('request_number', name='uix_request_number'),
    )
    documents = relationship("ProjectDocument", backref="project", cascade="all,delete")
    professionals = relationship("ProjectProfessional", backref="project", cascade="all,delete")
    team_members = relationship("ProjectTeamMember", backref="project", cascade="all,delete")
    def __init__(self, name: str, request_number: str, permit_number: str=None,
                 construction_supervision_number: str=None, engineering_coordinator_number: str=None,
                 firefighting_number: str=None, docs_path: str = None, status: str = None,
                 status_due_date: date = None, description: str = None, **kwargs):
        if not name.strip():
            raise ValidationError(params={"validation_errors": {"name": "Project name cannot be empty"}})
        super().__init__(
           name=name.strip(),
           docs_path=docs_path.strip() if docs_path else None,
           status=status,
           status_due_date=status_due_date,
           request_number=request_number,
           permit_number=permit_number,
           construction_supervision_number=construction_supervision_number,
           engineering_coordinator_number=engineering_coordinator_number,
           firefighting_number=firefighting_number,
           description=description,
           **kwargs
        )
    def __repr__(self):
        return f"<Project(name='{self.name}', request_number='{self.request_number}', status='{self.status}')>"


class Professional(Base):
    __tablename__ = 'professionals'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    name = Column(String, nullable=False)
    national_id = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    license_number = Column(String, nullable=False)
    license_expiration_date = Column(Date, nullable=False)
    professional_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    license_file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC), nullable=False)

    documents = relationship("ProfessionalDocument", backref="professional", cascade="all,delete")
    projects = relationship("ProjectProfessional", backref="professional", cascade="all,delete")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self._validate_email(self.email):
            raise ValidationError(params={"validation_errors": {"email": "Email should be with @ and domain"}})
        if not self._validate_phone(self.phone):
            raise ValidationError(params={"validation_errors": {"phone": "Phone number must be 9 to 15 digits, optionally starting with a '+1'"}})
        if not self._validate_national_id(self.national_id):
            raise ValidationError(params={"validation_errors": {"national_id": "National ID must be 5 to 10 digits"}})

    @staticmethod
    def _validate_national_id(national_id):
        pattern = r'^\d{5,10}$'  # בדיקה בסיסית – רק ספרות באורך 5 עד 10
        return re.match(pattern, national_id) is not None

    @staticmethod
    def _validate_email(email):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def _validate_phone(phone):
        pattern = r'^\+?1?\d{9,15}$'
        return re.match(pattern, phone) is not None

    def __repr__(self):
        return f"<Professional(name='{self.name}', type='{self.professional_type}')>"


class ProjectProfessional(Base):
    __tablename__ = 'project_professionals'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    project_id = Column(UUID_F(), ForeignKey('projects.id'), nullable=False)
    professional_id = Column(UUID_F(), ForeignKey('professionals.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)

    __table_args__ = (
        UniqueConstraint('project_id', 'professional_id', name='uix_project_professional'),
    )

    def __repr__(self):
        return f"<ProjectProfessional(project_id='{self.project_id}', professional_id='{self.professional_id}')>"


class ProjectDocument(Base):
    __tablename__ = 'project_documents'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    project_id = Column(UUID_F(), ForeignKey('projects.id'), nullable=False)
    document_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)

    def __repr__(self):
        return f"<ProjectDocument(project_id='{self.project_id}', id='{self.id}'')>"


class ProfessionalDocument(Base):
    __tablename__ = 'professional_documents'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    professional_id = Column(UUID_F(), ForeignKey('professionals.id'), nullable=False)
    document_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)

    def __repr__(self):
        return f"<ProfessionalDocument(professional_id='{self.professional_id}', id='{self.id}'')>"


class ProjectTeamMember(Base):
    __tablename__ = 'project_team_members'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    signature_file_path = Column(String, nullable=True)
    # Allowed roles: 'permit_owner' (בעל ההיתר), 'request_editor' (עורך הבקשה), 'contractor_representative' (נציג הקבלן), 'project_manager' (מנהל הפרויקט), 'permit_owner_representative' (נציג בעל ההיתר)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC), nullable=False)
    project_id = Column(UUID_F(), ForeignKey('projects.id'), nullable=False)

    def __init__(self, project_id: str, name: str, address: str, phone: str, role: str, email: str = None, signature_file_path: str = None):
        super().__init__()
        self.project_id = project_id
        self.name = name
        self.address = address
        self.phone = phone
        self.role = role
        self.email = email
        self.signature_file_path = signature_file_path

    def __repr__(self):
        return f"<ProjectTeamMember(name='{self.name}', role='{self.role}', address='{self.address}', phone='{self.phone}', email='{self.email}')>"

class User(Base):
    __tablename__ = 'users'
    id = Column(UUID_F(), primary_key=True, default=UUID_F.uuid_allocator, unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(80), nullable=False)
    active = Column(Boolean(), default=True)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC), nullable=False)
    last_login = Column(DateTime, default=datetime.now(UTC), nullable=False)

    def __init__(self, email: str, password: str, name: str, active: bool = True):
        super().__init__()
        self.email = email
        self.password = password
        self.name = name

    def set_password(self, password: str) -> None:
        """Set user's password"""
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Check if provided password matches user's password"""
        return check_password_hash(self.password, password)

    def update_last_login(self) -> None:
        """Update user's last login timestamp"""
        self.last_login = datetime.now(UTC)
        db.session.commit()

    @classmethod
    def get_by_email(cls, email: str) -> 'User':
        """Get user by email"""
        return cls.query.filter_by(email=email).first()

    def to_dict(self) -> dict:
        """Convert user object to dictionary"""
        return {
            'id': str(self.id),
            'email': self.email,
            'name': self.name,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


def init_tables():
    Base.metadata.create_all(engine)
