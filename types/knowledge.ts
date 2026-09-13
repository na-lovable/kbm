export interface OKFFrontMatter {
  type: string;
  title: string;
  description: string;
  tags?: string[];
  timestamp?: string;
  [key: string]: any;
}

export interface KnowledgeNode {
  filename: string; // e.g., 'mumbai-central-hub'
  relPath: string; // NEW: e.g., 'facilities/mumbai-central-hub' (Unique ID)
  type: string;
  metadata: OKFFrontMatter;
  rawContent: string;
}

export interface ConnectedNodeSummary {
  filename: string;
  relPath: string; // NEW: Relative path for nested linking resolution
  type: string;
  title: string;
}

export interface GraphQueryResult extends KnowledgeNode {
  connectedNodes: ConnectedNodeSummary[];
  // NEW: Expose all detected outgoing links too, so we map links in both directions
  outgoingNodes: ConnectedNodeSummary[];
}

export interface WriteOKF {
  filename: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  markdownBody: string;
  mode?: "create" | "update";
  originalFilename?: string;
}

export interface RenameOKFInput {
  oldFilename: string;
  newFilename: string;
  type?: string;
}

export interface RenameOKFResult {
  success: boolean;
  message: string;
  filename: string;
  relPath: string;
  rewrittenFiles: string[];
}

export interface DeleteOKFInput {
  filename: string;
  removeReferences?: boolean;
}

export interface PatchOKF {
  filename: string;
  title?: string;
  description?: string;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
  appendSection?: {
    heading: string;
    content: string;
  };
  replaceSection?: {
    heading: string;
    content: string;
  };
  updatedMarkdownBody?: string;
}

export interface MergeOKF {
  sourceFilenames: string[];
  targetFilename: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  markdownBody: string;
}

export interface SaveRawOKFInput {
  filename: string;
  rawContent: string;
  relPath?: string;
  mode?: "create" | "update";
  originalFilename?: string;
}

export interface SaveOKFResult {
  success: boolean;
  message: string;
  filename: string;
  relPath: string;
}

