import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface VideoNode {
  id: string;
  videoUrl: string | null;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  children: string[];
  level: number;
}

const COLORS = [
  '#9b87f5',
  '#D946EF',
  '#F97316',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
];

const LEVEL_HEIGHT = 220;
const NODE_SPACING = 200;

export default function VideoTreeBuilder() {
  const [nodes, setNodes] = useState<Record<string, VideoNode>>({
    root: {
      id: 'root',
      videoUrl: null,
      x: 600,
      y: 100,
      color: COLORS[0],
      parentId: null,
      children: [],
      level: 0,
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateTreeLayout = (nodeId: string, nodesMap: Record<string, VideoNode>, startX: number, level: number): number => {
    const node = nodesMap[nodeId];
    if (!node) return startX;

    if (node.children.length === 0) {
      node.x = startX;
      node.y = 100 + level * LEVEL_HEIGHT;
      node.level = level;
      return startX + NODE_SPACING;
    }

    let currentX = startX;
    const childPositions: number[] = [];

    node.children.forEach((childId) => {
      const childEndX = calculateTreeLayout(childId, nodesMap, currentX, level + 1);
      childPositions.push((currentX + childEndX - NODE_SPACING) / 2);
      currentX = childEndX;
    });

    if (childPositions.length > 0) {
      node.x = childPositions.reduce((a, b) => a + b, 0) / childPositions.length;
    } else {
      node.x = startX;
    }
    
    node.y = 100 + level * LEVEL_HEIGHT;
    node.level = level;

    return currentX;
  };

  const recalculateLayout = (nodesMap: Record<string, VideoNode>) => {
    const updatedNodes = { ...nodesMap };
    calculateTreeLayout('root', updatedNodes, 100, 0);
    return updatedNodes;
  };

  const handleFileSelect = (nodeId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setNodes((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], videoUrl },
      }));
    }
  };

  const addChildNode = (parentId: string) => {
    const parent = nodes[parentId];
    const newId = `node-${Date.now()}`;
    
    const colorIndex = (Object.keys(nodes).length) % COLORS.length;
    const newColor = COLORS[colorIndex];

    const newNode: VideoNode = {
      id: newId,
      videoUrl: null,
      x: parent.x,
      y: parent.y + LEVEL_HEIGHT,
      color: newColor,
      parentId: parentId,
      children: [],
      level: parent.level + 1,
    };

    const updatedNodes = {
      ...nodes,
      [parentId]: { ...nodes[parentId], children: [...nodes[parentId].children, newId] },
      [newId]: newNode,
    };

    setNodes(recalculateLayout(updatedNodes));
  };

  const calculateBranchPath = (parent: VideoNode, child: VideoNode): string => {
    const startX = parent.x;
    const startY = parent.y + 80;
    const endX = child.x;
    const endY = child.y - 80;

    const midY = (startY + endY) / 2;

    if (Math.abs(endX - startX) < 10) {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    const controlY1 = startY + (midY - startY) * 0.6;
    const controlY2 = endY - (endY - midY) * 0.6;

    return `M ${startX} ${startY} 
            C ${startX} ${controlY1}, 
              ${endX} ${controlY2}, 
              ${endX} ${endY}`;
  };

  useEffect(() => {
    if (containerRef.current) {
      const maxX = Math.max(...Object.values(nodes).map(n => n.x));
      const maxY = Math.max(...Object.values(nodes).map(n => n.y));
      
      if (maxX > 0 && maxY > 0) {
        const centerX = containerRef.current.offsetWidth / 2;
        const scrollX = Math.max(0, maxX / 2 + 200 - centerX);
        containerRef.current.scrollLeft = scrollX;
      }
    }
  }, [nodes]);

  return (
    <div className="w-full h-screen bg-background overflow-auto relative" ref={containerRef}>
      <div className="absolute top-6 left-6 z-10 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border">
        <h1 className="text-3xl font-bold text-foreground mb-2">Конструктор видеоряда</h1>
        <p className="text-muted-foreground">Создавайте ветвящиеся видеоистории</p>
      </div>

      <div className="relative" style={{ 
        minWidth: '1200px', 
        minHeight: '100vh',
        width: `${Math.max(1200, Math.max(...Object.values(nodes).map(n => n.x)) + 400)}px`,
        height: `${Math.max(800, Math.max(...Object.values(nodes).map(n => n.y)) + 300)}px`
      }}>
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            {COLORS.map((color, idx) => (
              <linearGradient key={idx} id={`gradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.4 }} />
              </linearGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {Object.values(nodes).map((node) =>
            node.children.map((childId) => {
              const child = nodes[childId];
              const colorIndex = COLORS.indexOf(child.color);
              return (
                <g key={`${node.id}-${childId}`}>
                  <path
                    d={calculateBranchPath(node, child)}
                    stroke={`url(#gradient-${colorIndex})`}
                    strokeWidth="4"
                    fill="none"
                    filter="url(#glow)"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    style={{
                      animation: 'draw-line 0.8s ease-out forwards',
                    }}
                  />
                </g>
              );
            })
          )}
        </svg>

        {Object.values(nodes).map((node) => (
          <div
            key={node.id}
            className="absolute transition-all duration-700 ease-out animate-fade-in"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {node.videoUrl ? (
              <div className="relative group">
                <div className="relative">
                  <video
                    src={node.videoUrl}
                    className="w-44 h-32 rounded-2xl object-cover shadow-2xl hover:scale-105 transition-transform duration-300 border-2"
                    style={{ borderColor: node.color }}
                    controls
                  />
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ backgroundColor: node.color }}
                  />
                </div>
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:scale-125 transition-all duration-300 border-2 border-background"
                  style={{ backgroundColor: node.color }}
                  onClick={() => addChildNode(node.id)}
                >
                  <Icon name="Plus" size={20} className="text-background font-bold" />
                </div>
              </div>
            ) : (
              <div
                className="w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-2xl"
                style={{ 
                  backgroundColor: `${node.color}15`,
                  borderColor: node.color,
                  boxShadow: `0 0 40px ${node.color}40`
                }}
                onClick={() => {
                  setActiveNodeId(node.id);
                  fileInputRef.current?.click();
                }}
              >
                <Icon name="Plus" size={36} style={{ color: node.color }} />
                <span className="text-xs mt-2 font-semibold" style={{ color: node.color }}>
                  Видео
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (activeNodeId) {
            handleFileSelect(activeNodeId, e);
          }
        }}
      />

      <div className="fixed bottom-6 right-6 flex gap-3 z-20">
        <Button
          variant="outline"
          className="backdrop-blur-sm bg-background/80 border-border hover:bg-accent"
          onClick={() => {
            setNodes({
              root: {
                id: 'root',
                videoUrl: null,
                x: 600,
                y: 100,
                color: COLORS[0],
                parentId: null,
                children: [],
                level: 0,
              },
            });
          }}
        >
          <Icon name="RotateCcw" size={20} className="mr-2" />
          Сбросить
        </Button>
      </div>
    </div>
  );
}
