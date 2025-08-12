export interface CellData {
  id: string;
  value: string | number;
  formula?: string;
  type: 'text' | 'number' | 'formula';
}

export interface SheetData {
  id: string;
  name: string;
  cells: { [key: string]: CellData };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  command?: SpreadsheetCommand;
}

export interface SpreadsheetCommand {
  type: 'set_value' | 'delete_cell' | 'add_row' | 'add_column' | 'calculate' | 'filter' | 'sort' | 'format' | 'copy' | 'move' | 'chart' | 'replace';
  cell?: string;
  value?: string | number;
  range?: string;
  formula?: string;
}
