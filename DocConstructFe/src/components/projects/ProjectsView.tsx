import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { FaPlus, FaExclamationTriangle, FaTh, FaList } from 'react-icons/fa';

import { getProjects } from '../../api';
import {
  TopPanel,
  TopPanelLogo,
  PageContainer,
  TopPanelGroup,
  PageContent,
  IconButton,
  TopPanelTitleHolder,
  TopPanelTitle,
  CardGrid,
  Card,
  CardName,
  CardInfo,
  Table,
  TableHeader,
  TableBody,
  Input,
  Select
} from '../../styles/SharedStyles';
import { Project, ProjectStatus, ProfessionalStatus, ProjectTeamRole, DocumentState } from "../../types";
import EmptyStatePlaceholder from "../shared/EmptyState";
import {errorHandler, ErrorResponseData} from "../shared/ErrorHandler";
import ProjectCreationDialog from "./ProjectCreationDialog";

type ViewMode = 'cards' | 'table';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [showProjectCreationDialog, setShowProjectCreationDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'טעינת הפרויקטים נכשלה');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let result = projects;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.permit_number && p.permit_number.toLowerCase().includes(q)) ||
        (p.team_members && p.team_members.some(m => m.name && m.name.toLowerCase().includes(q)))
      ));
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    setFilteredProjects(result);
  }, [projects, search, statusFilter]);

  const handleProjectClick = async (projectId: string) => {
    await router.push(`/projects/${projectId}`);
  };

  const handleProjectAdded = async () => {
    await fetchProjects();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'לא זמין';

    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case ProjectStatus.PRE_PERMIT:
        return 'קדם היתר';
      case ProjectStatus.POST_PERMIT:
        return 'אחרי היתר';
      case ProjectStatus.FINAL:
        return 'הושלם';
      default:
        return 'לא ידוע';
    }
  };

  // Function to check if any professional in the project has Warning or Expired status
  const hasWarningOrExpiredProfessionals = (project: Project) => {
    // If the backend directly provides warning/expired flags
    if ('is_warning' in project || 'is_expired' in project) {
      return project.is_warning || project.is_expired;
    }
    
    // Otherwise check professional statuses
    if (!project.professionals || project.professionals.length === 0) {
      return false;
    }
    
    return project.professionals.some(professional => 
      professional.status === ProfessionalStatus.WARNING || 
      professional.status === ProfessionalStatus.EXPIRED
    );
  };

  const renderCardView = () => (
    <CardGrid>
      {filteredProjects.map((project) => (
        <Card
          key={project.id}
          onClick={() => handleProjectClick(project.id)}
        >
          <StatusBadge status={project.status || 'draft'}>
            {getStatusLabel(project.status)}
          </StatusBadge>
          {project.is_expired && (
            <WarningBadge color="#d32f2f" title="יש בעלי מקצוע עם רישיון שפג תוקף!">
              <FaExclamationTriangle />
            </WarningBadge>
          )}
          {!project.is_expired && project.is_warning && (
            <WarningBadge color="#f57c00" title="יש בעלי מקצוע עם רישיון שעומד לפוג (פחות מחודש)!">
              <FaExclamationTriangle />
            </WarningBadge>
          )}
          <CardName><b>{project.name}</b></CardName>
          {project.description && <CardInfo>{project.description.length > 160 ? project.description.slice(0,160) + '...' : project.description}</CardInfo>}
          <CardInfo><b>בעל היתר:</b> {project.team_members?.find(member => member.role === ProjectTeamRole.PERMIT_OWNER)?.name || 'לא זמין'}</CardInfo>
          <CardInfo><b>צוות:</b> {project.professionals ? project.professionals.length : (project.team_members ? project.team_members.length : 0)}</CardInfo>
          <CardInfo><b>מספר היתר:</b> {project.permit_number || 'לא זמין'}</CardInfo>
          <DocumentStatusBar project={project} />
        </Card>
      ))}
    </CardGrid>
  );

  const renderTableView = () => (
    <Table>
      <thead>
        <tr>
          <TableHeader>שם פרויקט</TableHeader>
          <TableHeader>בעל היתר</TableHeader>
          <TableHeader>סטטוס</TableHeader>
          <TableHeader>מספר היתר</TableHeader>
          <TableHeader>התראות</TableHeader>
        </tr>
      </thead>
      <tbody>
        {filteredProjects.map((project) => (
          <tr 
            key={project.id} 
            onClick={() => handleProjectClick(project.id)}
            style={{ cursor: 'pointer' }}
          >
            <TableBody><b>{project.name}</b></TableBody>
            <TableBody>{project.team_members?.find(member => member.role === ProjectTeamRole.PERMIT_OWNER)?.name || 'לא זמין'}</TableBody>
            <TableBody>
              <TableStatusBadge status={project.status || 'draft'}>
                {getStatusLabel(project.status)}
              </TableStatusBadge>
            </TableBody>
            <TableBody>{project.permit_number || 'לא זמין'}</TableBody>
            <TableBody>
              {project.is_expired && (
                <TableWarningBadge color="#d32f2f" title="יש בעלי מקצוע עם רישיון שפג תוקף!">
                  <FaExclamationTriangle />
                </TableWarningBadge>
              )}
              {!project.is_expired && project.is_warning && (
                <TableWarningBadge color="#f57c00" title="יש בעלי מקצוע עם רישיון שעומד לפוג (פחות מחודש)!">
                  <FaExclamationTriangle />
                </TableWarningBadge>
              )}
              {/* Document status indicator in table view */}
              <div style={{ 
                display: 'flex', 
                height: '4px', 
                width: '80px',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '4px'
              }}
              title={project.documents ? `מסמכים: ${project.documents.length}` : 'אין מסמכים'}>
                {(() => {
                  // For testing purposes, we'll create mock document counts
                  const mockDocuments = [
                    { id: '1', status: 'Missing' },
                    { id: '2', status: 'Missing' },
                    { id: '3', status: 'Uploaded' },
                    { id: '4', status: 'Uploaded' },
                    { id: '5', status: 'Uploaded' },
                    { id: '6', status: 'Filled' },
                    { id: '7', status: 'Filled' },
                    { id: '8', status: 'Signed' },
                  ];
                  
                  // Use real documents if available, otherwise use mock data
                  const docs = project.documents && project.documents.length > 0 ? project.documents : mockDocuments;
                  const total = docs.length;
                  
                  if (total === 0) return null;
                  
                  const missing = docs.filter(doc => doc.status === 'Missing' ).length;
                  const uploaded = docs.filter(doc => doc.status === 'Uploaded').length;
                  const filled = docs.filter(doc => doc.status === 'Filled').length;
                  const signed = docs.filter(doc => doc.status === 'Signed').length;
                  
                  const missingPercent = total > 0 ? (missing / total) * 100 : 0;
                  const uploadedPercent = total > 0 ? (uploaded / total) * 100 : 0;
                  const filledPercent = total > 0 ? (filled / total) * 100 : 0;
                  const signedPercent = total > 0 ? (signed / total) * 100 : 0;
                  
                  return (
                    <>
                      {missing > 0 && <div style={{ width: `${missingPercent}%`, backgroundColor: '#ff6b6b' }}></div>}
                      {uploaded > 0 && <div style={{ width: `${uploadedPercent}%`, backgroundColor: '#0071e3' }}></div>}
                      {filled > 0 && <div style={{ width: `${filledPercent}%`, backgroundColor: '#b0851f' }}></div>}
                      {signed > 0 && <div style={{ width: `${signedPercent}%`, backgroundColor: '#1d8450' }}></div>}
                    </>
                  );
                })()}
              </div>
            </TableBody>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  return (
    <PageContainer>
      <TopPanel>
        <TopPanelLogo/>
        <TopPanelTitleHolder>
          <TopPanelTitle>ניהול פרויקטים ליזמים</TopPanelTitle>
        </TopPanelTitleHolder>
        <TopPanelGroup>
          <IconButton onClick={() => setShowProjectCreationDialog(true)}>
            <FaPlus/>
          </IconButton>
        </TopPanelGroup>
      </TopPanel>
      <PageContent style={{ flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
            <Input placeholder="חפש פרויקטים, מספר היתר או בעל היתר" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">הכל</option>
              <option value={ProjectStatus.PRE_PERMIT}>קדם היתר</option>
              <option value={ProjectStatus.POST_PERMIT}>אחרי היתר</option>
              <option value={ProjectStatus.FINAL}>הושלם</option>
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#4b6b8e' }}>פרויקטים ({filteredProjects.length})</h2>
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              title={viewMode === 'cards' ? 'עבור לתצוגת טבלה' : 'עבור לתצוגת כרטיסים'}
              style={{
                background: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '6px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {viewMode === 'cards' ? <FaList /> : <FaTh />}
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <EmptyStatePlaceholder msg='אין פרויקטים זמינים' />
        ) : filteredProjects.length === 0 ? (
          <EmptyStatePlaceholder msg='לא נמצאו פרויקטים לפי החיפוש' />
        ) : (
          <>
            {viewMode === 'cards' ? renderCardView() : renderTableView()}
          </>
        )}
        {showProjectCreationDialog && (
          <ProjectCreationDialog
            onClose={() => setShowProjectCreationDialog(false)}
            onSuccess={handleProjectAdded}
          />
        )}
      </PageContent>
    </PageContainer>
  );
};

export default Projects;

const StatusBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case ProjectStatus.PRE_PERMIT:
        return '#e3f2fd';
      case ProjectStatus.POST_PERMIT:
        return '#e8f5e9';
      case ProjectStatus.FINAL:
        return '#e0f2f1';
      default:
        return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case ProjectStatus.PRE_PERMIT:
        return '#1565c0';
      case ProjectStatus.POST_PERMIT:
        return '#2e7d32';
      case ProjectStatus.FINAL:
        return '#00695c';
      default:
        return '#616161';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case ProjectStatus.PRE_PERMIT:
        return '#bbdefb';
      case ProjectStatus.POST_PERMIT:
        return '#c8e6c9';
      case ProjectStatus.FINAL:
        return '#b2dfdb';
      default:
        return '#e0e0e0';
    }
  }};
`;

const TableStatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case ProjectStatus.PRE_PERMIT:
        return '#e3f2fd';
      case ProjectStatus.POST_PERMIT:
        return '#e8f5e9';
      case ProjectStatus.FINAL:
        return '#e0f2f1';
      default:
        return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case ProjectStatus.PRE_PERMIT:
        return '#1565c0';
      case ProjectStatus.POST_PERMIT:
        return '#2e7d32';
      case ProjectStatus.FINAL:
        return '#00695c';
      default:
        return '#616161';
    }
  }};
`;

const WarningBadge = styled.div<{ color?: string }>`
  position: absolute;
  top: 15px;
  right: 22px;
  font-size: 18px;
  color: ${props => props.color || '#f57c00'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  font-weight: bold;
`;

const TableWarningBadge = styled.span<{ color?: string }>`
  font-size: 16px;
  color: ${props => props.color || '#f57c00'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  font-weight: bold;
`;

// Component for document status bar with tooltip
const DocumentStatusBar: React.FC<{ project: Project }> = ({ project }) => {
  // Debug: Log project data
  console.log('DocumentStatusBar - Project:', project);
  console.log('DocumentStatusBar - Has documents?', Boolean(project.documents));
  
  // If no documents available, show empty indicator
  if (!project.documents || project.documents.length === 0) {
    console.log('No documents found, showing empty indicator');
    
    return (
      <div 
        style={{ 
          position: 'absolute',
          bottom: '12px',
          left: '10px',
          right: '10px',
          height: '4px',
          display: 'flex',
          borderRadius: '2px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0' // Light gray background to show it's there
        }}
        title="אין נתוני מסמכים זמינים"
      />
    );
  }
  
  // Calculate document counts by status
  const getDocumentCounts = () => {
    const documents = project.documents || [];
    console.log('Documents:', documents);
    
    // For testing purposes, we'll create mock document counts
    // In a real scenario, this would come from the API
    const mockDocuments = [
      { status: 'Missing' },
      { status: 'Missing' },
      { status: 'Uploaded' },
      { status: 'Uploaded' },
      { status: 'Uploaded' },
      { status: 'Filled' },
      { status: 'Filled' },
      { status: 'Signed' },
    ];
    
    // Use real documents if available, otherwise use mock data
    const docsToUse = documents.length > 0 ? documents : mockDocuments;
    
    const categorizedDocs = docsToUse;
    const total = categorizedDocs.length;
    
    if (total === 0) return { missing: 0, uploaded: 0, filled: 0, signed: 0, total: 0 };
    
    // Count documents by status
    const missing = categorizedDocs.filter(doc => doc.status === 'Missing').length;
    const uploaded = categorizedDocs.filter(doc => doc.status === 'Uploaded').length;
    const filled = categorizedDocs.filter(doc => doc.status === 'Filled').length;
    const signed = categorizedDocs.filter(doc => doc.status === 'Signed').length;
    
    console.log('Document counts:', { missing, uploaded, filled, signed, total });
    
    return { missing, uploaded, filled, signed, total };
  };
  
  const { missing, uploaded, filled, signed, total } = getDocumentCounts();
  
  // If no documents, show at least a placeholder
  if (total === 0) {
    return (
      <div 
        style={{ 
          position: 'absolute',
          bottom: '12px',
          left: '10px',
          right: '10px',
          height: '4px',
          display: 'flex',
          borderRadius: '2px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0' // Light gray background
        }}
        title="אין מסמכים מקוטלגים"
      />
    );
  }
  
  // Calculate percentages
  const missingPercent = total > 0 ? (missing / total) * 100 : 0;
  const uploadedPercent = total > 0 ? (uploaded / total) * 100 : 0;
  const filledPercent = total > 0 ? (filled / total) * 100 : 0;
  const signedPercent = total > 0 ? (signed / total) * 100 : 0;
  
  return (
    <div 
      style={{ 
        position: 'absolute',
        bottom: '12px',
        left: '10px',
        right: '10px',
        height: '4px',
        display: 'flex',
        borderRadius: '2px',
        overflow: 'hidden'
      }}
      title={`מסמכים: חסרים: ${missing}, ריקים: ${uploaded}, מלאים: ${filled}, חתומים: ${signed}, סה"כ: ${total}`}
    >
      {missing > 0 && (
        <div style={{ width: `${missingPercent}%`, backgroundColor: '#ff6b6b' }}></div>
      )}
      {uploaded > 0 && (
        <div style={{ width: `${uploadedPercent}%`, backgroundColor: '#0071e3' }}></div>
      )}
      {filled > 0 && (
        <div style={{ width: `${filledPercent}%`, backgroundColor: '#b0851f' }}></div>
      )}
      {signed > 0 && (
        <div style={{ width: `${signedPercent}%`, backgroundColor: '#1d8450' }}></div>
      )}
    </div>
  );
};
