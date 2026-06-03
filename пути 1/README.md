# Guide — Web Version

## Quick Start

### 1. Start the Local Server

```powershell
cd "C:\Users\artjo\Documents\пути 1\web"
python -m http.server 8000
```

### 2. Open in browser

http://localhost:8000

### 3. Adding Data
Use the converter:

```powershell
cd "C:\Users\artjo\Documents\пути 1"
python -m pip install --user openpyxl
python scripts/convert_xls.py "Путеводитель полный 2024.xls" "web/data/content.json"
```

## Functionality

### Search
- Enter a name, address, phone number, or any keyword.
- Results update instantly.
- Tap a result to view detailed information.

### Category Navigation
- Click items in the left sidebar to filter results.
- Each category is marked with a unique icon.
- On mobile devices, categories feature horizontal scrolling.

##Project Structure

```
пути/
├── web/
│   ├── index.html          # HTML структура
│   ├── styles.css          # Стили (CSS3, адаптив)
│   ├── app.js              # JavaScript логика
│   ├── data/
│   │   └── content.json    # Данные приложения
│   └── .gitkeep
├── scripts/
│   └── convert_xls.py      # Конвертер XLS → JSON
├── README.md               # Этот файл
└── Путеводитель полный 2024.xls
```

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (0 dependencies)
- **Backend**: Python built-in modules
- **Server**: Python `http.server` (built-in)
- **Compatibility**: All modern browsers (Chrome, Firefox, Safari, Edge)

## Notes

The current file `web/data/content.json` contains demo data. Replace it with actual data from Excel.

## Error Fix

**Page Opening Error** – Check: Is `python -m http.server 8000` running? Is your browser opening `http://localhost:8000`?

**Data Display Error** – Check if `web/data/content.json` exists and contains valid JSON.

**Search Function Error** – Refresh the page (Ctrl+F5) and check the browser console (F12).