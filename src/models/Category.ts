export interface Category {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
}

// Helper function to convert flat categories to tree structure
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map: Record<string, CategoryTreeNode> = {};
  const roots: CategoryTreeNode[] = [];
  
  // Create a map of all categories
  categories.forEach(category => {
    map[category.id] = { ...category, children: [] };
  });
  
  // Build the tree
  categories.forEach(category => {
    const node = map[category.id];
    
    if (category.parentId) {
      const parent = map[category.parentId];
      if (parent) {
        parent.children?.push(node);
      } else {
        // If parent doesn't exist, add as root
        roots.push(node);
      }
    } else {
      // No parent, add as root
      roots.push(node);
    }
  });
  
  return roots;
}