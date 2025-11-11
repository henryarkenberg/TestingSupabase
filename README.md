# 🍽️ AI-Powered Restaurant Finder - React Native + Supabase + OpenAI

A sophisticated React Native application that uses AI-powered semantic search to find restaurants. Built with Expo Go, Supabase, and OpenAI embeddings for intelligent restaurant discovery.

## 🌟 Features

- 🤖 **AI Semantic Search**: Uses OpenAI embeddings for intelligent, meaning-based search
- 📊 **Similarity Matching**: Shows percentage match scores for search relevance
- 🔍 **Smart Results**: Always returns top 20 most relevant results
- 🗺️ **Location Data**: Complete restaurant information with GPS coordinates
- 📞 **Contact Info**: Phone numbers, addresses, and website URLs
- � **Contextual Search**: Find restaurants by cuisine type, mood, or description
- 📱 **Cross-Platform**: Works on iOS and Android via Expo Go
- ⚡ **Real-time**: Instant AI-powered search results

## 🚀 What Makes This Special

Unlike traditional keyword-based search, this app understands the *meaning* behind your queries:

- **"Spicy food"** → Finds restaurants known for hot, flavorful dishes
- **"Romantic dinner"** → Discovers upscale dining establishments
- **"Family friendly"** → Locates restaurants suitable for children
- **"Quick lunch"** → Identifies fast-casual dining options
- **"Traditional cuisine"** → Finds authentic cultural restaurants

Each result shows a **similarity percentage** indicating how well it matches your search intent!

## 📋 Prerequisites

Before starting, you'll need:

1. **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
2. **Expo CLI**: `npm install -g @expo/cli`
3. **Expo Go app** on your phone: [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
4. **Supabase Account** - [Sign up free](https://supabase.com)
5. **OpenAI API Key** - [Get API key](https://platform.openai.com/api-keys)
6. **Git** - [Install Git](https://git-scm.com/downloads)

## 🛠️ Complete Setup Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/henryarkenberg/TestingSupabase.git
cd TestingSupabase
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Supabase Database

#### 3.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create an account
2. Click **"New Project"**
3. Choose your organization and enter project details
4. Wait for the database to be created (2-3 minutes)

#### 3.2 Get Your Supabase Credentials
1. In your project dashboard, go to **Settings > API**
2. Copy your **Project URL** and **anon public key**

#### 3.3 Create the Database Table
1. Go to **SQL Editor** in your Supabase dashboard
2. Run this SQL command to create the restaurants table:

```sql
CREATE TABLE restaurants (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  address TEXT,
  phone_number TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  city TEXT,
  state TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  embedding VECTOR(1536)
);

-- Enable the vector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for faster similarity searches
CREATE INDEX ON restaurants USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### 3.4 Upload Restaurant Data
1. Go to **Table Editor** in Supabase
2. Select the **restaurants** table
3. Click **Insert > Import data from CSV**
4. Upload your restaurant CSV file
5. Map the columns: `name`, `address`, `phone_number`, `latitude`, `longitude`, `city`, `state`, `url`
6. Click **Import**

> **Note**: You can use any restaurant dataset in CSV format. The app will work with any restaurant data as long as it has name, address, and location fields.

### Step 4: Get OpenAI API Key

#### 4.1 Create OpenAI Account
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up for an account
3. Add billing information (required for API access)

#### 4.2 Generate API Key
1. Go to [API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name it something like "Restaurant App"
4. Copy the key (you won't see it again!)

### Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_OPENAI_API_KEY=sk-your_openai_api_key_here
```

> **⚠️ Important**: Replace the placeholder values with your actual credentials

### Step 6: Generate AI Embeddings (Required for Smart Search)

The AI search requires embeddings for each restaurant. You need to generate these once:

#### 6.1 Install Python Dependencies (if using Python script)
```bash
pip install supabase openai python-dotenv
```

#### 6.2 Run the Embedding Generation
You'll need to create a script to generate embeddings for your restaurants. Here's a sample Python script:

```python
import os
from supabase import create_client, Client
import openai
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
supabase: Client = create_client(os.getenv("EXPO_PUBLIC_SUPABASE_URL"), os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY"))
openai.api_key = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY")

# Get restaurants without embeddings
restaurants = supabase.table('restaurants').select('*').is_('embedding', 'null').execute()

for restaurant in restaurants.data:
    # Create text description for embedding
    text_description = f"{restaurant['name']} {restaurant['city']} {restaurant['address']} restaurant"
    
    # Generate embedding
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text_description
    )
    
    embedding = response.data[0].embedding
    
    # Update restaurant with embedding
    supabase.table('restaurants').update({
        'embedding': embedding
    }).eq('id', restaurant['id']).execute()
    
    print(f"Generated embedding for: {restaurant['name']}")
```

> **Alternative**: The app can also generate embeddings on-demand, but pre-generating them makes searches much faster.

### Step 7: Run the Application

#### 7.1 Start the Development Server
```bash
npm start
```

#### 7.2 Run on Your Device
1. **Install Expo Go** on your phone: [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. **Scan the QR Code**: Use your phone's camera or the Expo Go app to scan the QR code shown in your terminal
3. **Wait for Build**: The app will build and load on your device (may take 1-2 minutes on first run)

#### 7.3 Test the AI Search
1. Try searching for **"spicy food"** - should find restaurants with spicy cuisine
2. Search for **"family restaurant"** - should find family-friendly establishments  
3. Try **"quick lunch"** - should find fast-casual options
4. Each result should show a **percentage match** indicating relevance

## ✅ Verification Steps

Make sure everything is working:

- [ ] App loads without errors
- [ ] You can see the restaurant search interface
- [ ] Connection status shows **🟢 Connected**
- [ ] Search returns results with **percentage matches**
- [ ] Results change based on different search terms
- [ ] Similarity percentages vary (not all 0%)

## 🚨 Troubleshooting

### "No Results" or "0% Similarity"
- **Cause**: Missing or invalid embeddings
- **Solution**: Run the embedding generation script or check your OpenAI API key

### "Connection Failed"  
- **Cause**: Incorrect Supabase credentials
- **Solution**: Double-check your `.env` file values

### "Search Error"
- **Cause**: Missing database table or permissions
- **Solution**: Verify the SQL table creation step was completed

### "OpenAI API Error"
- **Cause**: Invalid API key or insufficient credits
- **Solution**: Check your OpenAI account and billing

### App Won't Load on Phone
- **Cause**: Network issues or Expo configuration
- **Solution**: Ensure both devices are on same WiFi network

## 📁 Project Structure

```
TestingSupabase/
├── App.js                 # Main React Native app with AI search
├── lib/
│   └── supabase.js       # Supabase client configuration  
├── .env                  # Environment variables (API keys)
├── package.json          # Dependencies and scripts
├── app.json             # Expo configuration
└── README.md            # This documentation
```

## 🧠 How the AI Search Works

### 1. Embedding Generation
When you search for "spicy food":
1. **OpenAI** converts your query into a 1536-dimension vector (embedding)
2. This vector captures the semantic meaning of "spicy food"

### 2. Similarity Calculation  
1. App fetches all restaurants with pre-generated embeddings from **Supabase**
2. **Cosine similarity** compares your query embedding with each restaurant's embedding
3. Results are ranked by similarity percentage (0-100%)

### 3. Intelligent Results
- **High similarity (80%+)**: Perfect matches for your intent
- **Medium similarity (60-79%)**: Good matches with some relevance  
- **Lower similarity (40-59%)**: Partial matches or related options

### Example Search Flow
```
Query: "romantic dinner"
↓
OpenAI Embedding: [0.123, -0.456, 0.789, ...]
↓  
Compare with restaurant embeddings:
- "Candlelight Bistro": 89% match ✨
- "Family Diner": 23% match
- "Fine Dining Restaurant": 76% match ✨
↓
Return top 20 results sorted by relevance
```

## 🔍 Search Examples

**Cuisine-Based:**
- `"Italian food"` → Finds pizza places, pasta restaurants
- `"Spicy cuisine"` → Discovers Indian, Mexican, Thai restaurants  
- `"Sweet treats"` → Locates bakeries, dessert shops

**Mood-Based:**
- `"Romantic dinner"` → Upscale restaurants, intimate settings
- `"Quick lunch"` → Fast-casual, grab-and-go options
- `"Family friendly"` → Kid-friendly establishments

**Occasion-Based:**
- `"Business meeting"` → Professional, quiet environments
- `"Birthday celebration"` → Party-friendly venues
- `"Date night"` → Cozy, romantic atmospheres

## 🎨 Customization Options

### Adding Your Own Data
1. **Replace Restaurant Data**: Upload any CSV with restaurant/business data
2. **Modify Search Fields**: Update the embedding generation to include additional fields
3. **Change Categories**: Adapt for cafes, hotels, shops, or any location-based business

### Styling Customization
The app uses a modern design system:
- **Clean Interface**: Light theme with subtle shadows and rounded corners
- **Responsive Layout**: Adapts to different screen sizes automatically  
- **Loading States**: Smooth loading indicators and empty states
- **Error Handling**: User-friendly error messages with retry options
- **Accessibility**: Screen reader support and proper touch targets

### Advanced Features You Can Add

#### 1. User Authentication
```javascript
// Add user login/signup with Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})
```

#### 2. Favorites System
```sql
-- Add favorites table
CREATE TABLE user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  restaurant_id BIGINT REFERENCES restaurants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Location-Based Search
```javascript
// Add geolocation filtering
const nearbyRestaurants = await supabase
  .rpc('nearby_restaurants', {
    lat: userLatitude,
    lng: userLongitude,
    radius_km: 5
  })
```

## 💰 Cost Considerations

### OpenAI API Costs (Approximate)
- **Embedding Generation**: ~$0.0001 per restaurant (one-time)
- **Search Queries**: ~$0.00002 per search
- **1000 restaurants + 1000 searches**: < $1.00

### Supabase Costs
- **Free Tier**: 500MB database, 50MB file storage
- **Pro Tier**: $25/month for production use
- Perfect for most applications

### Total Monthly Cost
- **Development**: Free (using free tiers)
- **Production**: $25-50/month depending on usage

## 🔧 Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Run on Android emulator  
npm run ios        # Run on iOS simulator (macOS only)
npm run web        # Run in web browser
npm run clear      # Clear Expo cache (if issues occur)
```

## 🚀 Deployment Options

### Option 1: Expo Application Services (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Build for production
eas build --platform android
eas build --platform ios

# Submit to app stores
eas submit --platform android
eas submit --platform ios
```

### Option 2: Expo Go (Development)
- Share the QR code for others to test via Expo Go app
- Perfect for demos and development testing

## 🎯 Production Checklist

Before deploying to production:

- [ ] **Security**: Remove any hardcoded API keys
- [ ] **Environment**: Set up production environment variables
- [ ] **Database**: Configure Row Level Security in Supabase
- [ ] **Performance**: Pre-generate embeddings for all restaurants
- [ ] **Monitoring**: Set up error tracking (Sentry, Bugsnag)
- [ ] **Analytics**: Add usage analytics (Amplitude, Mixpanel)

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`  
5. **Open** a Pull Request

### Development Guidelines
- Follow React Native best practices
- Add comments for complex AI/embedding logic
- Test on both iOS and Android
- Update README if adding new features

## 📚 Learn More

### Technologies Used
- **[React Native](https://reactnative.dev/)**: Cross-platform mobile development
- **[Expo](https://expo.dev/)**: React Native development platform
- **[Supabase](https://supabase.com/)**: Backend-as-a-Service with PostgreSQL
- **[OpenAI](https://openai.com/)**: AI embeddings and language models
- **[pgvector](https://github.com/pgvector/pgvector)**: Vector similarity search

### Useful Resources
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Expo Documentation](https://docs.expo.dev/)
- [Vector Similarity Search Tutorial](https://supabase.com/docs/guides/ai/vector-columns)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing powerful embedding models
- **Supabase** for excellent database and backend services
- **Expo** for simplifying React Native development
- **React Native** community for amazing mobile development tools

---

**⭐ If this project helped you, please give it a star on GitHub!**

**📧 Questions?** Open an issue or reach out to the maintainers.

**🐛 Found a bug?** Please report it in the Issues tab.

**💡 Have an idea?** We'd love to hear your suggestions!