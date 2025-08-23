import React, { useRef, useEffect, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';
import { configService } from '../../services/config';

interface TopologyCanvasProps {
  devices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDeviceClick?: (device: Device) => void;
  className?: string;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  devices = [],
  topologyData,
  onDeviceClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const topologyConfig = configService.getTopologyConfig();

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const cy = cytoscape({
      container: containerRef.current,
      
      elements: [], // Start with empty elements
      
      style: [
        // Node styles
        {
          selector: 'node',
          style: {
            'background-color': '#3B82F6',
            'label': 'data(label)',
            'width': 40,
            'height': 40,
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#374151',
            'font-size': '12px',
            'font-weight': 'bold',
            'border-width': 2,
            'border-color': '#1E40AF',
            'overlay-opacity': 0,
          },
        },
        // Node states
        {
          selector: 'node[status = "online"]',
          style: {
            'background-color': '#10B981',
            'border-color': '#059669',
          },
        },
        {
          selector: 'node[status = "offline"]',
          style: {
            'background-color': '#EF4444',
            'border-color': '#DC2626',
          },
        },
        {
          selector: 'node[status = "warning"]',
          style: {
            'background-color': '#F59E0B',
            'border-color': '#D97706',
          },
        },
        {
          selector: 'node[status = "unknown"]',
          style: {
            'background-color': '#6B7280',
            'border-color': '#4B5563',
          },
        },
        // Selected nodes
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#8B5CF6',
          },
        },
        // Edge styles
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#9CA3AF',
            'target-arrow-color': '#9CA3AF',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        // Hover effects
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.2,
            'overlay-color': '#3B82F6',
          },
        },
      ],
      
      layout: {
        name: topologyConfig.canvas.defaultLayout,
        padding: 30,
      } as any,
      
      // Interaction options
      minZoom: 0.1,
      maxZoom: 3,
      // Remove custom wheel sensitivity to avoid warnings
    });

    // Event handlers
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const deviceData = node.data();
      
      if (onDeviceClick) {
        const device: Device = {
          id: deviceData.id,
          name: deviceData.label,
          ip: deviceData.ip || 'N/A',
          type: deviceData.type || 'Unknown',
          status: deviceData.status || 'unknown',
        };
        onDeviceClick(device);
      }
    });

    // Store reference and mark as initialized
    cyRef.current = cy;
    setIsInitialized(true);

    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [isInitialized, onDeviceClick, topologyConfig]);

  // Update elements when devices or topology data changes
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return;

    let elements: any[] = [];

    if (topologyData && topologyData.nodes && topologyData.edges) {
      // Use topology data (nodes + edges)
      const nodeElements = topologyData.nodes.map((node) => ({
        data: {
          id: String(node.id),
          label: node.label,
          type: node.type,
          status: node.status,
          ip: node.ip,
        },
      }));

      const edgeElements = topologyData.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: String(edge.source),
          target: String(edge.target),
        },
      }));

      elements = [...nodeElements, ...edgeElements];
    } else {
      // Fallback to simple device list (no relationships)
      elements = devices.map((device) => ({
        data: {
          id: device.id,
          label: device.name,
          ip: device.ip,
          type: device.type,
          status: device.status,
        },
        position: {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
      }));
    }

    if (elements.length > 0) {
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      
      // Force layout after small delay
      setTimeout(() => {
        if (cyRef.current) {
          const layout = cyRef.current.layout({
            name: 'grid',
            fit: true,
            padding: 30,
          } as any);
          layout.run();
        }
      }, 100);
    }

  }, [devices, topologyData, isInitialized, topologyConfig]);

  // Control functions
  const centerView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 30);
    }
  };

  const resetZoom = () => {
    if (cyRef.current) {
      cyRef.current.zoom(1);
      cyRef.current.center();
    }
  };

  const changeLayout = (layoutName: string) => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: layoutName,
        fit: true,
        padding: 30,
      } as any).run();
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Topology Canvas */}
      <div 
        ref={containerRef}
        className="w-full h-full bg-white rounded-lg border border-gray-200"
        style={{ minHeight: '400px' }}
      />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={centerView}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
          title="Center View"
        >
          🎯
        </button>
        
        <button
          onClick={resetZoom}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
          title="Reset Zoom"
        >
          🔍
        </button>
        
        <select
          onChange={(e) => changeLayout(e.target.value)}
          className="px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-sm hover:bg-gray-50 transition-colors"
          defaultValue={topologyConfig.canvas.defaultLayout}
        >
          {topologyConfig.canvas.layouts.map((layout) => (
            <option key={layout} value={layout}>
              {layout.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Device count */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-gray-600">
        {topologyData ? `${topologyData.nodes.length} nodes, ${topologyData.edges.length} connections` : `${devices.length} devices`}
      </div>
    </div>
  );
};

export default TopologyCanvas;