export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'super_admin' | 'director' | 'manager' | 'compliance' | 'assistant';
