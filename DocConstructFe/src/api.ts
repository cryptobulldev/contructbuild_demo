import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthResponse, LoginCredentials, RefreshResponse, RegisterCredentials } from './types/auth';
import { Professional, Project, ProjectCreationFormData, DocumentState } from "./types";
import { ProfessionalCreationFormData } from "./components/professionals/ProfessionalCreationDialog";

// Use the direct API URL from environment variables if available
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/api';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post<RefreshResponse>(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth state and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const refreshToken = async (token: string) => {
  const response = await api.post('/auth/refresh', {},
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  return response.data;
};

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects');
  return response.data.projects
};

export const getProjectById = async (projectId: string): Promise<Project> => {
  const response = await api.get('/project', {
    params: {
      project_id: projectId
    }
  });
  return response.data.project;
};

export const createProject = async (data: ProjectCreationFormData): Promise<Project> => {
  const response = await api.post('/project', data);
  return response.data;
};

export const updateProject = async (data: Project): Promise<Project> => {
  const { documents, professionals, team_members, ...rest } = data; // exclude 'documents', 'professionals', and 'team_members'

  const response = await api.put('/project', rest);
  return response.data;
};

export const deleteProject = async (id: string) => {
  // Based on the backend code at DocConstructBe/app/routes.py:45-47
  // DELETE requests are processed using request.args.to_dict()
  // This means the project_id should be sent as a URL parameter
  console.log(`Starting deleteProject API call with ID: ${id}`);
  try {
    const response = await api.delete(
      '/project',
      {
        params: { project_id: id }
      }
    );
    console.log(`deleteProject API call successful:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`deleteProject API call failed:`, error);
    throw error;
  }
};

export const getProjectStatuses = async (): Promise<string[]> => {
  const response = await api.get('/project/statuses');
  return response.data.statuses;
}

// Professionals API
export const getProfessionals = async (): Promise<Professional[]> => {
  const response = await api.get('/professionals');
  return response.data.professionals;
};

export const getProfessionalById = async (professional_id: string): Promise<Professional> => {
  const response = await api.get('/professional', {
    params: {
      professional_id
    }
  });
  return response.data.professional;
};

export const createProfessional = async (data: ProfessionalCreationFormData): Promise<Professional> => {
  const response = await api.post('/professional', data);
  return response.data;
};

export const updateProfessional = async (data: Professional): Promise<Professional> => {
  const { documents, ...rest } = data; // exclude 'documents'
  const response = await api.put('/professional', rest);
  return response.data;
};

export const deleteProfessional = async (professionalId: string): Promise<null> => {
  const response = await api.delete(
    '/professional',
    {
      params: {
        professional_id: professionalId
      }
    }
  );
  return response.data;
};

export async function getProfessionalTypes(): Promise<string[]> {
  const response = await api.get('/professional/types');
  return response.data.types;
}

export async function getProfessionalStatuses(): Promise<string[]> {
  const response = await api.get('/professional/statuses');
  return response.data.statuses;
}

// Project-Professional Relationship API
export const addProfessionalToProject = async (data: {
  project_id: string;
  professional_id: string;
}) => {
  const response = await api.post('/project/professionals', data);
  return response.data;
};

export const removeProfessionalFromProject = async (data: {
  project_id: string;
  professional_id: string;
}) => {
  const response = await api.delete('/project/professionals', { data });
  return response.data;
};

export const uploadProfessionalDocument = async (
  professionalId: string,
  documentType: string,
  documentName: string,
  file: File
) => {
  const formData = new FormData();
  formData.append('professional_id', professionalId);
  formData.append('document_type', documentType);
  formData.append('document_name', documentName);
  formData.append('file', file);

  const response = await api.post('/professional/document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const downloadProfessionalDocument = async (professionalId: string, documentId: string) => {
  const response = await api.get(
    '/professional/document',
    {
      params: {
        professional_id: professionalId,
        document_id: documentId
      },
      responseType: 'blob'
    }
  );
  return response.data;
};

export const deleteProfessionalDocument = async (professionalId: string, documentId: string) => {
  const response = await api.delete(
    '/professional/document',
    {
      params: {
        professional_id: professionalId,
        document_id: documentId
      }
    }
  );
  return response.data;
};

export const getProfessionalDocumentTypes = async (): Promise<string[]> => {
  const response = await api.get('/professional/document/types');
  console.log(response.data.document_types);
  return response.data.document_types;
};

export const importProfessionalData = async (file: File): Promise<ProfessionalCreationFormData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    '/professional/import',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

// Project Documents API
export const uploadProjectDocument = async (
  projectId: string,
  documentType: string,
  documentName: string,
  file: File,
  status: string = DocumentState.UPLOADED,
  mode?: 'auto' | 'manual'
) => {
  const formData = new FormData();
  formData.append('project_id', projectId);
  formData.append('document_type', documentType);
  formData.append('document_name', documentName);
  formData.append('file', file);

  // Send the status directly from the DocumentState enum
  formData.append('status', status);
  if (mode) {
    formData.append('mode', mode);
  }
  const response = await api.post(
    '/project/document',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

export const downloadProjectDocument = async (projectId: string, documentId: string) => {
  const response = await api.get(
    '/project/document',
    {
      params: {
        project_id: projectId,
        document_id: documentId
      },
      responseType: 'blob'
    }
  );
  return response.data;
};

export const deleteProjectDocument = async (projectId: string, documentId: string, status: string) => {
  const response = await api.delete(
    '/project/document',
    {
      params: {
        project_id: projectId,
        document_id: documentId,
        status: status
      }
    }
  );
  return response.data;
};

export const getProjectDocumentTypes = async (): Promise<string[]> => {
  const response = await api.get('/project/document/types');
  return response.data.document_types;
};

export const getProjectTeamRoles = async (): Promise<{ value: string; name: string }[]> => {
  const response = await api.get('/project/team/roles');
  return response.data.roles;
};

export const getProjectTeamMembers = async (projectId: string) => {
  const response = await api.get('/project/teams', { params: { project_id: projectId } });
  return response.data.teams;
};

export const createProjectTeamMember = async (data: any) => {
  const response = await api.post('/project/teams', data);
  return response.data;
};

export const updateProjectTeamMember = async (data: any) => {
  const response = await api.put('/project/teams', data);
  return response.data;
};

export const deleteProjectTeamMember = async (id: string) => {
  const response = await api.delete('/project/teams', { data: { id } });
  return response.data;
};

// Auto fill document
export const autoFillDocument = async (
  projectId: string,
  documentId: string,
  documentType: string,
  file: File
) => {
  const formData = new FormData();
  formData.append('project_id', projectId);
  formData.append('document_id', documentId);
  formData.append('document_type', documentType);
  formData.append('file', file);

  const response = await api.put('/project/document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};
