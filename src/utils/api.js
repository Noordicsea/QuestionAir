const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new ApiError(
      data.error || 'Something went wrong',
      response.status,
      data
    );
  }
  
  return data;
}

export const api = {
  async get(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return handleResponse(response);
  },
  
  async post(endpoint, body = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    return handleResponse(response);
  },
  
  async patch(endpoint, body = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    return handleResponse(response);
  },
  
  async delete(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return handleResponse(response);
  },
  
  async upload(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', async () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new ApiError(data.error || 'Upload failed', xhr.status, data));
          }
        } catch {
          reject(new ApiError('Invalid response', xhr.status, {}));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new ApiError('Network error', 0, {}));
      });
      
      xhr.open('POST', `${API_BASE}${endpoint}`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },
};

// Date formatting utilities

// SQLite's datetime('now') returns UTC but without a 'Z' suffix,
// so JavaScript incorrectly interprets it as local time.
// This helper ensures the date is parsed as UTC.
function parseUTCDate(dateString) {
  if (!dateString) return new Date();
  // If it already has timezone info, parse as-is
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('T')) {
    return new Date(dateString);
  }
  // SQLite format: "2026-01-05 14:30:00" - append 'Z' to indicate UTC
  return new Date(dateString.replace(' ', 'T') + 'Z');
}

export function formatRelativeTime(dateString) {
  const date = parseUTCDate(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
  });
}

export function formatDateTime(dateString) {
  const date = parseUTCDate(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}


