import React, {useEffect, useRef, useState} from "react";
import {useRouter} from "next/router";
import Link from "next/link";
import {
  Button,
  Field,
  FormGrid,
  FullWidthField,
  IconButton,
  Input,
  Label,
  PageContainer,
  PageContent,
  Select,
  TextArea,
  TopPanel,
  TopPanelGroup,
  TopPanelLogo,
  TopPanelTitle,
  TopPanelTitleHolder
} from "../../styles/SharedStyles";
import {Professional, Project, ProjectDocument, DocumentState} from "../../types";
import {
  getProjectById,
  getProjectStatuses,
  updateProject,
  removeProfessionalFromProject,
  uploadProjectDocument,
  downloadProjectDocument,
  deleteProjectDocument,
  getProjectDocumentTypes,
  getProjectTeamRoles,
  getProjectTeamMembers,
  createProjectTeamMember,
  updateProjectTeamMember,
  deleteProjectTeamMember,
  autoFillDocument
} from "../../api";
import {errorHandler, ErrorResponseData} from "../shared/ErrorHandler";
import * as FaIcons from "react-icons/fa";
import EmptyStatePlaceholder from "../shared/EmptyState";
import useDeleteProject from "./useDeleteProject";
import DeletionDialog from "../shared/DeletionDialog";
import {toast} from "react-toastify";
import FileArea, {FileAreaDocument, FilePreview} from "../shared/FileArea";
import styled from "styled-components";
import ProjectProfessionalDialog from "./ProjectProfessionalDialog";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ status }) =>
    status === 'Active' ? '#e3f6ec' :
    status === 'Expired' ? '#ffecef' :
    status === 'Warning' ? '#fff7e0' :
    '#ffecef'};
  color: ${({ status }) =>
    status === 'Active' ? '#1d8450' :
    status === 'Expired' ? '#e1273d' :
    status === 'Warning' ? '#b0851f' :
    '#e1273d'};
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 180px 0.8fr 400px;
  grid-template-rows: auto;
  grid-template-areas: "sidebar project documents";
  gap: 16px;
  width: 100%;
  overflow: hidden;
`;

const SecondSidebar = styled.div`
  grid-area: sidebar;
  width: 180px;
  display: flex;
  flex-direction: column;
  direction: rtl;
`;

const SecondSidebarContent = styled.div`
  margin-top: 60px;
  padding: 0;
`;

const SidebarButton = styled.button<{ active: boolean }>`
  width: 100%;
  background: transparent;
  border: none;
  height: 50px;
  display: flex;
  align-items: center;
  padding: 12px 15px;
  font-size: 16px;
  font-weight: ${p => p.active ? '600' : '400'};
  color: #51789f;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  text-align: right;
  
  &:hover {
    background-color: rgb(227, 237, 246);
  }
`;

const ProjectPanel = styled.div`
  grid-area: project;
  padding: 0 0px;
  overflow: hidden;
`;

const DocumentsPanel = styled.div`
  grid-area: documents;
  width: 540px;
  padding: 0 12px;
  border-right: 1px solid #eaeaea;
  overflow: hidden;
`;



const Card = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  padding: 16px;
  margin-bottom: 16px;
`;

const CompactFormGrid = styled(FormGrid)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const CompactField = styled(Field)`
  margin-bottom: 8px;
`;

const CompactLabel = styled(Label)`
  margin-bottom: 4px;
  font-size: 14px;
`;

const CompactButton = styled(Button)`
  padding: 6px 12px;
  font-size: 13px;
  height: auto;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #4b87c3;

  &:hover {
    background-color: #4b87c3;
  }
`;

const IconOnlyButton = styled(IconButton)`
  width: 30px;
  height: 30px;
  font-size: 14px;
`;

const ProfessionalCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  padding: 10px 12px;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 230px;
  
  &:hover {
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  }
`;

const ProfessionalInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ProfessionalName = styled.a`
  color: #0071e3;
  text-decoration: none;
  font-weight: 500;
  font-size: 13px;
`;

const ProfessionalType = styled.span`
  font-size: 12px;
  color: #666;
`;

const ProjectView: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  if (!id) {
    return (
      <PageContainer />
    );
  }

  const {isDeleteDialogOpen, handleDelete, handleConfirmDelete, handleCancelDelete, isDeleting} = useDeleteProject(id);

  const [formData, setFormData] = useState<Project | null>(null);
  const originalData = useRef<Project | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);

  // Professionals state
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [showAddProfessionalDialog, setShowAddProfessionalDialog] = useState(false);
  const [professionalToRemove, setProfessionalToRemove] = useState<Professional | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [autoFillingDocId, setAutoFillingDocId] = useState<string | null>(null);

  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  // Add tab state
  const [activeTab, setActiveTab] = useState<'details' | 'professionals' | 'team'>('details');
  const [teamRoles, setTeamRoles] = useState<{ key: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [teamExpanded, setTeamExpanded] = useState<Record<string, boolean>>({});
  const [teamData, setTeamData] = useState<Record<string, { name: string; phone: string; email: string; address: string }>>({});

  // In the DocumentsPanel, add tab state and tab buttons for document sections
  const [activeDocTab, setActiveDocTab] = useState<'categorized' | 'general'>('categorized');

  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [isEditingTeam, setIsEditingTeam] = useState(false);

  const loadData = async () => {
    try {
      const [proj, statuses, docTypes] = await Promise.all([
        getProjectById(id),
        getProjectStatuses(),
        getProjectDocumentTypes()
      ]);
      setFormData(proj);
      originalData.current = proj;
      setStatuses(statuses);
      setDocumentTypes([...docTypes]); 

      // Extract professionals data directly from the project
      setIsLoadingProfessionals(true);
      try {
        if (proj.professionals && Array.isArray(proj.professionals)) {
          // Map the professionals data to the Professional type
          const projectProfessionals = proj.professionals.map(prof => ({
            id: prof.id,
            name: prof.name,
            email: prof.email,
            professional_type: prof.professional_type,
            status: prof.status,
            // Add default values for required fields that might not be in the API response
            national_id: '',
            phone: '',
            license_number: '',
            license_expiration_date: '',
            address: ''
          }));
          setProfessionals(projectProfessionals);
        } else {
          setProfessionals([]);
        }
      } catch (error) {
        errorHandler(error as ErrorResponseData, 'Failed to load professionals');
        setProfessionals([]);
      } finally {
    setIsLoadingProfessionals(false);
      }

      // Load project documents
      setIsLoadingDocuments(true);
      try {
        if (proj.documents && Array.isArray(proj.documents)) {
          setDocuments(proj.documents);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        errorHandler(error as ErrorResponseData, 'Failed to load documents');
        setDocuments([]);
      } finally {
        setIsLoadingDocuments(false);
      }
    } catch (error) {
      const errorData = error as ErrorResponseData;
      // Add proper checks to avoid "Cannot read properties of undefined"
      if (errorData && 
          errorData.response && 
          errorData.response.data && 
          errorData.response.data.error_code === 'project_does_not_exist') {
        router.push('/projects');
      } else {
         errorHandler(error as ErrorResponseData, 'Failed to load project');
      }
    }
  };

  useEffect(() => {
    // Fetch team member roles from backend
    getProjectTeamRoles()
      .then(roles => {
        setTeamRoles(roles.map((role: any) => ({ key: role.name, label: role.value })));
      })
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    if (teamRoles.length > 0) {
      const expanded: Record<string, boolean> = {};
      const data: Record<string, { name: string; phone: string; email: string; address: string }> = {};
      teamRoles.forEach(role => {
        expanded[role.key] = role.key === 'PERMIT_OWNER';
        // Find the team member for this role
        const member = teamMembers.find((m: any) => m.role === role.label);
        data[role.key] = {
          name: member?.name || '',
          phone: member?.phone || '',
          email: member?.email || '',
          address: member?.address || ''
        };
      });
      setTeamExpanded(expanded);
      setTeamData(data);
    }
  }, [teamRoles, teamMembers]);

  const handleAddProfessional = () => {
    setShowAddProfessionalDialog(true);
  };

  const handleProfessionalAdded = async () => {
    setShowAddProfessionalDialog(false);

    // Reload the project data to get the updated professionals list
    if (id) {
      try {
        const updatedProject = await getProjectById(id);
        setFormData(updatedProject);
        originalData.current = updatedProject;

        // Update professionals list from the updated project data
        if (updatedProject.professionals && Array.isArray(updatedProject.professionals)) {
          const projectProfessionals = updatedProject.professionals.map(prof => ({
            id: prof.id,
            name: prof.name,
            email: prof.email,
            professional_type: prof.professional_type,
            status: prof.status,
            // Add default values for required fields that might not be in the API response
            national_id: '',
            phone: '',
            license_number: '',
            license_expiration_date: '',
            address: ''
          }));
          setProfessionals(projectProfessionals);
        }
      } catch (error) {
        errorHandler(error as ErrorResponseData, 'Failed to reload project data');
      }
    }
  };

  const handleRemoveProfessional = (professional: Professional) => {
    setProfessionalToRemove(professional);
  };

  const confirmRemoveProfessional = async () => {
    if (!professionalToRemove || !id) return;
    setProfessionalToRemove(null);
      try {
      const professional_id = professionalToRemove.id.toString()
      await removeProfessionalFromProject({
        project_id: id,
        professional_id: professional_id
      });
      await loadData()
        toast.success('הבעל מקצוע הוסר מהפרויקט');
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'Failed to remove professional from project');
    }
  };

  const cancelRemoveProfessional = () => {
    setProfessionalToRemove(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev =>
      prev ? ({ ...prev, [name]: value } as Project) : prev
    );
  };

  const startEditing = () => {
    setIsEditingDetails(true);
  };
  const cancelEditing = () => {
    setFormData(originalData.current);
    setIsEditingDetails(false);
  };

  const saveChanges = async () => {
    if (!formData) return;
    setSaving(true);
      try {
      // Send updated data to the backend
      await updateProject(formData);

      // Fetch the updated project data
      try {
        const updatedProject = await getProjectById(id);
        setFormData(updatedProject);
        originalData.current = updatedProject;

        // Update professionals list from the updated project data
        if (updatedProject.professionals && Array.isArray(updatedProject.professionals)) {
          const projectProfessionals = updatedProject.professionals.map(prof => ({
            id: prof.id,
            name: prof.name,
            email: prof.email,
            professional_type: prof.professional_type,
            status: prof.status,
            // Add default values for required fields that might not be in the API response
            national_id: '',
            phone: '',
            license_number: '',
            license_expiration_date: '',
            address: ''
          }));
          setProfessionals(projectProfessionals);
        }
        } catch (error) {
        errorHandler(error as ErrorResponseData, 'Failed to reload project data');
        // If we can't reload, at least update the local state with what we have
        setFormData(formData);
        originalData.current = formData;
      }

      setIsEditingDetails(false);
      toast.success('השינויים נשמרו')
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  console.log('ProjectView render - isEditing:', isEditingDetails, 'activeTab:', activeTab);

  // Convert ProjectDocument[] to FileAreaDocument[]
  const filesData: FileAreaDocument[] = [];

  // Group documents by type
  const documentsByType: Record<string, ProjectDocument[]> = {};
  documents.forEach(doc => {
    if (!documentsByType[doc.document_type]) {
      documentsByType[doc.document_type] = [];
    }
    documentsByType[doc.document_type].push(doc);
  });

  // Add documents to filesData
  Object.entries(documentsByType).forEach(([type, docs]) => {
    if (type === 'כללי') {
      // Add all general files
      docs.forEach(generalDoc => {
        filesData.push({
          fileId: generalDoc.id,
          fileName: generalDoc.name,
          state: DocumentState.UPLOADED,
          fileType: type,
          status: generalDoc.status,
          created_at: generalDoc.created_at,
          versions: [] // General files don't have versions
        });
      });
    } else {
      // For other document types, sort by created_at and take the most recent
      const sortedDocs = docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const doc = sortedDocs[0]; // Take the most recent document
      
      // Create versions array from all documents of this type
      const versions = docs.map(versionDoc => ({
        id: versionDoc.id,
        name: versionDoc.name,
        status: versionDoc.status,
        created_at: versionDoc.created_at
      }));
      
      console.log(`Document ${type} has ${versions.length} versions:`, versions);
      
      filesData.push({
        fileId: doc.id,
        fileName: doc.name,
        state: DocumentState.UPLOADED,
        fileType: type,
        status: doc.status,
        created_at: doc.created_at,
        versions: versions
      });
    }
  });

  // Add missing document types
  const existingTypes = Object.keys(documentsByType);
  documentTypes?.forEach(type => {
    // Do not create a missing placeholder for general documents
    if (type === 'כללי') {
      return;
    }
    if (!existingTypes.includes(type)) {
      filesData.push({
        fileId: '',
        fileName: null,
        state: DocumentState.MISSING,
        fileType: type,
        versions: []
      });
    }
  });

  const handleFileUpload = async (fileType: string, file: File, mode: 'auto' | 'manual', status: string = DocumentState.UPLOADED) => {
    if (!id || !file) return;
    try {
      console.log(`Uploading document with status: ${status}`);
      await uploadProjectDocument(id, fileType, file.name, file, status, mode);
      await loadData();
      toast.success(`${fileType} uploaded successfully with status: ${status}`);
    } catch (error) {
    console.error("File upload error details:", error);
      errorHandler(error as ErrorResponseData, `Failed to upload ${fileType}`);
    }
  };

  const handleAutoFill = async (fileId: string, documentType: string, fileName: string) => {
    if (!id || !fileId) return;
    
    // Set loading state for this document
    setAutoFillingDocId(fileId);
    
    try {
      // Download the current file
      const blob = await downloadProjectDocument(id, fileId);
      const file = new File([blob], fileName, { type: blob.type });
      
      // Update the document with auto-fill
      await autoFillDocument(id, fileId, documentType, file);
      await loadData();
      toast.success('Document auto-filled successfully');
      } catch (error) {
      console.error("Auto fill error details:", error);
      errorHandler(error as ErrorResponseData, 'Failed to auto-fill document');
    } finally {
      // Clear loading state
      setAutoFillingDocId(null);
    }
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const blob = await downloadProjectDocument(id, fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'Failed to download file');
    }
  };
  
  // Handler for downloading a specific version of a document
  const handleVersionDownload = async (versionId: string) => {
    console.log(`handleVersionDownload called with versionId: ${versionId}`);
    
    if (!id) {
      console.error("Project ID is missing");
      toast.error("שגיאה: מזהה פרויקט חסר");
      return;
    }
    
    if (!versionId) {
      console.error("Version ID is missing");
      toast.error("שגיאה: מזהה גרסה חסר");
      return;
    }
    
    try {
      // Find the document version details
      let fileName = '';
      let foundVersion = false;
      
      for (const file of filesData) {
        if (file.versions) {
          const version = file.versions.find(v => v.id === versionId);
          if (version) {
            fileName = version.name;
            foundVersion = true;
            console.log(`Found version with name: ${fileName}`);
            break;
          }
        }
      }
      
      if (!foundVersion) {
        console.warn(`Could not find version with ID: ${versionId} in local data`);
      }
      
      console.log(`Downloading document with projectId: ${id}, versionId: ${versionId}`);
      
      // Download the specific version
      try {
        const blob = await downloadProjectDocument(id, versionId);
        console.log(`Document downloaded successfully, blob size: ${blob.size} bytes`);
        
        if (blob.size === 0) {
          console.error("Downloaded blob is empty");
          toast.error("הקובץ שהורד ריק");
          return;
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `document-${versionId}.pdf`;
        document.body.appendChild(a);
        console.log(`Triggering download for: ${a.download}`);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('הגרסה הורדה בהצלחה');
      } catch (downloadError) {
        console.error(`Error in downloadProjectDocument: ${downloadError}`);
        throw downloadError;
      }
    } catch (error) {
      console.error(`Error downloading version ${versionId}:`, error);
      errorHandler(error as ErrorResponseData, 'Failed to download document version');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!id || !fileId) return;

    // Find the file to get its status
    const fileToDelete = filesData.find(file => file.fileId === fileId);
    const status = fileToDelete?.status || DocumentState.UPLOADED;

    try {
      await deleteProjectDocument(id, fileId, status);
      await loadData();
      toast.success('File deleted successfully');
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'Failed to delete file');
    }
  };

  const handleFilePreview = async (fileId: string, fileName: string) => {
    try {
      const blob = await downloadProjectDocument(id, fileId);
      const url = window.URL.createObjectURL(blob);
      setPreviewFileUrl(url);
      setPreviewFileName(fileName);
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'Failed to preview file');
    }
  };

  const closePreview = () => {
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewFileUrl(null);
    setPreviewFileName(null);
  };

  const handleUploadGeneralFile = async (file: File) => {
    if (!id || !file) return;

    try {
      const fileName = file.name;
      console.log(`Uploading general file: ${fileName}, size: ${file.size} bytes, status: ${DocumentState.GENERAL}`);
      await uploadProjectDocument(id, 'כללי', fileName, file, DocumentState.GENERAL);
      await loadData();
      toast.success('File uploaded successfully');
      } catch (error) {
      console.error("File upload error:", error); 
      errorHandler(error as ErrorResponseData, 'Failed to upload file');
    }
  };

  const handleDownloadAllFiles = async () => {
    // Get all uploaded documents
    const uploadedDocs = documents.filter(doc => doc.id);
    
    if (uploadedDocs.length === 0) {
      toast.info('אין קבצים להורדה');
      return;
    }
    
    // Download each file
    for (const doc of uploadedDocs) {
      try {
        await handleFileDownload(doc.id, doc.name);
      } catch (error) {
        errorHandler(error as ErrorResponseData, `Failed to download ${doc.name}`);
      }
    }
    
    toast.success(`הורדו ${uploadedDocs.length} קבצים`);
  };

  const handleEmailAllFiles = () => {
    // Would implement email functionality here
    // This would typically open a dialog to enter email address
    toast.info('תכונת שליחת כל הקבצים במייל תיושם כאן');
  };

  // Render icons directly
  const renderIcon = (iconType: any, size = 14) => {
    const IconComponent = iconType;
    return <IconComponent size={size} />;
  };

  // Fetch team members when loading the project or after save
  const loadTeamMembers = async () => {
    if (!id) return;
    const members = await getProjectTeamMembers(id);
    setTeamMembers(members);
  };

  useEffect(() => {
    loadTeamMembers();
  }, [id]);

  // Prepare filesData for FileArea
  let generalFiles = filesData.filter(f => f.fileType === 'כללי');
  // Sort general files by file name (ascending). Missing placeholders always last.
  generalFiles = generalFiles.sort((a, b) => {
    const aMissing = a.state === DocumentState.MISSING;
    const bMissing = b.state === DocumentState.MISSING;
    if (aMissing && !bMissing) return 1;
    if (bMissing && !aMissing) return -1;
    const an = (a.fileName || '').toString();
    const bn = (b.fileName || '').toString();
    return an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
  });

  const saveTeam = async (data: typeof teamData) => {
    if (!id) return;
    const currentMembers = await getProjectTeamMembers(id);
    let hasValidationError = false;

    for (const roleKey of Object.keys(teamData)) {
      const role = teamRoles.find(r => r.key === roleKey);
      if (!role) continue;
      const memberData = teamData[roleKey];
      const existing = currentMembers.find((m: any) => m.role === role.label);

      // If all fields are empty, skip
      if (!memberData.name && !memberData.phone && !memberData.email && !memberData.address) {
        if (existing) {
          await deleteProjectTeamMember(existing.id);
        }
        continue;
      }

      // If some fields are filled but not all required, show error and skip
      if (!memberData.name || !memberData.address || !memberData.phone) {
        hasValidationError = true;
        toast.error(`יש למלא שם, כתובת וטלפון עבור תפקיד: ${role.label}`);
        continue;
      }

      // All required fields are filled, create or update
      if (existing) {
        await updateProjectTeamMember({
          id: existing.id,
          name: memberData.name,
          address: memberData.address,
          phone: memberData.phone,
          email: memberData.email,
          role: role.label
        });
      } else {
        await createProjectTeamMember({
          project_id: id,
          name: memberData.name,
          address: memberData.address,
          phone: memberData.phone,
          email: memberData.email,
          role: role.label
        });
      }
    }
    await loadTeamMembers();
    if (!hasValidationError) {
      toast.success('Team members saved successfully');
    }
  };

  return (
    <PageContainer>
      <TopPanel>
        <TopPanelLogo/>
        <TopPanelTitleHolder>
          <TopPanelTitle>
            {formData?.name || 'Project Details'}
          </TopPanelTitle>
        </TopPanelTitleHolder>
        <TopPanelGroup>
          <IconOnlyButton onClick={() => router.back()} title="Back">
            {renderIcon(FaIcons.FaArrowLeft)}
          </IconOnlyButton>
          <IconOnlyButton
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="Delete"
          >
            {renderIcon(FaIcons.FaTrash)}
          </IconOnlyButton>
        </TopPanelGroup>
      </TopPanel>
      <PageContent style={{ padding: '16px 0 0 0', overflow: 'hidden' }}>
        {!formData ? (
          <EmptyStatePlaceholder msg="Project not found" />
        ) : (
          <MainLayout>
            {/* Second Sidebar with Navigation */}
            <SecondSidebar>
              <SecondSidebarContent>
                <SidebarButton 
                  active={activeTab === 'details'} 
                  onClick={() => setActiveTab('details')}
                >
                  פרטי הפרויקט
                </SidebarButton>
                <SidebarButton 
                  active={activeTab === 'professionals'} 
                  onClick={() => setActiveTab('professionals')}
                >
                  בעלי מקצוע
                </SidebarButton>
                <SidebarButton
                  active={activeTab === 'team'}
                  onClick={() => setActiveTab('team')}
                >
                  צוות הפרויקט
                </SidebarButton>
              </SecondSidebarContent>
            </SecondSidebar>

            {/* Project Panel */}
            <ProjectPanel>
              <Card style={{ marginTop: '60px' }}>
                
                {activeTab === 'details' && (
                  <div>
                    {/* Document Status Indicator - Moved to project details section */}
                    <div style={{ 
                      marginBottom: 20, 
                      padding: '15px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>סטטוס מסמכי תחילת עבודה</div>
                      
                      {/* Progress Bar Container */}
                      <div style={{ 
                        display: 'flex', 
                        height: '12px', 
                        borderRadius: '6px', 
                        overflow: 'hidden',
                        marginBottom: '10px'
                      }}>
                        {/* Calculate document counts by status */}
                        {(() => {
                          const categorizedDocs = filesData.filter(f => f.fileType !== 'כללי');
                          const totalDocs = categorizedDocs.length;
                          
                          const missingCount = categorizedDocs.filter(f => f.state === DocumentState.MISSING).length;
                          const uploadedCount = categorizedDocs.filter(f => f.status === DocumentState.UPLOADED && f.state !== DocumentState.MISSING).length;
                          const filledCount = categorizedDocs.filter(f => f.status === DocumentState.FILLED).length;
                          const signedCount = categorizedDocs.filter(f => f.status === DocumentState.SIGNED).length;
                          
                          // Calculate percentages
                          const missingPercent = totalDocs > 0 ? (missingCount / totalDocs) * 100 : 0;
                          const uploadedPercent = totalDocs > 0 ? (uploadedCount / totalDocs) * 100 : 0;
                          const filledPercent = totalDocs > 0 ? (filledCount / totalDocs) * 100 : 0;
                          const signedPercent = totalDocs > 0 ? (signedCount / totalDocs) * 100 : 0;
                          
                          return (
                            <>
                              {/* Missing segment */}
                              {missingCount > 0 && (
                                <div style={{ width: `${missingPercent}%`, backgroundColor: '#ff6b6b' }}></div>
                              )}
                              
                              {/* Uploaded segment */}
                              {uploadedCount > 0 && (
                                <div style={{ width: `${uploadedPercent}%`, backgroundColor: '#0071e3' }}></div>
                              )}
                              
                              {/* Filled segment */}
                              {filledCount > 0 && (
                                <div style={{ width: `${filledPercent}%`, backgroundColor: '#b0851f' }}></div>
                              )}
                              
                              {/* Signed segment */}
                              {signedCount > 0 && (
                                <div style={{ width: `${signedPercent}%`, backgroundColor: '#1d8450' }}></div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      
                      {/* Legend */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                        {/* Calculate document counts by status */}
                        {(() => {
                          const categorizedDocs = filesData.filter(f => f.fileType !== 'כללי');
                          const totalDocs = categorizedDocs.length;
                          
                          const missingCount = categorizedDocs.filter(f => f.state === DocumentState.MISSING).length;
                          const uploadedCount = categorizedDocs.filter(f => f.status === DocumentState.UPLOADED && f.state !== DocumentState.MISSING).length;
                          const filledCount = categorizedDocs.filter(f => f.status === DocumentState.FILLED).length;
                          const signedCount = categorizedDocs.filter(f => f.status === DocumentState.SIGNED).length;
                          
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: '#ff6b6b', borderRadius: '2px' }}></div>
                                <span>חסרים: {missingCount}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: '#0071e3', borderRadius: '2px' }}></div>
                                <span>ריקים: {uploadedCount}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: '#b0851f', borderRadius: '2px' }}></div>
                                <span>מלאים: {filledCount}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: '#1d8450', borderRadius: '2px' }}></div>
                                <span>חתומים: {signedCount}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: 'auto' }}>
                                <span>סה"כ: {totalDocs}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      {!isEditingDetails ? (
                        <CompactButton onClick={() => setIsEditingDetails(true)}>
                          {renderIcon(FaIcons.FaEdit)} Edit
                        </CompactButton>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <CompactButton onClick={async () => { await saveChanges(); setIsEditingDetails(false); }} disabled={saving}>
                            {renderIcon(FaIcons.FaCheck)} Save
                          </CompactButton>
                          <CompactButton onClick={() => { cancelEditing(); setIsEditingDetails(false); }} disabled={saving}>
                            {renderIcon(FaIcons.FaTimes)} Cancel
                          </CompactButton>
                        </div>
                      )}
                    </div>
                    <CompactFormGrid>
                      <FullWidthField>
                        <CompactLabel>שם הפרויקט</CompactLabel>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </FullWidthField>
                      <CompactField>
                        <CompactLabel>מספר בקשה</CompactLabel>
                        <Input
                          name="request_number"
                          value={formData.request_number}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <CompactField>
                        <CompactLabel>מספר היתר</CompactLabel>
                        <Input
                          name="permit_number"
                          value={formData.permit_number}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <CompactField>
                        <CompactLabel>מספר תיק טיפול</CompactLabel>
                        <Input
                          name="construction_supervision_number"
                          value={formData.construction_supervision_number}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <CompactField>
                        <CompactLabel>מספר תיאום הנדסי</CompactLabel>
                        <Input
                          name="engineering_coordinator_number"
                          value={formData.engineering_coordinator_number}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <CompactField>
                        <CompactLabel>מספר תיק כיבוי</CompactLabel>
                        <Input
                          name="firefighting_number"
                          value={formData.firefighting_number}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <CompactField>
                        <CompactLabel>סטטוס הפרויקט</CompactLabel>
                        <Select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        >
                          {statuses.map(s => (<option key={s} value={s}>{s}</option>))}
                        </Select>
                      </CompactField>
                      <CompactField>
                        <CompactLabel>תאריך סיום</CompactLabel>
                        <Input
                          name="status_due_date"
                          type="date"
                          value={formData.status_due_date || ''}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', height: '36px' }}
                        />
                      </CompactField>
                      <FullWidthField>
                        <CompactLabel>תיאור הפרויקט</CompactLabel>
                        <TextArea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          disabled={!isEditingDetails}
                          style={{ borderRadius: '8px', padding: '8px 10px', minHeight: '60px' }}
                        />
                      </FullWidthField>
                    </CompactFormGrid>

                  </div>
                )}
                
                {activeTab === 'professionals' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                      <CompactButton 
                        onClick={handleAddProfessional} 
                      >
                        {renderIcon(FaIcons.FaPlus, 12)} הוסף בעל מקצוע
                      </CompactButton>
                    </div>
                    
                    {isLoadingProfessionals ? (
                      <p style={{ fontSize: '13px', color: '#666' }}>טוען בעלי מקצוע...</p>
                    ) : professionals.length === 0 ? (
                      <div style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center', 
                        backgroundColor: '#f9f9fb',
                        borderRadius: '8px',
                        color: '#666',
                        fontSize: '13px'
                      }}>
                        אין בעלי מקצוע מצורפים לפרויקט
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {professionals.map(professional => (
                          <ProfessionalCard className='professional-card' key={professional.id}>
                            <ProfessionalInfo className='professional-info'>
                              <Link href={`/professionals/${professional.id}`} passHref>
                                <ProfessionalName>
                                  {professional.name}
                                </ProfessionalName>
                              </Link>
                              <ProfessionalType>{professional.professional_type}</ProfessionalType>
                              <StatusBadge status={professional.status}>{professional.status}</StatusBadge>
                            </ProfessionalInfo>
                            <IconOnlyButton 
                              onClick={() => handleRemoveProfessional(professional)} 
                              title="הסר בעל מקצוע"
                              style={{ margin: '0', width: '24px', height: '24px', fontSize: '12px' }}
                            >
                              {renderIcon(FaIcons.FaTrash, 12)}
                            </IconOnlyButton>
                          </ProfessionalCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'team' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      {!isEditingTeam ? (
                        <CompactButton onClick={() => setIsEditingTeam(true)}>
                          {renderIcon(FaIcons.FaEdit)} Edit
                        </CompactButton>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <CompactButton onClick={async () => { await saveTeam(teamData); setIsEditingTeam(false); }} disabled={saving}>
                            {renderIcon(FaIcons.FaCheck)} Save
                          </CompactButton>
                          <CompactButton onClick={() => { setIsEditingTeam(false); loadTeamMembers(); }} disabled={saving}>
                            {renderIcon(FaIcons.FaTimes)} Cancel
                          </CompactButton>
                        </div>
                      )}
                    </div>
                    {rolesLoading ? (
                      <div>Loading roles...</div>
                    ) : (
                      teamRoles.map(member => (
                        <Card key={member.key} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setTeamExpanded(prev => ({ ...prev, [member.key]: !prev[member.key] }))}>
                            <span style={{ fontWeight: 600 }}>{member.label}</span>
                            {teamExpanded[member.key] ? <FaChevronUp /> : <FaChevronDown />}
                          </div>
                          {teamExpanded[member.key] && (
                            <div style={{ marginTop: 12 }}>
                              <CompactFormGrid>
                                <CompactField>
                                  <CompactLabel>שם מלא</CompactLabel>
                                  <Input
                                    value={teamData[member.key]?.name || ''}
                                    onChange={e => setTeamData(prev => ({ ...prev, [member.key]: { ...prev[member.key], name: e.target.value } }))}
                                    placeholder="שם מלא"
                                    disabled={!isEditingTeam}
                                  />
                                </CompactField>
                                <CompactField>
                                  <CompactLabel>טלפון</CompactLabel>
                                  <Input
                                    value={teamData[member.key]?.phone || ''}
                                    onChange={e => setTeamData(prev => ({ ...prev, [member.key]: { ...prev[member.key], phone: e.target.value } }))}
                                    placeholder="טלפון"
                                    disabled={!isEditingTeam}
                                  />
                                </CompactField>
                                <CompactField>
                                  <CompactLabel>דוא"ל</CompactLabel>
                                  <Input
                                    value={teamData[member.key]?.email || ''}
                                    onChange={e => setTeamData(prev => ({ ...prev, [member.key]: { ...prev[member.key], email: e.target.value } }))}
                                    placeholder={'דוא"ל'}
                                    disabled={!isEditingTeam}
                                  />
                                </CompactField>
                                <CompactField>
                                  <CompactLabel>כתובת</CompactLabel>
                                  <Input
                                    value={teamData[member.key]?.address || ''}
                                    onChange={e => setTeamData(prev => ({ ...prev, [member.key]: { ...prev[member.key], address: e.target.value } }))}
                                    placeholder="כתובת"
                                    disabled={!isEditingTeam}
                                  />
                                </CompactField>
                              </CompactFormGrid>
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </ProjectPanel>

            {/* Documents Panel */}
            <DocumentsPanel>
              <Card style={{ height: 'auto', padding: '20px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: 16 }}>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: activeDocTab === 'categorized' ? 700 : 600,
                      color: activeDocTab === 'categorized' ? '#0071e3' : '#666',
                      borderBottom: `2px solid ${activeDocTab === 'categorized' ? '#0071e3' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setActiveDocTab('categorized')}
                  >
                    מסמכי תחילת עבודה
                  </button>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: activeDocTab === 'general' ? 700 : 600,
                      color: activeDocTab === 'general' ? '#0071e3' : '#666',
                      borderBottom: `2px solid ${activeDocTab === 'general' ? '#0071e3' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setActiveDocTab('general')}
                  >
                    מסמכים כלליים
                  </button>
                </div>
                {activeDocTab === 'categorized' && (
                  <>
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16, gap: 8 }}>
                      <button
                        onClick={handleDownloadAllFiles}
                        disabled={filesData.filter(f => f.fileType !== 'כללי' && f.state === DocumentState.UPLOADED).length === 0}
                        style={{
                          background: '#648fbf',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: filesData.filter(f => f.fileType !== 'כללי' && f.state === DocumentState.UPLOADED).length === 0 ? 'not-allowed' : 'pointer',
                          opacity: filesData.filter(f => f.fileType !== 'כללי' && f.state === DocumentState.UPLOADED).length === 0 ? 0.5 : 1,
                          marginBottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        {renderIcon(FaIcons.FaDownload, 16)}
                        הורד הכל
                      </button>
                      <button
                        disabled={true}
                        style={{
                          background: '#648fbf',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'not-allowed',
                          opacity: 0.5,
                          marginBottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        {renderIcon(FaIcons.FaEnvelope, 16)}
                        שלח במייל
                      </button>
                    </div>
                  </>
                )}
                {activeDocTab === 'general' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12, gap: 8 }}>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.pdf,.jpg,.jpeg,.png';
                        input.onchange = (e: Event) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (!files || files.length === 0) return;
                          Array.from(files).forEach(f => handleUploadGeneralFile(f));
                        };
                        input.click();
                      }}
                      style={{
                        background: '#648fbf',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        marginBottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      {renderIcon(FaIcons.FaUpload, 16)}
                      העלאת קבצים
                    </button>
                  </div>
                )}
                <FileArea
                  files={activeDocTab === 'categorized' ? filesData.filter(f => f.fileType !== 'כללי') : generalFiles}
                  disabled={false}
                  onUpload={handleFileUpload}
                  onDelete={handleFileDelete}
                  onPreview={handleFilePreview}
                  onAutoFill={handleAutoFill}
                  onDownloadVersion={handleVersionDownload}
                  isAutoFill={activeDocTab === 'categorized'}
                  autoFillingDocId={autoFillingDocId}
                  {...(activeDocTab === 'general' && {
                    onUploadGeneral: handleUploadGeneralFile
                  })}
                />
              </Card>
            </DocumentsPanel>
          </MainLayout>
        )}
        <DeletionDialog
          isOpen={isDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          message={`האם אתה בטוח שברצונך למחוק את הפרויקט ${formData?.name}?`}
          isDeleting={isDeleting}
        />

        {/* Dialog for removing a professional from the project */}
        <DeletionDialog
          isOpen={!!professionalToRemove}
          onConfirm={confirmRemoveProfessional}
          onCancel={cancelRemoveProfessional}
          message={`האם אתה בטוח שברצונך להסיר את ${professionalToRemove?.name} מפרויקט זה?`}
        />

        {/* Dialog for adding a professional to the project */}
        {showAddProfessionalDialog && (
          <ProjectProfessionalDialog
            projectId={id}
            onClose={handleProfessionalAdded}
            existingProfessionalIds={professionals.map(p => p.id)}
          />
        )}

        {/* File Preview Modal */}
        {previewFileUrl && previewFileName && (
          <FilePreview
            fileUrl={previewFileUrl}
            fileName={previewFileName}
            onClose={closePreview}
          />
        )}
      </PageContent>
    </PageContainer>
  );
};

export default ProjectView;
