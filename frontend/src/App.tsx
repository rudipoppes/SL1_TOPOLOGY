import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Test data - hardcoded for initial test
const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 250, y: 50 },
    data: { label: 'Kubernetes Cluster' },
  },
  {
    id: '2',
    position: { x: 100, y: 200 },
    data: { label: 'worker-3' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    style: { stroke: '#FF0000', strokeWidth: 5 },
  },
];

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <h1 style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        FRESH React Flow Test
      </h1>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
}

export default App;