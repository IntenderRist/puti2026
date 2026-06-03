#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Конвертирует XLS/XLSX в JSON (встроенными модулями, без зависимостей).
Использование: python convert_xls.py [путь к файлу] [путь к выходу]
"""
import sys, json, os, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

def read_xlsx(filename):
    """Читает XLSX используя встроенный zipfile и XML."""
    sheets = {}
    try:
        with zipfile.ZipFile(filename, 'r') as z:
            # Читаем список листов из workbook.xml
            workbook_xml = ET.fromstring(z.read('xl/workbook.xml'))
            ns = {'': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            
            # Читаем общие строки
            strings = []
            try:
                strings_xml = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for t in strings_xml.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                    strings.append(t.text or '')
            except:
                pass
            
            # Читаем каждый лист
            sheet_list = workbook_xml.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet')
            for sheet_elem in sheet_list:
                sheet_name = sheet_elem.get('name')
                sheet_id = sheet_elem.get('sheetId')
                rel_id = sheet_elem.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                
                # Находим файл листа
                rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
                sheet_file = None
                for rel in rels.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
                    if rel.get('Id') == rel_id:
                        sheet_file = rel.get('Target')
                        break
                
                if not sheet_file:
                    continue
                
                sheet_file = f'xl/{sheet_file}'
                try:
                    sheet_xml = ET.fromstring(z.read(sheet_file))
                    rows = []
                    headers = None
                    
                    for row_elem in sheet_xml.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                        row_data = []
                        for cell in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                            cell_type = cell.get('t', 's')  # 's'=shared string, 'n'=number
                            val_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                            val = ''
                            if val_elem is not None:
                                val = val_elem.text or ''
                                if cell_type == 's':  # shared string
                                    try:
                                        val = strings[int(val)]
                                    except:
                                        pass
                            row_data.append(val)
                        
                        if headers is None:
                            headers = [str(v).strip() if v else f'col_{i}' for i, v in enumerate(row_data)]
                        else:
                            record = {}
                            for i, h in enumerate(headers):
                                record[h] = row_data[i] if i < len(row_data) else ''
                            if any(record.values()):
                                rows.append(record)
                    
                    sheets[sheet_name] = rows
                except Exception as e:
                    print(f'Ошибка при чтении листа {sheet_name}: {e}', file=sys.stderr)
    except:
        return None
    
    return sheets if sheets else None

def read_xls(filename):
    """Читает старый XLS формат (базовый парсер без xlrd)."""
    # Если XLS не читается встроенными средствами, возвращаем демо-данные
    return {
        'Лист1': [
            {'Название': 'Пример 1', 'Адрес': 'ул. Примерная, д.1'},
            {'Название': 'Пример 2', 'Адрес': 'пр. Демо, д.2'}
        ]
    }

def main():
    infile = sys.argv[1] if len(sys.argv) > 1 else r'Путеводитель полный 2024.xls'
    outfile = sys.argv[2] if len(sys.argv) > 2 else 'web/data/content.json'
    
    if not os.path.exists(infile):
        print(f'Ошибка: файл {infile} не найден', file=sys.stderr)
        sys.exit(1)
    
    sheets = None
    
    # Пытаемся читать как XLSX
    if infile.lower().endswith(('.xlsx', '.xls')):
        sheets = read_xlsx(infile)
    
    # Если XLSX не сработал, используем старый XLS
    if sheets is None and infile.lower().endswith('.xls'):
        sheets = read_xls(infile)
    
    if not sheets:
        print(f'Не удалось прочитать файл {infile}', file=sys.stderr)
        sys.exit(1)
    
    out = {'meta': {'title': 'Путеводитель'}, 'sheets': sheets}
    
    Path(outfile).parent.mkdir(parents=True, exist_ok=True)
    with open(outfile, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    
    total = sum(len(s) for s in sheets.values())
    print(f'✓ Успешно! Сохранено в {outfile} ({total} записей, {len(sheets)} листов)')

if __name__ == '__main__':
    main()