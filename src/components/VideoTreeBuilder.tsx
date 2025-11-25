import { useState, useRef } from 'react';
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

export default function VideoTreeBuilder() {
  const [nodes, setNodes] = useState<Record<string, VideoNode>>({
    root: {
      id: 'root',
      videoUrl: null,
      x: 400,
      y: 50,
      color: COLORS[0],
      parentId: null,
      children: [],
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

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
    const childCount = parent.children.length;
    
    const offsetX = childCount === 0 ? 0 : childCount % 2 === 0 ? -150 : 150;
    const offsetY = 180;
    
    const colorIndex = (Object.keys(nodes).length) % COLORS.length;
    const newColor = COLORS[colorIndex];

    const newNode: VideoNode = {
      id: newId,
      videoUrl: null,
      x: parent.x + offsetX * (Math.floor(childCount / 2) + 1),
      y: parent.y + offsetY,
      color: newColor,
      parentId: parentId,
      children: [],
    };

    setNodes((prev) => ({
      ...prev,
      [parentId]: { ...prev[parentId], children: [...prev[parentId].children, newId] },
      [newId]: newNode,
    }));
  };

  const calculatePath = (parent: VideoNode, child: VideoNode, siblingIndex: number, totalSiblings: number): string => {
    const startX = parent.x;
    const startY = parent.y + 70;
    const endX = child.x;
    const endY = child.y - 70;

    if (totalSiblings === 1) {
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
    }

    const curve = siblingIndex % 2 === 0 ? -50 : 50;
    const midY = (startY + endY) / 2;
    const controlX = (startX + endX) / 2 + curve;

    return `M ${startX} ${startY} L ${startX} ${midY - 30} Q ${controlX} ${midY} ${endX} ${midY + 30} L ${endX} ${endY}`;
  };

  return (
    <div className="w-full h-screen bg-background overflow-hidden relative">
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Конструктор видеоряда</h1>
        <p className="text-muted-foreground">Создавайте ветвящиеся видеоистории</p>
      </div>

      <svg className="w-full h-full absolute inset-0" style={{ pointerEvents: 'none' }}>
        <defs>
          {COLORS.map((color, idx) => (
            <linearGradient key={idx} id={`gradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            </linearGradient>
          ))}
        </defs>

        {Object.values(nodes).map((node) =>
          node.children.map((childId, idx) => {
            const child = nodes[childId];
            const colorIndex = COLORS.indexOf(child.color);
            return (
              <path
                key={`${node.id}-${childId}`}
                d={calculatePath(node, child, idx, node.children.length)}
                stroke={`url(#gradient-${colorIndex})`}
                strokeWidth="3"
                fill="none"
                className="animate-draw-line"
                strokeDasharray="1000"
                strokeDashoffset="1000"
                style={{
                  animation: 'draw-line 0.5s ease-out forwards',
                }}
              />
            );
          })
        )}
      </svg>

      <div className="relative w-full h-full">
        {Object.values(nodes).map((node) => (
          <div
            key={node.id}
            className="absolute transition-all duration-500 ease-out animate-fade-in"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {node.videoUrl ? (
              <div className="relative group">
                <video
                  src={node.videoUrl}
                  className="w-40 h-28 rounded-xl object-cover border-4 shadow-2xl hover:scale-105 transition-transform duration-300"
                  style={{ borderColor: node.color }}
                  controls
                />
                <div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all duration-300 animate-pulse-glow"
                  style={{ backgroundColor: node.color }}
                  onClick={() => addChildNode(node.id)}
                >
                  <Icon name="Plus" size={24} className="text-background" />
                </div>
              </div>
            ) : (
              <div
                className="w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-2xl gradient-border animate-pulse-glow"
                style={{ 
                  backgroundColor: `${node.color}20`,
                  borderColor: node.color 
                }}
                onClick={() => {
                  setActiveNodeId(node.id);
                  fileInputRef.current?.click();
                }}
              >
                <Icon name="Plus" size={40} style={{ color: node.color }} />
                <span className="text-sm mt-2 font-medium" style={{ color: node.color }}>
                  Загрузить видео
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

      <div className="absolute bottom-6 right-6 flex gap-3">
        <Button
          variant="outline"
          className="backdrop-blur-sm bg-background/50"
          onClick={() => {
            setNodes({
              root: {
                id: 'root',
                videoUrl: null,
                x: 400,
                y: 50,
                color: COLORS[0],
                parentId: null,
                children: [],
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
