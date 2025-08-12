'use client';

import { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import Chatbot from '@/components/Chatbot';
import Spreadsheet from '@/components/Spreadsheet';
import SheetManager from '@/components/SheetManager';
import { CellData, SpreadsheetCommand } from '@/types';
import { FirebaseService } from '@/services/firebaseService';

export default function Home() {
  const [currentCommand, setCurrentCommand] = useState<SpreadsheetCommand | null>(null);
  const [sheetData, setSheetData] = useState<{ [key: string]: CellData }>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [formulaBar, setFormulaBar] = useState<string>('');
  const [activeSheetId, setActiveSheetId] = useState<string>('sheet1');
  const firebaseService = FirebaseService.getInstance();

  const handleCommand = useCallback((command: SpreadsheetCommand) => {
    // If it's a formula (cell undefined, value starts with '=')
    if (!command.cell && typeof command.value === 'string' && command.value.startsWith('=')) {
      const formulaValue = command.value;
      setSheetData(prev => ({
        ...prev,
        [selectedCell]: {
          id: selectedCell,
          value: formulaValue,
          type: 'formula' as const,
          formula: formulaValue
        } as CellData
      }));
      setTimeout(() => setCurrentCommand(null), 100);
      return;
    }
    setCurrentCommand(command);
    setTimeout(() => setCurrentCommand(null), 100);
  }, [selectedCell]);

  const handleDataChange = useCallback(async (data: { [key: string]: CellData }) => {
    setSheetData(data);
  }, []);

  const handleCellSelect = useCallback((cellRef: string) => {
    setSelectedCell(cellRef);
    const cell = sheetData[cellRef];
    // Show formula if it exists, otherwise show the display value
    setFormulaBar(cell?.formula || cell?.value?.toString() || '');
  }, [sheetData]);

  const handleFormulaBarChange = useCallback((value: string) => {
    setFormulaBar(value);
  }, []);

  const handleFormulaBarEnter = useCallback(() => {
    // Update the selected cell with the formula bar value
    if (formulaBar.startsWith('=')) {
      // It's a formula
      setSheetData(prev => ({
        ...prev,
        [selectedCell]: {
          id: selectedCell,
          value: formulaBar, // Will be evaluated by the spreadsheet component
          type: 'formula' as const,
          formula: formulaBar
        }
      }));
    } else {
      // Regular value
      const numValue = Number(formulaBar);
      const isNumber = !isNaN(numValue) && formulaBar.trim() !== '';
      
      setSheetData(prev => ({
        ...prev,
        [selectedCell]: {
          id: selectedCell,
          value: isNumber ? numValue : formulaBar,
          type: isNumber ? 'number' as const : 'text' as const
        }
      }));
    }
  }, [selectedCell, formulaBar]);

  const handleSheetChange = useCallback((data: { [key: string]: CellData }) => {
    setSheetData(data);
  }, []);

  const handleActiveSheetChange = useCallback((sheetId: string) => {
    setActiveSheetId(sheetId);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Google Sheets-style Top Bar */}
      <div className="flex items-center px-2 py-1 border-b bg-white shadow-sm w-full" style={{ minHeight: 48 }}>
        <img src="/file.svg" alt="Sheets Logo" className="w-8 h-8 mr-2" />
        <input
          className="text-lg font-semibold bg-transparent border-none outline-none px-2 py-1 rounded hover:bg-gray-100 transition w-64"
          defaultValue="Untitled Spreadsheet"
        />
        <div className="flex-1" />
        <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Last edit was seconds ago</button>
        <button className="ml-2 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Share</button>
        <img src="/globe.svg" alt="Account" className="w-8 h-8 ml-4 rounded-full border" />
      </div>

      {/* Simplified Working Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white w-full" style={{ minHeight: 40 }}>
        <span className="text-sm font-medium text-gray-700">Actions:</span>
        <button 
          className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
          onClick={() => {
            // Clear selected cell
            if (selectedCell) {
              setSheetData(prev => {
                const newData = { ...prev };
                delete newData[selectedCell];
                return newData;
              });
            }
          }}
        >
          Clear Cell
        </button>
        <button 
          className="px-3 py-1 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200"
          onClick={() => {
            // Add sample data
            setSheetData(prev => ({
              ...prev,
              'A1': { id: 'A1', value: 10, type: 'number' },
              'B1': { id: 'B1', value: 20, type: 'number' },
              'C1': { id: 'C1', value: 30, type: 'number', formula: '=A1+B1' }
            }));
          }}
        >
          Add Sample Data
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">Selected: {selectedCell}</span>
      </div>

      {/* Name Box and Formula Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
        <div className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-mono bg-white">
          {selectedCell}
        </div>
        <span className="text-gray-400">fx</span>
        <input
          type="text"
          value={formulaBar}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleFormulaBarEnter();
            }
          }}
          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm font-mono bg-white"
          placeholder="Enter formula or value..."
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chatbot Section - Left Side */}
        <div className="w-80 flex flex-col border-r border-gray-200">
          <Chatbot onCommand={handleCommand} />
        </div>

        {/* Spreadsheet Section */}
        <div className="flex-1 flex flex-col">
          <SheetManager 
            onSheetChange={handleSheetChange}
            onActiveSheetChange={handleActiveSheetChange}
          />
          <Spreadsheet 
            onDataChange={handleDataChange}
            executeCommand={currentCommand}
            onCellSelect={handleCellSelect}
            selectedCell={selectedCell}
            data={sheetData}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}
