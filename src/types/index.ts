// 节点类型
export type NodeType = 'default' | 'note';

// 节点数据结构
export interface Node {
    id: string;
    text: string;
    type?: NodeType;
    content?: string; // 笔记详细内容 (Markdown)
    x: number;
    y: number;
    width?: number; // 针对卡片节点
    height?: number; // 针对卡片节点
    isSelected: boolean;
    level: number; // 0: 中心词, 1+: 子级
    parentId?: string;
    fillColor?: string;
}

// 连线数据结构
export interface Connection {
    id?: string;
    from: string;
    to: string;
    label?: string; // 关系描述
    isManual?: boolean; // 是否是手动创建的逻辑连线
}

// 容器/组数据结构
export interface Frame {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    nodeIds: string[];
    fillColor?: string;
}

// 历史记录结构
export interface HistoryEntry {
    id: string;
    timestamp: number;
    rootText: string;
    nodes: Node[];
    connections: Connection[];
    frames?: Frame[];
}
