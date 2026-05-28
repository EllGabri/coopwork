export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Card {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description?: string;
  color?: string;
  priority: CardPriority;
  due_date?: string;
  position: number;
  assignee_ids: string[];
  tags: string[];
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  color?: string;
  position: number;
  wip_limit?: number;
  cards?: Card[];
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  board_columns?: Column[];
}

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  boards?: Board[];
}
