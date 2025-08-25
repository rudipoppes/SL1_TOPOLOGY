import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Device, TopologyNode, TopologyEdge } from '../../services/api';

interface ManualCanvasProps {
  devices?: Device[];
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  onDirectionChange?: (direction: 'parents' | 'children' | 'both', deviceId: string) => void;
  className?: string;
}

interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: string;
  ip?: string;
}

interface CanvasEdge {
  from: string;
  to: string;
}

const ManualCanvas: React.FC<ManualCanvasProps> = ({
  devices = [],
  topologyData,
  onDirectionChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    nodeId: string | null;
    offsetX: number;
    offsetY: number;
  }>({ isDragging: false, nodeId: null, offsetX: 0, offsetY: 0 });

  // Build nodes and edges from props
  useEffect(() => {
    const newNodes: CanvasNode[] = [];
    const newEdges: CanvasEdge[] = [];
    const processedIds = new Set<string>();

    // Process devices
    devices.forEach((device, index) => {
      if (!processedIds.has(device.id)) {
        // Simple grid layout
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = 50 + col * 200;
        const y = 50 + row * 150;

        newNodes.push({
          id: device.id,
          label: device.name,
          x,
          y,
          width: 160,
          height: 80,
          status: device.status,
          ip: device.ip,
        });
        processedIds.add(device.id);
      }
    });

    // Process topology data
    if (topologyData) {
      topologyData.nodes.forEach((node) => {
        if (!processedIds.has(node.id)) {
          // Place new nodes below existing ones
          const existingCount = processedIds.size;
          const col = existingCount % 4;
          const row = Math.floor(existingCount / 4) + 2; // Offset below existing
          const x = 50 + col * 200;
          const y = 50 + row * 150;

          newNodes.push({
            id: node.id,
            label: node.label,
            x,
            y,
            width: 160,
            height: 80,
            status: node.status,
            ip: node.ip,
          });
          processedIds.add(node.id);
        }
      });

      // Add edges
      topologyData.edges.forEach((edge) => {
        newEdges.push({
          from: edge.source,
          to: edge.target,
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [devices, topologyData]);

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges first (behind nodes)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    edges.forEach((edge) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(
          fromNode.x + fromNode.width / 2,
          fromNode.y + fromNode.height
        );
        ctx.lineTo(
          toNode.x + toNode.width / 2,
          toNode.y
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      // Node background
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = getStatusColor(node.status);
      ctx.lineWidth = 2;
      
      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, radius);
      ctx.fill();
      ctx.stroke();

      // Status indicator
      ctx.fillStyle = getStatusColor(node.status);
      ctx.beginPath();
      ctx.arc(node.x + node.width - 12, node.y + 12, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Text
      ctx.fillStyle = '#1f2937';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Device name
      const centerX = node.x + node.width / 2;
      const centerY = node.y + node.height / 2;
      
      ctx.fillText(node.label, centerX, centerY - 10);
      
      // IP address
      if (node.ip) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(node.ip, centerX, centerY + 10);
      }
    });
  }, [nodes, edges]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Find node at position
  const getNodeAt = (x: number, y: number): CanvasNode | null => {
    return nodes.find(node => 
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    ) || null;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAt(x, y);
    if (node) {
      setDragState({
        isDragging: true,
        nodeId: node.id,
        offsetX: x - node.x,
        offsetY: y - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.nodeId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(prev => prev.map(node => {
      if (node.id === dragState.nodeId) {
        return {
          ...node,
          x: Math.max(0, Math.min(x - dragState.offsetX, canvas.width - node.width)),
          y: Math.max(0, Math.min(y - dragState.offsetY, canvas.height - node.height)),
        };
      }
      return node;
    }));
  };

  const handleMouseUp = () => {
    setDragState({ isDragging: false, nodeId: null, offsetX: 0, offsetY: 0 });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAt(x, y);
    if (node && onDirectionChange) {
      // Simple context menu
      const menu = document.createElement('div');
      menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 10000;
      `;

      const options = [
        { label: '↑ Parents', dir: 'parents' as const },
        { label: '↓ Children', dir: 'children' as const },
        { label: '↕ Both', dir: 'both' as const },
      ];

      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.style.cssText = `
          display: block;
          width: 100%;
          padding: 6px 12px;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
        `;
        btn.onmouseover = () => { btn.style.background = '#f1f5f9'; };
        btn.onmouseout = () => { btn.style.background = 'none'; };
        btn.onclick = () => {
          onDirectionChange(opt.dir, node.id);
          menu.remove();
        };
        menu.appendChild(btn);
      });

      document.body.appendChild(menu);

      const removeMenu = () => {
        menu.remove();
        document.removeEventListener('click', removeMenu);
      };
      setTimeout(() => document.addEventListener('click', removeMenu), 0);
    }
  };

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  // Redraw when data changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      style={{ minHeight: '400px' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ 
          cursor: dragState.isDragging ? 'grabbing' : 'grab',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
        }}
      />
      
      {/* Simple controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'white',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={() => {
            // Re-layout nodes
            const updatedNodes = nodes.map((node, index) => {
              const col = index % 4;
              const row = Math.floor(index / 4);
              return {
                ...node,
                x: 50 + col * 200,
                y: 50 + row * 150,
              };
            });
            setNodes(updatedNodes);
          }}
          style={{
            padding: '4px 8px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Reset Layout
        </button>
      </div>
    </div>
  );
};

export default ManualCanvas;