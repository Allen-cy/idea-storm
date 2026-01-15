// 节点数据结构
export interface Node {
    id: string;
    text: string;
    x: number;
    y: number;
    isSelected: boolean;
    level: number; // 0: 中心词, 1+: 子级
    parentId?: string;
    fillColor?: string;
}

// 连线数据结构
export interface Connection {
    from: string;
    to: string;
}

// 历史记录结构
export interface HistoryEntry {
    id: string;
    timestamp: number;
    rootText: string;
    nodes: Node[];
    connections: Connection[];
}
