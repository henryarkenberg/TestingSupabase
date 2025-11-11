# 🍽️ Pakistani Restaurant Finder - React Native + Supabase

A React Native application built with Expo Go that searches through a comprehensive database of Pakistani restaurants using Supabase.

## Features

- 🔍 **Restaurant Search**: Search by restaurant name, city, address, or state
- 🗺️ **Location Data**: Display restaurant addresses and GPS coordinates
- 📞 **Contact Info**: Show phone numbers and website URLs
- 🏙️ **City & State Filters**: Browse restaurants by location
- 📱 **Mobile Optimized**: Built with React Native for cross-platform experience
- 🚀 **Expo Go Compatible**: Run instantly on your device with Expo Go app

## Prerequisites

Before running this project, make sure you have:

1. **Node.js** (version 16 or higher)
2. **Expo CLI** installed globally: `npm install -g @expo/cli`
3. **Expo Go app** on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
4. **Supabase Account** and project set up

## Setup Instructions

### 1. Supabase Configuration

1. Create a new project in [Supabase](https://supabase.com)
2. In your Supabase dashboard, go to **Settings > API**
3. Copy your **Project URL** and **Anon Key**
4. Update the `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_actual_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

### 2. Database Setup

Set up your Pakistani restaurant database:

1. **Create the restaurants table**: 
   - Use the SQL script in `database/create_restaurants_table.sql`
   - Run it in your Supabase SQL Editor

2. **Upload your restaurant CSV**:
   - Follow the detailed guide in `database/CSV_UPLOAD_GUIDE.md`
   - Use Supabase Dashboard → Table Editor → Import CSV
   - Map columns: name, address, phone_number, latitude, longitude, city, state, url

The restaurants table includes:
- Restaurant names and addresses
- Phone numbers and websites
- GPS coordinates (latitude/longitude)
- City and state information
- Timestamps and search indexes

### 3. Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm start
   ```

3. **Run on Your Device**:
   - Open the **Expo Go** app on your mobile device
   - Scan the QR code displayed in your terminal/browser
   - The app will load on your device

## Project Structure

```
TestingSupabase/
├── App.js                 # Main application component with search UI
├── lib/
│   └── supabase.js       # Supabase client configuration
├── .env                  # Environment variables (Supabase credentials)
├── package.json          # Project dependencies and scripts
└── README.md            # This file
```

## How It Works

1. **Restaurant Search**: Search Pakistani restaurants by name, city, address, or state
2. **Real-time Results**: Instant search results as you type
3. **Detailed Display**: Shows restaurant info including location, phone, and website
4. **Connection Status**: Real-time connection status to Supabase

## Search Implementation

The search functionality uses Supabase's `ilike` operator for case-insensitive pattern matching across restaurant data:

```javascript
const { data, error } = await supabase
  .from('restaurants')
  .select('*')
  .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`)
  .limit(20);
```

**Search Examples:**
- "Karachi" → Find all restaurants in Karachi
- "BBQ" → Find restaurants with BBQ in the name
- "Lahore Punjab" → Find restaurants in Lahore, Punjab
- "Pizza" → Find pizza restaurants across Pakistan

## Customization

### Adding AI-Powered Search

To enhance with AI capabilities, you can:

1. **Add Vector Search**: Use Supabase's `pgvector` extension for semantic search
2. **Text Embeddings**: Store and search using text embeddings
3. **Full-Text Search**: Implement PostgreSQL's full-text search capabilities

Example for vector search setup:
```sql
-- Enable the vector extension
CREATE EXTENSION vector;

-- Add an embedding column
ALTER TABLE search_items ADD COLUMN embedding vector(1536);

-- Create an index for faster searches
CREATE INDEX ON search_items USING ivfflat (embedding vector_cosine_ops);
```

### Styling Customization

The app uses a modern, clean design with:
- Light theme with subtle shadows
- Responsive layout for different screen sizes
- Loading states and empty states
- Error handling with user-friendly messages

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" Error**:
   - Make sure your `.env` file has the correct variables
   - Restart the Expo development server after changing environment variables

2. **"Search Error" Messages**:
   - Verify your Supabase credentials are correct
   - Check that your database table exists and has the expected structure
   - Ensure Row Level Security policies allow read access

3. **Connection Issues**:
   - Make sure your device and development machine are on the same network
   - Try restarting the Expo Go app

## Development Scripts

- `npm start`: Start the Expo development server
- `npm run android`: Run on Android emulator (requires Android Studio)
- `npm run ios`: Run on iOS simulator (requires Xcode on macOS)
- `npm run web`: Run in web browser

## Next Steps

To enhance this application further, consider:

1. **User Authentication**: Add user login/signup with Supabase Auth
2. **Advanced Search**: Implement filters, sorting, and pagination
3. **Offline Support**: Cache results for offline viewing
4. **Push Notifications**: Add real-time updates for new content
5. **AI Features**: Integrate OpenAI or other AI services for smarter search

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).