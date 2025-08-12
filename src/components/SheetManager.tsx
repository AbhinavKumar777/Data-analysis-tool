'use client';

import { useState, useCallback } from 'react';
import { Plus, X, FileText, Download, Upload, Save } from 'lucide-react';
import { SheetData, CellData } from '@/types';
import { toast } from 'react-hot-toast';

interface Sheet {
  id: string;
  name: string;
  data: { [key: string]: CellData };
  isActive: boolean;
}

interface SheetManagerProps {
  onSheetChange: (sheetData: { [key: string]: CellData }) => void;
  onActiveSheetChange: (sheetId: string) => void;
}

export default function SheetManager({ onSheetChange, onActiveSheetChange }: SheetManagerProps) {
  const [sheets, setSheets] = useState<Sheet[]>([
    {
      id: 'sheet1',
      name: 'Sheet1',
      data: {},
      isActive: true
    }
  ]);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sheetId: string;
  }>({ visible: false, x: 0, y: 0, sheetId: '' });

  const activeSheet = sheets.find(sheet => sheet.isActive);

  const handleAddSheet = useCallback(() => {
    const newSheetNumber = sheets.length + 1;
    const newSheet: Sheet = {
      id: `sheet${newSheetNumber}`,
      name: `Sheet${newSheetNumber}`,
      data: {},
      isActive: false
    };

    setSheets(prev => prev.map(sheet => ({ ...sheet, isActive: false })).concat({ ...newSheet, isActive: true }));
    onActiveSheetChange(newSheet.id);
    onSheetChange({});
    toast.success(`Added ${newSheet.name}`);
  }, [sheets.length, onActiveSheetChange, onSheetChange]);

  const handleSelectSheet = useCallback((sheetId: string) => {
    setSheets(prev => prev.map(sheet => ({
      ...sheet,
      isActive: sheet.id === sheetId
    })));
    
    const selectedSheet = sheets.find(sheet => sheet.id === sheetId);
    if (selectedSheet) {
      onActiveSheetChange(sheetId);
      onSheetChange(selectedSheet.data);
    }
  }, [sheets, onActiveSheetChange, onSheetChange]);

  const handleRightClick = useCallback((e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      sheetId
    });
  }, []);

  const handleRenameSheet = useCallback((sheetId: string) => {
    const newName = prompt('Enter new sheet name:');
    if (newName && newName.trim()) {
      setSheets(prev => prev.map(sheet => 
        sheet.id === sheetId ? { ...sheet, name: newName.trim() } : sheet
      ));
      toast.success('Sheet renamed');
    }
    setContextMenu({ visible: false, x: 0, y: 0, sheetId: '' });
  }, []);

  const handleDeleteSheet = useCallback((sheetId: string) => {
    if (sheets.length === 1) {
      toast.error('Cannot delete the last sheet');
      return;
    }

    const isActiveSheet = sheets.find(sheet => sheet.id === sheetId)?.isActive;
    
    setSheets(prev => {
      const filtered = prev.filter(sheet => sheet.id !== sheetId);
      if (isActiveSheet && filtered.length > 0) {
        filtered[0].isActive = true;
        onActiveSheetChange(filtered[0].id);
        onSheetChange(filtered[0].data);
      }
      return filtered;
    });

    toast.success('Sheet deleted');
    setContextMenu({ visible: false, x: 0, y: 0, sheetId: '' });
  }, [sheets, onActiveSheetChange, onSheetChange]);

  const handleDuplicateSheet = useCallback((sheetId: string) => {
    const sheetToDuplicate = sheets.find(sheet => sheet.id === sheetId);
    if (!sheetToDuplicate) return;

    const newSheetNumber = sheets.length + 1;
    const duplicatedSheet: Sheet = {
      id: `sheet${newSheetNumber}`,
      name: `${sheetToDuplicate.name} (Copy)`,
      data: { ...sheetToDuplicate.data },
      isActive: false
    };

    setSheets(prev => prev.map(sheet => ({ ...sheet, isActive: false })).concat({ ...duplicatedSheet, isActive: true }));
    onActiveSheetChange(duplicatedSheet.id);
    onSheetChange(duplicatedSheet.data);
    toast.success('Sheet duplicated');
    setContextMenu({ visible: false, x: 0, y: 0, sheetId: '' });
  }, [sheets, onActiveSheetChange, onSheetChange]);

  const handleExportWorkbook = useCallback(() => {
    const workbookData = {
      sheets: sheets.map(sheet => ({
        name: sheet.name,
        data: sheet.data
      })),
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(workbookData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workbook.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workbook exported');
  }, [sheets]);

  const handleImportWorkbook = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbookData = JSON.parse(e.target?.result as string);
        if (workbookData.sheets) {
          const importedSheets: Sheet[] = workbookData.sheets.map((sheet: any, index: number) => ({
            id: `imported_sheet_${index + 1}`,
            name: sheet.name || `Sheet${index + 1}`,
            data: sheet.data || {},
            isActive: index === 0
          }));

          setSheets(importedSheets);
          if (importedSheets.length > 0) {
            onActiveSheetChange(importedSheets[0].id);
            onSheetChange(importedSheets[0].data);
          }
          toast.success('Workbook imported');
        }
      } catch (error) {
        toast.error('Invalid workbook file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [onActiveSheetChange, onSheetChange]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, sheetId: '' });
  }, []);

  return (
    <>
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`relative px-3 py-1 text-sm font-medium cursor-pointer border-t border-l border-r ${
                sheet.isActive
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectSheet(sheet.id)}
              onContextMenu={(e) => handleRightClick(e, sheet.id)}
              style={{ borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}
            >
              <FileText className="w-3 h-3 inline mr-1" />
              {sheet.name}
            </div>
          ))}
          
          <button
            onClick={handleAddSheet}
            className="p-1 ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Add new sheet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportWorkbook}
            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
            title="Export workbook"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          
          <label className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1 cursor-pointer">
            <Upload className="w-3 h-3" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportWorkbook}
              className="hidden"
            />
          </label>
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
              onClick={() => handleRenameSheet(contextMenu.sheetId)}
            >
              Rename
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => handleDuplicateSheet(contextMenu.sheetId)}
            >
              Duplicate
            </button>
            <hr className="my-1" />
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
              onClick={() => handleDeleteSheet(contextMenu.sheetId)}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}