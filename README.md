# Data Analysis Tool

An interactive data analysis tool with a chatbot interface and Excel-like spreadsheet functionality built with Next.js and Firebase.

## Features

- **Interactive Spreadsheet**: Excel-like interface with cells, rows, and columns
- **AI Chatbot**: Natural language commands to manipulate spreadsheet data
- **Real-time Updates**: Changes are reflected immediately in the spreadsheet
- **Firebase Backend**: Data persistence and real-time synchronization
- **Export Functionality**: Export data to CSV format
- **Command Recognition**: Supports various commands like:
  - Set cell values: "Set A1 to 100"
  - Add rows/columns: "Add row", "Add column"
  - Calculate sums: "Sum A1:A10"
  - Delete cells: "Delete A1"

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-analysis-tool
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Get your Firebase configuration

4. Configure environment variables:
   - Rename `.env.local` to `.env.local`
   - Add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Chatbot Commands

The chatbot understands natural language commands to manipulate the spreadsheet:

- **Set values**: "Set A1 to 100" or "A1 = Hello"
- **Delete cells**: "Delete A1" or "Clear B2"
- **Add structure**: "Add row" or "Add column"
- **Calculate**: "Sum A1:A10" or "Calculate sum of B1:B5"
- **Sort**: "Sort by column A"
- **Filter**: "Filter column B equals value"

### Spreadsheet Features

- Click on any cell to edit its value
- Add rows and columns using the toolbar buttons
- Export data to CSV format
- Real-time command execution from chatbot

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase Firestore
- **UI Components**: Lucide React icons
- **State Management**: React hooks
- **Notifications**: React Hot Toast

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Chatbot.tsx
│   └── Spreadsheet.tsx
├── lib/
│   └── firebase.ts
├── services/
│   └── firebaseService.ts
├── types/
│   └── index.ts
└── utils/
    └── commandParser.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
