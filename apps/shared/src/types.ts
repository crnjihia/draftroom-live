export type University = 'USIU' | 'UoN' | 'Strathmore' | 'Other';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  university?: University;
}

export type CollaboratorRole = 'editor' | 'commenter' | 'viewer';

export interface CollaboratorInfo {
  userId: string;
  documentId: string;
  role: CollaboratorRole;
  user?: UserProfile;
}

export interface DocumentInfo {
  id: string;
  title: string;
  ownerId: string;
  courseCode?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  owner?: UserProfile;
  collaborators?: CollaboratorInfo[];
}

export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  university?: string;
}

export interface AwarenessCursor {
  index: number;
  length: number;
}

export interface AwarenessState {
  user: AwarenessUser;
  cursor?: AwarenessCursor | null;
  typing?: boolean;
  lastActive?: number;
}

export interface CommentData {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  user?: UserProfile;
}

export interface CommentThreadData {
  id: string;
  documentId: string;
  anchorYjsId: string; // JSON-serialized encoded RelativePosition
  resolved: boolean;
  createdAt: string | Date;
  comments: CommentData[];
}

export interface NamedVersionData {
  id: string;
  documentId: string;
  name: string;
  createdBy: string;
  createdAt: string | Date;
  ydocState?: string; // base64 encoded for API
}

export interface DocumentSnapshotData {
  id: string;
  documentId: string;
  createdAt: string | Date;
  ydocState?: string;
}
