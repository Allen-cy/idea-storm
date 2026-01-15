import { Node } from '../types';

// 计算辐射状布局
export const calculateRadialLayout = (
    parentNode: Node,
    childCount: number,
    existingNodes: Node[] = []
): { x: number; y: number }[] => {
    const positions: { x: number; y: number }[] = [];

    // 基础半径，随层级显著增加以腾出空间
    const baseRadius = 220 + (parentNode.level * 60);

    // 确定起始角度和范围
    let startAngle = 0;
    let angleRange = Math.PI * 2; // 默认 360 度

    // 如果不是根节点（有父节点），限制发散角度为扇形
    // 避免新节点生成在"回头路"上
    if (parentNode.level > 0 && parentNode.parentId) {
        const grandParent = existingNodes.find(n => n.id === parentNode.parentId);
        if (grandParent) {
            // 计算从爷爷节点到父节点的角度
            const angleFromParent = Math.atan2(parentNode.y - grandParent.y, parentNode.x - grandParent.x);

            // 以该角度为中心，向外发散 180 度
            const spreadAngle = (Math.PI / 2); // ±90度
            startAngle = angleFromParent - spreadAngle;
            angleRange = spreadAngle * 2;
        }
    }

    const angleStep = childCount > 1 ? angleRange / (childCount - 1) : 0;

    for (let i = 0; i < childCount; i++) {
        // 如果是根节点，均匀分布；如果是子节点，扇形分布
        let angle: number;
        if (parentNode.level === 0) {
            angle = startAngle + (angleRange / childCount) * i;
        } else {
            // 只有一个子节点时，直接放在中心方向
            angle = childCount === 1
                ? startAngle + angleRange / 2
                : startAngle + angleStep * i;
        }

        // 初始位置
        let pos = {
            x: parentNode.x + baseRadius * Math.cos(angle),
            y: parentNode.y + baseRadius * Math.sin(angle)
        };

        // 尝试避让重叠
        pos = adjustPositionToAvoidOverlap(pos, existingNodes);

        positions.push(pos);
        // 将新计算的位置临时加入existingNodes，避免同批次节点重叠
        existingNodes = [...existingNodes, { ...parentNode, ...pos, id: 'temp' }];
    }

    return positions;
};

// 检查节点是否重叠
export const checkOverlap = (
    pos: { x: number; y: number },
    existingNodes: Node[],
    minDistance: number = 190
): boolean => {
    return existingNodes.some(node => {
        // 忽略完全位置相同的临时占位符
        if (node.id === 'temp' && node.x === pos.x && node.y === pos.y) return false;

        const dx = node.x - pos.x;
        const dy = node.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < minDistance;
    });
};

// 调整位置以避免重叠（更进取的避让策略）
export const adjustPositionToAvoidOverlap = (
    pos: { x: number; y: number },
    existingNodes: Node[],
    maxAttempts: number = 30
): { x: number; y: number } => {
    let adjustedPos = { ...pos };
    let attempts = 0;
    let stepSize = 30; // 每次推开的步长

    while (checkOverlap(adjustedPos, existingNodes) && attempts < maxAttempts) {
        // 寻找所有重叠节点的合力方向（推开）
        let pushX = 0;
        let pushY = 0;

        existingNodes.forEach(node => {
            const dx = adjustedPos.x - node.x;
            const dy = adjustedPos.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 190 && dist > 0) {
                pushX += dx / dist;
                pushY += dy / dist;
            }
        });

        if (pushX === 0 && pushY === 0) {
            // 如果没有明显的推力方向（比如完全重合），则随机偏移
            const randAngle = Math.random() * Math.PI * 2;
            adjustedPos.x += Math.cos(randAngle) * stepSize;
            adjustedPos.y += Math.sin(randAngle) * stepSize;
        } else {
            // 沿合力方向推开
            const pushLen = Math.sqrt(pushX * pushX + pushY * pushY);
            adjustedPos.x += (pushX / pushLen) * stepSize;
            adjustedPos.y += (pushY / pushLen) * stepSize;
        }

        stepSize += 10; // 逐步加大推力
        attempts++;
    }

    return adjustedPos;
};

// 计算聚类后的布局
export const calculateClusteredLayout = (
    nodes: Node[],
    clusters: Map<string, string[]>
): Node[] => {
    const updatedNodes = [...nodes];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const clusterCount = clusters.size;

    // 聚类中心的基础距离
    const clusterRadius = 400;
    const angleStep = (Math.PI * 2) / Math.max(1, clusterCount);

    let clusterIndex = 0;
    for (const [_category, nodeIds] of clusters.entries()) {
        const angle = clusterIndex * angleStep;
        const clusterCenterX = centerX + clusterRadius * Math.cos(angle);
        const clusterCenterY = centerY + clusterRadius * Math.sin(angle);

        // 为该聚类内的节点分配位置
        const nodesInCluster = nodeIds.map(id => updatedNodes.find(n => n.id === id)).filter(Boolean) as Node[];
        const nodeCount = nodesInCluster.length;
        const innerRadius = 150; // 聚类内部的半径

        nodesInCluster.forEach((node, idx) => {
            const innerAngle = (idx * (Math.PI * 2)) / Math.max(1, nodeCount);

            // 根节点（level 0）尽量保持在中间或作为聚类的重要部分，但在这里我们简单均匀分布
            node.x = clusterCenterX + innerRadius * Math.cos(innerAngle);
            node.y = clusterCenterY + innerRadius * Math.sin(innerAngle);
        });

        clusterIndex++;
    }

    // 处理那些可能没在聚类中的节点（兜底）
    const clusteredIds = new Set(Array.from(clusters.values()).flat());
    const orphanedNodes = updatedNodes.filter(n => !clusteredIds.has(n.id));
    orphanedNodes.forEach((node, idx) => {
        // 放在外围
        const angle = (idx * (Math.PI * 2)) / Math.max(1, orphanedNodes.length);
        node.x = centerX + (clusterRadius + 300) * Math.cos(angle);
        node.y = centerY + (clusterRadius + 300) * Math.sin(angle);
    });

    return updatedNodes;
};
