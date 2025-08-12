import { SpreadsheetCommand } from '@/types';

export function parseCommand(input: string): SpreadsheetCommand | null {
  const normalizedInput = input.toLowerCase().trim();
  
  // Set cell value: "set A1 to 100", "A1 = 100", "put 'hello' in B2"
  const setCellMatch = normalizedInput.match(/(?:set\s+|put\s+['"]?(.+?)['"]?\s+in\s+)?([a-z]+\d+)(?:\s+to\s+|\s*=\s*)(.+)/);
  if (setCellMatch) {
    const cell = setCellMatch[2]?.toUpperCase() || setCellMatch[1]?.toUpperCase();
    const value = setCellMatch[3] || setCellMatch[1];
    const numValue = parseFloat(value.replace(/['"]/g, ''));
    
    if (cell && value) {
      return {
        type: 'set_value',
        cell,
        value: isNaN(numValue) ? value.replace(/['"]/g, '') : numValue
      };
    }
  }
  
  // Alternative set pattern: "put 'hello' in B2"
  const putMatch = normalizedInput.match(/put\s+['"]?(.+?)['"]?\s+in\s+([a-z]+\d+)/);
  if (putMatch) {
    return {
      type: 'set_value',
      cell: putMatch[2].toUpperCase(),
      value: putMatch[1].replace(/['"]/g, '')
    };
  }
  
  // Delete/Clear cell: "delete A1", "clear A1", "empty B2"
  const deleteCellMatch = normalizedInput.match(/(?:delete|clear|empty)\s+(?:cell\s+)?([a-z]+\d+)/);
  if (deleteCellMatch) {
    return {
      type: 'delete_cell',
      cell: deleteCellMatch[1].toUpperCase()
    };
  }
  
  // Add row: "add row", "insert row", "add new row"
  if (normalizedInput.match(/(?:add|insert)(?:\s+new)?\s+row/)) {
    return {
      type: 'add_row'
    };
  }
  
  // Add column: "add column", "insert column", "add new column"
  if (normalizedInput.match(/(?:add|insert)(?:\s+new)?\s+column/)) {
    return {
      type: 'add_column'
    };
  }
  
  // Calculate sum: "sum A1:A10", "calculate sum of A1:A10", "add up A1 to A10"
  const sumMatch = normalizedInput.match(/(?:calculate\s+)?(?:sum|add\s+up)(?:\s+of)?\s+([a-z]+\d+)(?:\s*:\s*|\s+to\s+)([a-z]+\d+)/);
  if (sumMatch) {
    const range = `${sumMatch[1].toUpperCase()}:${sumMatch[2].toUpperCase()}`;
    return {
      type: 'calculate',
      range,
      formula: `SUM(${range})`
    };
  }
  
  // Calculate average: "average A1:A10", "calculate average of A1:A10"
  const avgMatch = normalizedInput.match(/(?:calculate\s+)?average(?:\s+of)?\s+([a-z]+\d+)(?:\s*:\s*|\s+to\s+)([a-z]+\d+)/);
  if (avgMatch) {
    const range = `${avgMatch[1].toUpperCase()}:${avgMatch[2].toUpperCase()}`;
    return {
      type: 'calculate',
      range,
      formula: `AVERAGE(${range})`
    };
  }
  
  // Count cells: "count A1:A10", "count cells in A1:A10"
  const countMatch = normalizedInput.match(/count(?:\s+cells)?(?:\s+in)?\s+([a-z]+\d+)(?:\s*:\s*|\s+to\s+)([a-z]+\d+)/);
  if (countMatch) {
    const range = `${countMatch[1].toUpperCase()}:${countMatch[2].toUpperCase()}`;
    return {
      type: 'calculate',
      range,
      formula: `COUNT(${range})`
    };
  }
  
  // Sort: "sort by column A", "sort column A ascending", "sort A1:A10 by column B"
  const sortMatch = normalizedInput.match(/sort(?:\s+(?:by\s+)?column\s+([a-z]+)|(?:\s+([a-z]+\d+:[a-z]+\d+))?\s+by\s+column\s+([a-z]+))/);
  if (sortMatch) {
    const column = sortMatch[1] || sortMatch[3];
    const range = sortMatch[2];
    return {
      type: 'sort',
      range: column?.toUpperCase() || range?.toUpperCase(),
      value: normalizedInput.includes('descending') ? 'desc' : 'asc'
    };
  }
  
  // Filter: "filter column A equals 100", "show only rows where B equals 'text'"
  const filterMatch = normalizedInput.match(/(?:filter\s+column\s+([a-z]+)|show\s+only\s+rows\s+where\s+([a-z]+))\s+equals?\s+['"]?(.+?)['"]?$/);
  if (filterMatch) {
    const column = filterMatch[1] || filterMatch[2];
    const value = filterMatch[3];
    return {
      type: 'filter',
      range: column.toUpperCase(),
      value: value.replace(/['"]/g, '')
    };
  }
    // Format cells: "make A1 bold", "format A1:A10 as currency", "bold A1"
  const formatMatch = normalizedInput.match(/(?:make\s+([a-z]+\d+(?::[a-z]+\d+)?)\s+(bold|italic|underline)|format\s+([a-z]+\d+(?::[a-z]+\d+)?)\s+as\s+(currency|percentage|date)|(bold|italic|underline)\s+([a-z]+\d+(?::[a-z]+\d+)?))/);
  if (formatMatch) {
    const range = formatMatch[1] || formatMatch[3] || formatMatch[6];
    const format = formatMatch[2] || formatMatch[4] || formatMatch[5];
    return {
      type: 'format',
      range: range.toUpperCase(),
      value: format
    };
  }

  // Create charts: "chart A1:B10", "make a chart from A1 to B10"
  const chartMatch = normalizedInput.match(/(?:chart|make\s+a?\s*chart\s+from)\s+([a-z]+\d+)(?:\s*:\s*|\s+to\s+)([a-z]+\d+)/);
  if (chartMatch) {
    const range = `${chartMatch[1].toUpperCase()}:${chartMatch[2].toUpperCase()}`;
    return {
      type: 'chart',
      range,
      value: 'column' // default chart type
    };
  }

  // Find and replace: "replace 'old' with 'new' in A1:B10"
  const replaceMatch = normalizedInput.match(/replace\s+['"](.+?)['"]?\s+with\s+['"](.+?)['"]?(?:\s+in\s+([a-z]+\d+:[a-z]+\d+))?/);
  if (replaceMatch) {
    return {
      type: 'replace',
      value: replaceMatch[1],
      formula: replaceMatch[2],
      range: replaceMatch[3]?.toUpperCase() || 'ALL'
    };
  }
  
  // Copy/Move operations: "copy A1 to B1", "move A1:A10 to C1"
  const copyMatch = normalizedInput.match(/(copy|move)\s+([a-z]+\d+(?::[a-z]+\d+)?)\s+to\s+([a-z]+\d+)/);
  if (copyMatch) {
    return {
      type: copyMatch[1] === 'copy' ? 'copy' : 'move',
      range: copyMatch[2].toUpperCase(),
      cell: copyMatch[3].toUpperCase()
    };
  }
  
  // Formula input: '=A1+B1', '=SUM(A1:A10)', etc.
  if (input.trim().startsWith('=')) {
    return {
      type: 'set_value',
      cell: undefined, // Will be set by the handler to the selected cell
      value: input.trim(),
    };
  }
  
  return null;
}
