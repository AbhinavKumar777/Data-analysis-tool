'use client';

import { useState, useEffect, useCallback } from 'react';
import { CellData, SpreadsheetCommand } from '@/types';
import { Plus, Download, Upload, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SpreadsheetProps {
  onDataChange: (data: { [key: string]: CellData }) => void;
  executeCommand: SpreadsheetCommand | null;
  onCellSelect: (cellRef: string) => void;
  selectedCell: string;
  data?: { [key: string]: CellData };
}

export default function Spreadsheet({ onDataChange, executeCommand, onCellSelect, selectedCell, data: externalData }: SpreadsheetProps) {
  const [data, setData] = useState<{ [key: string]: CellData }>(externalData || {});
  const [rows, setRows] = useState(1000);
  const [cols, setCols] = useState(1000);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    cellRef: string;
  }>({ visible: false, x: 0, y: 0, cellRef: '' });

  // Constants for virtualization
  const CELL_WIDTH = 80;
  const CELL_HEIGHT = 24;
  const HEADER_HEIGHT = 24;

  // Generate column letters (A, B, C, ... Z, AA, AB, etc.)
  const getColumnLetter = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  // Parse cell reference
  const parseCellRef = (cellRef: string): { col: number; row: number } | null => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const colStr = match[1];
    const rowNum = parseInt(match[2]) - 1;
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1;
    
    return { col, row: rowNum };
  };
  // Get cell reference from row/col
  const getCellRef = (col: number, row: number): string => {
    return `${getColumnLetter(col)}${row + 1}`;
  };

  // Calculate visible range for virtualization
  const getVisibleRange = () => {
    const startCol = Math.max(0, Math.floor(scrollPosition.x / CELL_WIDTH));
    const endCol = Math.min(cols - 1, startCol + Math.ceil(viewportSize.width / CELL_WIDTH) + 1);
    const startRow = Math.max(0, Math.floor(scrollPosition.y / CELL_HEIGHT));
    const endRow = Math.min(rows - 1, startRow + Math.ceil(viewportSize.height / CELL_HEIGHT) + 1);
    
    return { startCol, endCol, startRow, endRow };
  };// Execute spreadsheet commands
  const executeSpreadsheetCommand = useCallback((command: SpreadsheetCommand) => {
    setData(prevData => {
      const newData = { ...prevData };
      
      switch (command.type) {
        case 'set_value':
          if (command.cell && command.value !== undefined) {
            const cellId = command.cell.toUpperCase();
            newData[cellId] = {
              id: cellId,
              value: command.value,
              type: typeof command.value === 'number' ? 'number' : 'text'
            };
            toast.success(`Set ${cellId} to ${command.value}`);
          }
          break;
          
        case 'delete_cell':
          if (command.cell) {
            const cellId = command.cell.toUpperCase();
            delete newData[cellId];
            toast.success(`Deleted ${cellId}`);
          }
          break;
          
        case 'add_row':
          setRows(prev => prev + 1);
          toast.success('Added new row');
          break;
          
        case 'add_column':
          setCols(prev => prev + 1);
          toast.success('Added new column');
          break;
            case 'calculate':
          if (command.range) {
            const result = calculateRange(command.range, newData, command.formula);
            toast.success(`Calculation result: ${result}`);
          }
          break;case 'format':
          if (command.range && command.value) {
            applyFormatting(command.range, String(command.value), newData);
            toast.success(`Applied ${command.value} formatting`);
          }
          break;

        case 'copy':
          if (command.range && command.cell) {
            copyRange(command.range, command.cell, newData);
            toast.success(`Copied ${command.range} to ${command.cell}`);
          }
          break;        case 'move':
          if (command.range && command.cell) {
            moveRange(command.range, command.cell, newData);
            toast.success(`Moved ${command.range} to ${command.cell}`);
          }
          break;

        case 'chart':
          if (command.range) {
            toast.success(`Chart creation for ${command.range} - Feature coming soon!`);
          }
          break;        case 'replace':
          if (command.value && command.formula) {
            const count = replaceInRange(String(command.value), String(command.formula), command.range || 'ALL', newData);
            toast.success(`Replaced ${count} occurrences`);
          }
          break;
            default:
          toast.error('Command not implemented yet');
      }
      
      // Notify parent of data changes
      onDataChange(newData);
      
      return newData;
    });
  }, [onDataChange]);
  // Calculate range with different formulas
  const calculateRange = (range: string, cellData: { [key: string]: CellData }, formula?: string): number => {
    const [start, end] = range.split(':');
    const startCell = parseCellRef(start);
    const endCell = parseCellRef(end);
    
    if (!startCell || !endCell) return 0;
    
    const values: number[] = [];
    for (let row = startCell.row; row <= endCell.row; row++) {
      for (let col = startCell.col; col <= endCell.col; col++) {
        const cellRef = getCellRef(col, row);
        const cell = cellData[cellRef];
        if (cell && typeof cell.value === 'number') {
          values.push(cell.value);
        }
      }
    }
    
    if (formula?.includes('AVERAGE')) {
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else if (formula?.includes('COUNT')) {
      return values.length;
    } else {
      // Default to SUM
      return values.reduce((a, b) => a + b, 0);
    }
  };

  // Apply formatting to range
  const applyFormatting = (range: string, format: string, cellData: { [key: string]: CellData }) => {
    // This would be expanded to handle actual cell formatting
    // For now, just log the formatting request
    console.log(`Applying ${format} to ${range}`);
  };

  // Copy range to destination
  const copyRange = (sourceRange: string, destination: string, cellData: { [key: string]: CellData }) => {
    const [start, end] = sourceRange.includes(':') ? sourceRange.split(':') : [sourceRange, sourceRange];
    const startCell = parseCellRef(start);
    const endCell = parseCellRef(end || start);
    const destCell = parseCellRef(destination);
    
    if (!startCell || !endCell || !destCell) return;
    
    for (let row = startCell.row; row <= endCell.row; row++) {
      for (let col = startCell.col; col <= endCell.col; col++) {
        const sourceRef = getCellRef(col, row);
        const destRef = getCellRef(destCell.col + (col - startCell.col), destCell.row + (row - startCell.row));
        
        if (cellData[sourceRef]) {
          cellData[destRef] = { ...cellData[sourceRef], id: destRef };
        }
      }
    }
  };
  // Move range to destination
  const moveRange = (sourceRange: string, destination: string, cellData: { [key: string]: CellData }) => {
    copyRange(sourceRange, destination, cellData);
    
    // Clear source cells
    const [start, end] = sourceRange.includes(':') ? sourceRange.split(':') : [sourceRange, sourceRange];
    const startCell = parseCellRef(start);
    const endCell = parseCellRef(end || start);
    
    if (!startCell || !endCell) return;
    
    for (let row = startCell.row; row <= endCell.row; row++) {
      for (let col = startCell.col; col <= endCell.col; col++) {
        const sourceRef = getCellRef(col, row);
        delete cellData[sourceRef];
      }
    }
  };

  // Replace text in range
  const replaceInRange = (oldText: string, newText: string, range: string, cellData: { [key: string]: CellData }): number => {
    let count = 0;
    
    if (range === 'ALL') {
      // Replace in all cells
      Object.keys(cellData).forEach(cellRef => {
        const cell = cellData[cellRef];
        if (cell && typeof cell.value === 'string' && cell.value.includes(oldText)) {
          cell.value = cell.value.replace(new RegExp(oldText, 'g'), newText);
          count++;
        }
      });
    } else {
      // Replace in specific range
      const [start, end] = range.split(':');
      const startCell = parseCellRef(start);
      const endCell = parseCellRef(end);
      
      if (startCell && endCell) {
        for (let row = startCell.row; row <= endCell.row; row++) {
          for (let col = startCell.col; col <= endCell.col; col++) {
            const cellRef = getCellRef(col, row);
            const cell = cellData[cellRef];
            if (cell && typeof cell.value === 'string' && cell.value.includes(oldText)) {
              cell.value = cell.value.replace(new RegExp(oldText, 'g'), newText);
              count++;
            }
          }
        }
      }
    }
    
    return count;
  };
  // Helper to evaluate a formula string
  function evaluateFormula(formula: string, data: { [key: string]: CellData }): number | string {
    try {
      // Remove '='
      let expr = formula.slice(1).toUpperCase();
      // Replace cell refs with their values
      expr = expr.replace(/([A-Z]+\d+)/g, (ref) => {
        const cell = data[ref];
        if (!cell) return '0';
        if (typeof cell.value === 'number') return cell.value.toString();
        if (!isNaN(Number(cell.value))) return cell.value;
        return '0';
      });
      // Support SUM, AVERAGE, COUNT
      if (/SUM\(/.test(expr)) {
        const match = expr.match(/SUM\(([^)]+)\)/);
        if (match) {
          const [start, end] = match[1].split(':');
          const startCell = start.trim();
          const endCell = end.trim();
          // Get all cell refs in range
          const refs = [];
          const parse = (ref: string) => {
            const m = ref.match(/^([A-Z]+)(\d+)$/);
            if (!m) return null;
            return { col: m[1], row: parseInt(m[2], 10) };
          };
          const s = parse(startCell);
          const e = parse(endCell);
          if (s && e) {
            for (let r = s.row; r <= e.row; r++) {
              for (let c = s.col.charCodeAt(0); c <= e.col.charCodeAt(0); c++) {
                refs.push(String.fromCharCode(c) + r);
              }
            }
          }
          let sum = 0;
          refs.forEach(ref => {
            const v = Number(data[ref]?.value);
            if (!isNaN(v)) sum += v;
          });
          return sum;
        }
      }
      if (/AVERAGE\(/.test(expr)) {
        const match = expr.match(/AVERAGE\(([^)]+)\)/);
        if (match) {
          const [start, end] = match[1].split(':');
          const startCell = start.trim();
          const endCell = end.trim();
          const refs = [];
          const parse = (ref: string) => {
            const m = ref.match(/^([A-Z]+)(\d+)$/);
            if (!m) return null;
            return { col: m[1], row: parseInt(m[2], 10) };
          };
          const s = parse(startCell);
          const e = parse(endCell);
          if (s && e) {
            for (let r = s.row; r <= e.row; r++) {
              for (let c = s.col.charCodeAt(0); c <= e.col.charCodeAt(0); c++) {
                refs.push(String.fromCharCode(c) + r);
              }
            }
          }
          let sum = 0, count = 0;
          refs.forEach(ref => {
            const v = Number(data[ref]?.value);
            if (!isNaN(v)) { sum += v; count++; }
          });
          return count ? sum / count : 0;
        }
      }
      if (/COUNT\(/.test(expr)) {
        const match = expr.match(/COUNT\(([^)]+)\)/);
        if (match) {
          const [start, end] = match[1].split(':');
          const startCell = start.trim();
          const endCell = end.trim();
          const refs = [];
          const parse = (ref: string) => {
            const m = ref.match(/^([A-Z]+)(\d+)$/);
            if (!m) return null;
            return { col: m[1], row: parseInt(m[2], 10) };
          };
          const s = parse(startCell);
          const e = parse(endCell);
          if (s && e) {
            for (let r = s.row; r <= e.row; r++) {
              for (let c = s.col.charCodeAt(0); c <= e.col.charCodeAt(0); c++) {
                refs.push(String.fromCharCode(c) + r);
              }
            }
          }
          let count = 0;
          refs.forEach(ref => {
            const v = data[ref]?.value;
            if (v !== undefined && v !== '') count++;
          });
          return count;
        }
      }
      // Basic math
      // eslint-disable-next-line no-eval
      return Function('return ' + expr)();
    } catch {
      return '#ERROR';
    }
  }  // Synchronize with external data and handle formula evaluation
  useEffect(() => {
    if (externalData) {
      // Process external data and evaluate any formulas
      const processedData: { [key: string]: CellData } = {};
      
      Object.entries(externalData).forEach(([cellRef, cellData]) => {
        if (cellData.type === 'formula' && cellData.formula) {
          // Re-evaluate the formula with current data context
          const evaluatedValue = evaluateFormula(cellData.formula, externalData);
          processedData[cellRef] = {
            ...cellData,
            value: evaluatedValue
          };
        } else {
          processedData[cellRef] = cellData;
        }
      });
      
      setData(processedData);
    }
  }, [externalData]);

  // Auto-focus the spreadsheet on mount
  useEffect(() => {
    const spreadsheetElement = document.querySelector('[data-spreadsheet]');
    if (spreadsheetElement) {
      (spreadsheetElement as HTMLElement).focus();
    }
  }, []);
  // Execute command when it changes
  useEffect(() => {
    if (executeCommand) {
      executeSpreadsheetCommand(executeCommand);
    }
  }, [executeCommand, executeSpreadsheetCommand]);const handleCellChange = (cellRef: string, value: string) => {
    const cellId = cellRef.toUpperCase();
    
    // Check if it's a formula
    if (value.startsWith('=')) {
      const evaluatedValue = evaluateFormula(value, data);
      const newData = {
        ...data,
        [cellId]: {
          id: cellId,
          value: evaluatedValue,
          formula: value,
          type: typeof evaluatedValue === 'number' ? 'number' as const : 'text' as const
        }
      };
      setData(newData);
      onDataChange(newData); // Notify parent immediately
    } else {
      const newData = {
        ...data,
        [cellId]: {
          id: cellId,
          value: value === '' ? '' : (isNaN(Number(value)) ? value : Number(value)),
          type: value === '' ? 'text' as const : (isNaN(Number(value)) ? 'text' as const : 'number' as const)
        }
      };
      setData(newData);
      onDataChange(newData); // Notify parent immediately
    }
  };  const handleCellClick = (cellRef: string) => {
    onCellSelect(cellRef);
    setEditingCell(null); // Stop any current editing
    setTempValue(''); // Clear temp value
  };

  const handleCellDoubleClick = (cellRef: string) => {
    setEditingCell(cellRef);
    // If cell has a formula, show the formula; otherwise show the value
    const cell = data[cellRef];
    setTempValue(cell?.formula || cell?.value?.toString() || '');
  };

  const handleCellBlur = (cellRef: string) => {
    if (editingCell === cellRef) {
      handleCellChange(cellRef, tempValue);
      setEditingCell(null);
      setTempValue('');
    }
  };

  const handleInputChange = (value: string) => {
    setTempValue(value);
  };
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentCell = parseCellRef(selectedCell);
    if (!currentCell) return;

    // If we're editing a cell, handle typing
    if (editingCell === selectedCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCellBlur(selectedCell);
        if (currentCell.row < rows - 1) {
          const newCell = getCellRef(currentCell.col, currentCell.row + 1);
          onCellSelect(newCell);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditingCell(null);
        setTempValue('');
        return;
      }
      // Let normal typing continue for input field
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentCell.row > 0) {
          const newCell = getCellRef(currentCell.col, currentCell.row - 1);
          onCellSelect(newCell);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentCell.row < rows - 1) {
          const newCell = getCellRef(currentCell.col, currentCell.row + 1);
          onCellSelect(newCell);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (currentCell.col > 0) {
          const newCell = getCellRef(currentCell.col - 1, currentCell.row);
          onCellSelect(newCell);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentCell.col < cols - 1) {
          const newCell = getCellRef(currentCell.col + 1, currentCell.row);
          onCellSelect(newCell);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        handleCellChange(selectedCell, '');
        break;      case 'Enter':
        e.preventDefault();
        setEditingCell(selectedCell);
        const enterCell = data[selectedCell];
        setTempValue(enterCell?.formula || enterCell?.value?.toString() || '');
        break;
      case 'Tab':
        e.preventDefault();
        if (currentCell.col < cols - 1) {
          const newCell = getCellRef(currentCell.col + 1, currentCell.row);
          onCellSelect(newCell);
        }
        break;
      case 'F2':
        e.preventDefault();
        setEditingCell(selectedCell);
        const f2Cell = data[selectedCell];
        setTempValue(f2Cell?.formula || f2Cell?.value?.toString() || '');
        break;
      default:
        // Start editing on any printable character
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setEditingCell(selectedCell);
          setTempValue(e.key);
        }
        break;
    }
  }, [selectedCell, onCellSelect, rows, cols, editingCell, data]);

  const handleRightClick = useCallback((e: React.MouseEvent, cellRef: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      cellRef
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, cellRef: '' });
  }, []);

  const exportToCSV = () => {
    let csv = '';
    
    // Header row
    for (let col = 0; col < cols; col++) {
      csv += getColumnLetter(col);
      if (col < cols - 1) csv += ',';
    }
    csv += '\n';
    
    // Data rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellRef = getCellRef(col, row);
        const cell = data[cellRef];
        csv += cell ? cell.value : '';
        if (col < cols - 1) csv += ',';
      }
      csv += '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spreadsheet.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Exported to CSV');
  };  return (
    <div 
      className="flex flex-col h-full bg-white" 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
      style={{ outline: 'none' }}
      data-spreadsheet
      onClick={(e) => {
        // Focus the spreadsheet when clicked
        if (e.currentTarget === e.target || e.target instanceof HTMLDivElement) {
          e.currentTarget.focus();
        }
      }}
    >
      {/* Virtualized Spreadsheet Grid */}
      <div 
        className="flex-1 overflow-auto relative"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          setScrollPosition({
            x: target.scrollLeft,
            y: target.scrollTop
          });
        }}
        ref={(el) => {
          if (el) {
            setViewportSize({
              width: el.clientWidth,
              height: el.clientHeight
            });
          }
        }}
      >
        {/* Virtual container with full size */}
        <div 
          style={{ 
            width: cols * CELL_WIDTH + 60,
            height: rows * CELL_HEIGHT + HEADER_HEIGHT,
            position: 'relative'
          }}
        >
          {/* Fixed corner */}
          <div 
            className="sticky top-0 left-0 z-30 bg-gray-100 border-b border-r border-gray-300 flex items-center justify-center text-xs font-medium"
            style={{ width: 60, height: HEADER_HEIGHT }}
          />
          
          {/* Column Headers */}
          <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300" style={{ marginLeft: 60 }}>
            {(() => {
              const { startCol, endCol } = getVisibleRange();
              const visibleCols = [];
              for (let col = startCol; col <= endCol; col++) {
                visibleCols.push(
                  <div
                    key={col}
                    className="absolute border-r border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer bg-gray-100"
                    style={{
                      left: col * CELL_WIDTH,
                      width: CELL_WIDTH,
                      height: HEADER_HEIGHT,
                      top: 0
                    }}
                  >
                    {getColumnLetter(col)}
                  </div>
                );
              }
              return visibleCols;
            })()}
          </div>

          {/* Row Headers and Cells */}
          {(() => {
            const { startCol, endCol, startRow, endRow } = getVisibleRange();
            const visibleElements = [];
            
            // Row headers
            for (let row = startRow; row <= endRow; row++) {
              visibleElements.push(
                <div
                  key={`row-${row}`}
                  className="absolute z-10 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer"
                  style={{
                    left: 0,
                    top: HEADER_HEIGHT + row * CELL_HEIGHT,
                    width: 60,
                    height: CELL_HEIGHT
                  }}
                >
                  {row + 1}
                </div>
              );
            }

            // Cells
            for (let row = startRow; row <= endRow; row++) {
              for (let col = startCol; col <= endCol; col++) {
                const cellRef = getCellRef(col, row);
                const cell = data[cellRef];
                const isSelected = selectedCell === cellRef;
                const isEditing = editingCell === cellRef;

                visibleElements.push(
                  <div
                    key={cellRef}
                    className={`absolute border-r border-b border-gray-300 ${
                      isSelected ? 'bg-blue-100 z-20' : 'bg-white'
                    }`}
                    style={{
                      left: 60 + col * CELL_WIDTH,
                      top: HEADER_HEIGHT + row * CELL_HEIGHT,
                      width: CELL_WIDTH,
                      height: CELL_HEIGHT
                    }}
                    onClick={() => handleCellClick(cellRef)}
                    onDoubleClick={() => handleCellDoubleClick(cellRef)}
                    onContextMenu={(e) => handleRightClick(e, cellRef)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={() => handleCellBlur(cellRef)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCellBlur(cellRef);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setTempValue('');
                          }
                        }}
                        className="w-full h-full px-1 text-xs border-none outline-none bg-white"
                        style={{ 
                          fontFamily: 'Calibri, Arial, sans-serif',
                          fontSize: '11px'
                        }}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="w-full h-full px-1 text-xs flex items-center cursor-cell overflow-hidden"
                        style={{ fontFamily: 'Calibri, Arial, sans-serif', fontSize: '11px' }}
                      >
                        {cell?.formula 
                          ? (typeof cell.value === 'string' && cell.value === '#ERROR' ? '#ERROR' : cell.value)
                          : cell?.value || ''}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 cursor-se-resize"></div>
                    )}
                  </div>
                );
              }
            }
            
            return visibleElements;
          })()}
        </div>
      </div>      {/* Excel-style Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-1 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>Ready</span>
          {selectedCell && (
            <span>Cell: {selectedCell} | Value: {data[selectedCell]?.value || 'Empty'}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>1000 rows × 1000 columns</span>
          <span>Sheet1 of 1</span>
          <span>100%</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.writeText(data[contextMenu.cellRef]?.value?.toString() || '');
                toast.success('Copied to clipboard');
                handleCloseContextMenu();
              }}
            >
              Copy
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.readText().then(text => {
                  handleCellChange(contextMenu.cellRef, text);
                  toast.success('Pasted from clipboard');
                });
                handleCloseContextMenu();
              }}
            >
              Paste
            </button>
            <hr className="my-1" />
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
              onClick={() => {
                handleCellChange(contextMenu.cellRef, '');
                toast.success('Cell cleared');
                handleCloseContextMenu();
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
