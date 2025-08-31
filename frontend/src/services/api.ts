import axios from 'axios';
import { configService } from './config';

// Get API configuration from config service
const apiConfig = configService.getApiConfig();

const api = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
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
    hasMore: boolean;
    nextCursor?: string;
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
  ip: string;
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

// NO MOCK DATA - Use real API only

// API functions
export const apiService = {
  // Fetch devices with filters
  async getDevices(params: {
    search?: string;
    type?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<DevicesResponse> {
    try {
      const response = await api.get<DevicesResponse>('/devices', { params });
      return response.data;
    } catch (error) {
      // Return empty but valid response instead of crashing
      return {
        devices: [],
        pagination: {
          total: 0,
          limit: params.limit || 50,
          hasMore: false
        },
        filters: {
          availableTypes: [],
          availableStatuses: ['online', 'offline', 'warning', 'unknown']
        }
      };
    }
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
    deviceDirections?: { [deviceId: string]: 'parents' | 'children' | 'both' };
    deviceDepths?: { [deviceId: string]: number };
  }): Promise<TopologyResponse> {
    const response = await api.post<TopologyResponse>('/topology', params);
    return response.data;
  },
};

export default apiService;