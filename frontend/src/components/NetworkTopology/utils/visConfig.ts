import { Options } from 'vis-network/standalone';

export const modernColors = {
  nodes: {
    online: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: '#667eea',
      highlight: '#764ba2',
      shadow: 'rgba(102, 126, 234, 0.4)',
    },
    offline: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      border: '#f5576c',
      highlight: '#f093fb',
      shadow: 'rgba(245, 87, 108, 0.4)',
    },
    warning: {
      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      border: '#fa709a',
      highlight: '#fee140',
      shadow: 'rgba(250, 112, 154, 0.4)',
    },
    neutral: {
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      border: '#a8edea',
      highlight: '#fed6e3',
      shadow: 'rgba(168, 237, 234, 0.4)',
    },
    selected: {
      border: '#4c1d95',
      background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    },
    fixed: {
      border: '#dc2626',
      borderWidth: 4,
      icon: '🔒',
    },
  },
  edges: {
    active: '#667eea',
    inactive: '#cbd5e0',
    critical: '#f5576c',
    selected: '#4c1d95',
    highlight: '#7c3aed',
  },
  background: {
    light: '#f9fafb',
    dark: '#1f2937',
    grid: '#e5e7eb',
  },
};

export const getNetworkOptions = (
  layoutType: 'hierarchical' | 'physics' | 'grid' | 'radial' = 'physics'
): Options => {
  const baseOptions: Options = {
    nodes: {
      shape: 'box',
      borderWidth: 2,
      borderWidthSelected: 4,
      chosen: {
        node: true,
        label: true,
      },
      font: {
        size: 14,
        face: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#1f2937',
        strokeWidth: 3,
        strokeColor: '#ffffff',
      },
      margin: {
        top: 10,
        right: 15,
        bottom: 10,
        left: 15,
      },
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.2)',
        size: 15,
        x: 0,
        y: 5,
      },
      shapeProperties: {
        borderRadius: 12,
      },
      color: {
        background: '#ffffff',
        border: modernColors.nodes.neutral.border,
        highlight: {
          background: '#f3f4f6',
          border: modernColors.nodes.selected.border,
        },
      },
      widthConstraint: {
        minimum: 140,
        maximum: 200,
      },
      heightConstraint: {
        minimum: 60,
      },
    },
    edges: {
      smooth: {
        enabled: true,
        type: 'dynamic',
        roundness: 0.5,
      },
      arrows: {
        to: {
          enabled: true,
          type: 'arrow',
          scaleFactor: 0.8,
        },
      },
      color: {
        color: modernColors.edges.inactive,
        highlight: modernColors.edges.highlight,
        hover: modernColors.edges.active,
      },
      width: 2,
      hoverWidth: 3,
      selectionWidth: 4,
      font: {
        size: 12,
        color: '#6b7280',
        strokeWidth: 2,
        strokeColor: '#ffffff',
        align: 'middle',
      },
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.1)',
        size: 5,
        x: 2,
        y: 2,
      },
    },
    physics: {
      enabled: layoutType === 'physics',
      barnesHut: {
        theta: 0.5,
        gravitationalConstant: -8000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 1,
      },
      forceAtlas2Based: {
        theta: 0.5,
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springConstant: 0.08,
        springLength: 100,
        damping: 0.4,
        avoidOverlap: 1,
      },
      stabilization: {
        enabled: true,
        iterations: 200,
        updateInterval: 50,
        fit: true,
      },
      timestep: 0.5,
      adaptiveTimestep: true,
    },
    layout: {
      hierarchical: layoutType === 'hierarchical' ? {
        enabled: true,
        levelSeparation: 150,
        nodeSpacing: 200,
        treeSpacing: 250,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
        direction: 'UD',
        sortMethod: 'directed',
        shakeTowards: 'roots',
      } : {
        enabled: false,
      },
      improvedLayout: true,
      clusterThreshold: 150,
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      hideEdgesOnDrag: false,
      hideEdgesOnZoom: false,
      hideNodesOnDrag: false,
      keyboard: {
        enabled: true,
        bindToWindow: false,
        autoFocus: true,
      },
      multiselect: true,
      navigationButtons: false,
      selectable: true,
      selectConnectedEdges: true,
      zoomView: true,
      dragView: true,
      dragNodes: true,
    },
    manipulation: {
      enabled: false, // We'll handle this with custom controls
    },
    groups: {},
  };

  // Add custom group styles
  const deviceGroups = ['router', 'switch', 'server', 'firewall', 'unknown'];
  deviceGroups.forEach(group => {
    if (baseOptions.groups) {
      baseOptions.groups[group] = {
        color: {
          background: getGroupColor(group).background,
          border: getGroupColor(group).border,
        },
        font: {
          color: '#1f2937',
        },
      };
    }
  });

  return baseOptions;
};

const getGroupColor = (group: string) => {
  switch (group) {
    case 'router':
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: '#667eea',
      };
    case 'switch':
      return {
        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        border: '#06b6d4',
      };
    case 'server':
      return {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '#10b981',
      };
    case 'firewall':
      return {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '#f59e0b',
      };
    default:
      return {
        background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
        border: '#9ca3af',
      };
  }
};

// Custom node shapes with modern design
export const createCustomNode = (
  id: string,
  label: string,
  type: string,
  status: 'online' | 'offline' | 'warning',
  isFixed: boolean = false
) => {
  const colors = modernColors.nodes[status] || modernColors.nodes.neutral;
  const icon = getDeviceIcon(type);
  
  return {
    id,
    label: `${icon}\n${label}`,
    group: type.toLowerCase(),
    fixed: isFixed,
    physics: !isFixed,
    color: {
      background: '#ffffff',
      border: colors.border,
      highlight: {
        background: '#f9fafb',
        border: colors.highlight,
      },
    },
    shadow: {
      enabled: true,
      color: colors.shadow,
      size: 20,
      x: 0,
      y: 5,
    },
    borderWidth: isFixed ? 4 : 2,
    borderWidthSelected: isFixed ? 5 : 4,
    shapeProperties: {
      borderRadius: 16,
    },
    icon: isFixed ? {
      face: 'FontAwesome',
      code: '\uf023', // Lock icon
      size: 12,
      color: '#dc2626',
    } : undefined,
  };
};

const getDeviceIcon = (type: string): string => {
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('router')) return '🔀';
  if (lowerType.includes('switch')) return '🔌';
  if (lowerType.includes('server')) return '🖥️';
  if (lowerType.includes('firewall')) return '🛡️';
  if (lowerType.includes('load')) return '⚖️';
  if (lowerType.includes('storage')) return '💾';
  if (lowerType.includes('database')) return '🗄️';
  if (lowerType.includes('cloud')) return '☁️';
  if (lowerType.includes('wireless') || lowerType.includes('wifi')) return '📶';
  if (lowerType.includes('printer')) return '🖨️';
  if (lowerType.includes('phone') || lowerType.includes('voip')) return '📞';
  if (lowerType.includes('camera')) return '📹';
  
  return '📡'; // Default network device
};

export const createCustomEdge = (
  id: string,
  from: string,
  to: string,
  label?: string,
  type: 'parent' | 'child' | 'peer' = 'peer'
) => {
  const edgeColor = type === 'parent' ? modernColors.edges.critical : 
                    type === 'child' ? modernColors.edges.active : 
                    modernColors.edges.inactive;
  
  return {
    id,
    from,
    to,
    label,
    color: {
      color: edgeColor,
      highlight: modernColors.edges.highlight,
      hover: modernColors.edges.active,
    },
    width: type === 'parent' ? 3 : 2,
    smooth: {
      enabled: true,
      type: type === 'peer' ? 'curvedCW' : 'dynamic',
      roundness: 0.5,
    },
    arrows: {
      to: {
        enabled: true,
        type: 'arrow',
        scaleFactor: type === 'parent' ? 1.2 : 0.8,
      },
    },
    dashes: type === 'peer',
    font: {
      size: 11,
      color: '#6b7280',
      strokeWidth: 3,
      strokeColor: '#ffffff',
    },
  };
};