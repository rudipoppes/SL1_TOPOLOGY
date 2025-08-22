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

// MOCK DATA for testing
const MOCK_DEVICES: Device[] = [
  { id: '5', name: 'SELAB-CDB', ip: '172.40.33.168', type: 'Database', status: 'online' },
  { id: '6', name: 'SELAB-AWS-DEMO-CU-01', ip: '172.40.32.71', type: 'Compute', status: 'warning' },
  { id: '7', name: 'SELAB-AWS-DEMO-CU-02', ip: '172.40.35.119', type: 'Compute', status: 'offline' },
  { id: '10', name: 'SELAB-VCenter-MC-01', ip: '10.128.88.97', type: 'VMware', status: 'online' },
  { id: '15', name: 'App Dynamics Account', ip: 'N/A', type: 'Monitoring', status: 'online' },
  { id: '20', name: 'Web Server 01', ip: '192.168.1.100', type: 'Web Server', status: 'online' },
  { id: '21', name: 'Load Balancer', ip: '192.168.1.50', type: 'Network', status: 'online' },
];

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
    try {
      console.log('🚀 Calling Lambda API:', apiConfig.baseUrl);
      const response = await api.get<DevicesResponse>('/devices', { params });
      return response.data;
    } catch (error) {
      console.error('❌ API call failed, falling back to mock data:', error);
      
      // Fallback to mock data if API fails
      let filtered = [...MOCK_DEVICES];
      
      // Apply search filter
      if (params.search) {
        const search = params.search.toLowerCase();
        filtered = filtered.filter(d => 
          d.name.toLowerCase().includes(search) || 
          d.ip.toLowerCase().includes(search)
        );
      }
      
      // Apply type filter
      if (params.type) {
        filtered = filtered.filter(d => d.type === params.type);
      }
      
      // Apply status filter  
      if (params.status) {
        filtered = filtered.filter(d => d.status === params.status);
      }
      
      return {
        devices: filtered.slice(params.offset || 0, (params.offset || 0) + (params.limit || 50)),
        pagination: {
          total: filtered.length,
          limit: params.limit || 50,
          offset: params.offset || 0,
          hasMore: false
        },
        filters: {
          availableTypes: ['Database', 'Compute', 'VMware', 'Monitoring', 'Web Server', 'Network'],
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
  }): Promise<TopologyResponse> {
    const response = await api.post<TopologyResponse>('/topology', params);
    return response.data;
  },
};

export default apiService;