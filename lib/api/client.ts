import type {
  Project,
  ProjectWithAggregates,
  CreateProjectInput,
  UpdateProjectInput,
  Submission,
  RejectSubmissionInput,
} from '@/packages/shared';

const API_BASE = '/api';

class APIError extends Error {
  public status: number;
  public details?: unknown;
  public error?: string;
  public responseData?: unknown;
  public statusText?: string;

  constructor(
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options?.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? { ...options?.headers }
    : {
        'Content-Type': 'application/json',
        ...options?.headers,
      };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data;
  try {
    const text = await response.text();
    if (!text) {
      data = {};
    } else {
      data = JSON.parse(text);
    }
  } catch (e) {
    // If response is not JSON, create error from status text
    console.error('Failed to parse response as JSON:', e);
    throw new APIError(
      response.statusText || 'API request failed',
      response.status,
      `Response was not valid JSON. Status: ${response.status}`
    );
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || 'API request failed';
    const errorDetails = data?.details || data?.detail || '';
    
    // Always log errors in development for better debugging
    // But skip expected errors (401, 404, 503)
    const isExpectedError = response.status === 401 || 
                           response.status === 404 || 
                           response.status === 503 ||
                           (response.status === 500 && errorMessage.includes('Database not configured'));
    
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        status: response.status,
        statusText: response.statusText,
        url: endpoint,
        data: data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        error: errorMessage,
        details: errorDetails,
        fullResponse: JSON.stringify(data, null, 2),
      };
      if (isExpectedError) {
        console.warn(`API ${response.status} (expected):`, logData);
      } else {
        console.error('API Error Response:', logData);
      }
    }
    
    const error = new APIError(
      errorMessage,
      response.status,
      errorDetails
    );
    
    // Preserve error details for better error handling - use class properties
    error.error = data?.error || data?.message;
    error.details = errorDetails;
    error.status = response.status;
    error.statusText = response.statusText;
    error.responseData = data;
    
    throw error;
  }

  return data;
}

// Auth API
export const authAPI = {
  async getNonce(): Promise<{ nonce: string }> {
    return fetchAPI('/auth/nonce');
  },

  async verify(params: {
    walletAddress: string;
    message: string;
    signature: string;
    nonce: string;
  }): Promise<{ success: boolean; profile: { walletAddress: string; role: string } }> {
    return fetchAPI('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getMe(): Promise<{ walletAddress: string; role: string }> {
    try {
      return await fetchAPI('/auth/me');
    } catch (error: any) {
      // Re-throw 401 errors as-is (expected when not authenticated)
      if (error?.status === 401) {
        throw error;
      }
      // For other errors, log and re-throw
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in authAPI.getMe:', error);
      }
      throw error;
    }
  },
};

// Projects API
export const projectsAPI = {
  async list(params?: {
    category?: string;
    sort?: 'newest' | 'top_rated' | 'most_funded';
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ projects: ProjectWithAggregates[]; count: number; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return fetchAPI(`/projects${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<{ project: ProjectWithAggregates }> {
    return fetchAPI(`/projects/${id}`);
  },

  async create(data: CreateProjectInput): Promise<{ project: Project }> {
    return fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateProjectInput): Promise<{ project: Project }> {
    return fetchAPI(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return fetchAPI(`/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async submit(id: string): Promise<{ submission: Submission }> {
    // Validate ID before making request
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      throw new APIError(
        'Project ID is required',
        400,
        `Invalid project ID: ${id}`
      );
    }

    const url = `${API_BASE}/projects/${encodeURIComponent(id)}/submit`;
    console.log('Submitting project to URL:', url);
    console.log('Project ID:', id);
    console.log('Project ID type:', typeof id);

    return fetchAPI(`/projects/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    });
  },

  async uploadImage(id: string, formData: FormData): Promise<{ image_url: string; image_thumb_url: string }> {
    // Validate ID before making request
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      throw new APIError(
        'Project ID is required',
        400,
        `Invalid project ID: ${id}`
      );
    }

    const url = `${API_BASE}/projects/${encodeURIComponent(id)}/image`;
    console.log('Uploading image to URL:', url);
    console.log('Project ID:', id);
    console.log('Project ID type:', typeof id);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error || 'Image upload failed',
        response.status,
        data.details
      );
    }

    return data;
  },

  async rate(id: string, stars: number, txHash?: string): Promise<{
    success: boolean;
    rating?: { stars: number; txHash: string };
    txData?: {
      to: string;
      data: string;
      chainId: number;
    };
  }> {
    return fetchAPI(`/projects/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ stars, txHash }),
    });
  },

  async fund(id: string, amount: string, txHash?: string): Promise<{
    success: boolean;
    funding?: { amount: string; txHash: string };
    txData?: {
      to: string;
      data: string;
      chainId: number;
    };
    approvalNeeded?: boolean;
    approvalTxData?: {
      to: string;
      data: string;
      chainId: number;
    };
  }> {
    return fetchAPI(`/projects/${id}/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount, txHash }),
    });
  },

  async registerOnChain(id: string): Promise<{
    success: boolean;
    createTxData?: {
      to: string;
      data: string;
      chainId: number;
    };
    approveTxData?: {
      to: string;
      data: string;
      chainId: number;
    };
    nftTxData?: {
      to: string;
      data: string;
      chainId: number;
    };
    needsCreation: boolean;
    needsApproval: boolean;
  }> {
    return fetchAPI(`/projects/${id}/register-on-chain`, {
      method: 'POST',
    });
  },

  async adminUpdate(id: string, data: UpdateProjectInput): Promise<{ 
    project: Project;
    message: string;
  }> {
    return fetchAPI(`/projects/${id}/admin-edit`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// My Projects API
export const myProjectsAPI = {
  async list(params?: {
    status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  }): Promise<{ projects: ProjectWithAggregates[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return fetchAPI(`/me/projects${query ? `?${query}` : ''}`);
  },
};

// Review API (curator only)
export const reviewAPI = {
  async listSubmissions(params?: {
    status?: 'Submitted' | 'Approved' | 'Rejected';
    limit?: number;
    offset?: number;
  }): Promise<{ submissions: Submission[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return fetchAPI(`/review/submissions${query ? `?${query}` : ''}`);
  },

  async approve(submissionId: string): Promise<{
    success: boolean;
    submission: Submission;
  }> {
    return fetchAPI(`/review/${submissionId}/approve`, {
      method: 'POST',
    });
  },

  async reject(submissionId: string, data: RejectSubmissionInput): Promise<{
    success: boolean;
    submission: Submission;
  }> {
    return fetchAPI(`/review/${submissionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Metadata API
export const metadataAPI = {
  async get(projectUuid: string): Promise<Record<string, unknown>> {
    return fetchAPI(`/metadata/${projectUuid}`);
  },
};

export { APIError };

