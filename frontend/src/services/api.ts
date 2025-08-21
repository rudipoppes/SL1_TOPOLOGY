import axios from 'axios';

// Configure API base URL (will be updated with actual Lambda endpoint)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Device types
export interface Device {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | 'unknown';
}

export interface DevicesResponse {
  devices: Device[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    availableTypes: string[];
    availableStatuses: string[];
  };
}

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | 'unknown';
}

export interface TopologyEdge {
  source: string;
  target: string;
}

export interface TopologyResponse {
  topology: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  stats: {
    totalDevices: number;
    totalRelationships: number;
    depth: number;
    direction: string;
  };
}

// API functions
export const apiService = {
  // Fetch devices with filters
  async getDevices(params: {
    search?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DevicesResponse> {
    const response = await api.get<DevicesResponse>('/devices', { params });
    return response.data;
  },

  // Search devices
  async searchDevices(searchTerm: string): Promise<Device[]> {
    const response = await api.get<{ devices: Device[] }>('/search', {
      params: { search: searchTerm, limit: 20 },
    });
    return response.data.devices;
  },

  // Get topology for selected devices
  async getTopology(params: {
    deviceIds: string[];
    depth?: number;
    direction?: 'parents' | 'children' | 'both';
  }): Promise<TopologyResponse> {
    const response = await api.post<TopologyResponse>('/topology', params);
    return response.data;
  },
};

export default apiService;