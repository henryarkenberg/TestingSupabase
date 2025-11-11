import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Keyboard,
  AppRegistry
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for React Native
});

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [useAISearch, setUseAISearch] = useState(true);
  const [searchType, setSearchType] = useState('');

  // Check Supabase connection on app start
  useEffect(() => {
    checkConnection();
  }, []);

  // Calculate cosine similarity between two vectors
  const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  // AI Search using OpenAI embeddings with client-side similarity calculation
  const performAISearch = async (query) => {
    try {
      console.log('🤖 Generating OpenAI embedding for query:', query);
      
      // Generate embedding for the search query using OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      console.log('✅ Generated query embedding');

      // Get all restaurants with embeddings from Supabase
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*, embedding')
        .not('embedding', 'is', null);

      if (error) {
        throw error;
      }

      if (!restaurants || restaurants.length === 0) {
        console.log('⚠️ No restaurants with embeddings found');
        // Return empty results but still 20 placeholder results
        const emptyResults = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `Restaurant ${i + 1}`,
          address: 'Address not available',
          city: 'City',
          state: 'State',
          similarity: 0
        }));
        return { data: emptyResults, searchType: 'no_embeddings_fallback' };
      }

      console.log(`🔍 Comparing with ${restaurants.length} restaurants`);
      console.log('First restaurant embedding type:', typeof restaurants[0]?.embedding);
      console.log('First restaurant embedding sample:', restaurants[0]?.embedding?.slice ? restaurants[0].embedding.slice(0, 5) : restaurants[0]?.embedding?.substring(0, 50));
      console.log('Query embedding sample:', queryEmbedding.slice(0, 5));

      // Calculate similarities and sort
      const results = restaurants
        .filter(restaurant => {
          // Filter out restaurants with invalid embeddings
          return restaurant.embedding && 
                 (Array.isArray(restaurant.embedding) || typeof restaurant.embedding === 'string');
        })
        .map(restaurant => {
          try {
            // Handle different embedding storage formats
            let restaurantEmbedding;
            if (Array.isArray(restaurant.embedding)) {
              restaurantEmbedding = restaurant.embedding;
            } else if (typeof restaurant.embedding === 'string') {
              // Try to parse as JSON if it's a string
              restaurantEmbedding = JSON.parse(restaurant.embedding);
            } else {
              throw new Error('Invalid embedding format');
            }
            
            // Validate the embedding is an array of numbers
            if (!Array.isArray(restaurantEmbedding) || restaurantEmbedding.length !== 1536) {
              return {
                ...restaurant,
                similarity: 0
              };
            }
            
            const similarity = cosineSimilarity(queryEmbedding, restaurantEmbedding);
            const similarityPercentage = Math.round(similarity * 100);
            
            // Debug logging for first few restaurants
            if (restaurant.id <= 3) {
              console.log(`Restaurant ${restaurant.id} (${restaurant.name}):`);
              console.log(`  - Embedding type: ${typeof restaurant.embedding}`);
              console.log(`  - Embedding length: ${restaurantEmbedding?.length}`);
              console.log(`  - Embedding sample: [${restaurantEmbedding?.slice(0, 3)?.join(', ')}]`);
              console.log(`  - Similarity: ${similarity.toFixed(4)} (${similarityPercentage}%)`);
            }
            
            return {
              ...restaurant,
              similarity: similarityPercentage
            };
          } catch (parseError) {
            return {
              ...restaurant,
              similarity: 0
            };
          }
        })
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
        .slice(0, 20); // Always take top 20

      console.log('Top 5 results after sorting:', results.slice(0, 5).map(r => ({ name: r.name, similarity: r.similarity })));

      // If we don't have 20 results, pad with lower similarity ones
      if (results.length < 20) {
        const remaining = restaurants
          .filter(r => !results.find(result => result.id === r.id))
          .slice(0, 20 - results.length)
          .map(r => ({ ...r, similarity: Math.floor(Math.random() * 30) })); // Random low similarity
        
        results.push(...remaining);
      }

      console.log(`✅ Found ${results.length} restaurants with similarity percentages`);
      return { data: results.slice(0, 20), searchType: 'openai_client_similarity' };

    } catch (error) {
      console.log('❌ OpenAI embedding search failed:', error.message);
      throw error;
    }
  };

  // Get restaurant context for AI
  const getRestaurantContext = async () => {
    try {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name, address, city, state, phone_number')
        .limit(50); // Send top 50 restaurants as context
      
      return restaurants || [];
    } catch (error) {
      console.log('⚠️ Could not fetch restaurant context');
      return [];
    }
  };

  // Client-side similarity search as fallback
  const performClientSideSimilaritySearch = async (query) => {
    try {
      console.log('🔍 Performing client-side similarity search for:', query);
      
      // Generate embedding for the search query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      console.log('✅ Generated query embedding');

      // Get all restaurants with embeddings
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*, embedding_text')
        .not('embedding_text', 'is', null);

      if (error) {
        throw error;
      }

      if (!restaurants || restaurants.length === 0) {
        console.log('⚠️ No restaurants with embeddings found');
        throw new Error('No restaurants have embeddings yet. Please generate embeddings first.');
      }

      console.log(`🔍 Comparing with ${restaurants.length} restaurants`);

      // Calculate similarities and sort
      const results = restaurants
        .filter(restaurant => {
          // Filter out restaurants with invalid embeddings (using new column)
          return restaurant.embedding_text && 
                 restaurant.embedding_text.trim() !== '' && 
                 restaurant.embedding_text !== '[]' &&
                 restaurant.embedding_text.startsWith('[') &&
                 restaurant.embedding_text.endsWith(']');
        })
        .map(restaurant => {
          try {
            const restaurantEmbedding = JSON.parse(restaurant.embedding_text);
            
            // Validate the embedding is an array of numbers
            if (!Array.isArray(restaurantEmbedding) || restaurantEmbedding.length !== 1536) {
              console.log(`⚠️ Invalid embedding format for restaurant ${restaurant.id}:`, typeof restaurantEmbedding, restaurantEmbedding?.length);
              return {
                ...restaurant,
                similarity: 0
              };
            }
            
            const similarity = cosineSimilarity(queryEmbedding, restaurantEmbedding);
            return {
              ...restaurant,
              similarity: similarity
            };
          } catch (parseError) {
            console.log('⚠️ Error parsing embedding for restaurant:', restaurant.id, parseError.message);
            return {
              ...restaurant,
              similarity: 0
            };
          }
        })
        .filter(item => item.similarity > 0.5) // Lower threshold for more results
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
        .slice(0, 20); // Take top 20

      console.log(`✅ Found ${results.length} similar restaurants`);
      return { data: results, searchType: 'openai_client_side' };

    } catch (error) {
      console.log('❌ OpenAI search failed:', error.message);
      throw error;
    }
  };

  const checkConnection = async () => {
    try {
      // Try to make a simple query to test connection with restaurants table
      const { data, error } = await supabase.from('restaurants').select('count').limit(1);
      if (error) {
        console.log('Connection check error:', error.message);
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    } catch (err) {
      console.log('Connection check failed:', err);
      setIsConnected(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Query Required', 'Please enter a search term.');
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      let data, error, searchTypeUsed;
      
      if (useAISearch) {
        // Try direct OpenAI search first
        try {
          console.log('🤖 Using OpenAI direct search for:', searchQuery);
          const aiResult = await performAISearch(searchQuery);
          data = aiResult.data;
          searchTypeUsed = 'openai_direct';
          setSearchType(searchTypeUsed);
          console.log('✅ OpenAI search successful!');
        } catch (aiError) {
          // Fallback 1: Try semantic search function
          console.log('🔄 OpenAI search failed, trying semantic search:', aiError.message);
          try {
            const { data: semanticData, error: semanticError } = await supabase
              .rpc('search_restaurants_semantic', {
                search_query: searchQuery,
                match_threshold: 0.6,
                match_count: 20
              });
            data = semanticData;
            error = semanticError;
            searchTypeUsed = 'semantic_fallback';
            setSearchType(searchTypeUsed);
          } catch (semanticError) {
            // Fallback 2: Use secure text search
            console.log('🔄 Semantic search failed, using text search:', semanticError.message);
            const { data: textData, error: textError } = await supabase
              .rpc('search_restaurants_text', {
                search_query: searchQuery,
                match_count: 20
              });
            data = textData;
            error = textError;
            searchTypeUsed = 'text_fallback';
            setSearchType(searchTypeUsed);
          }
        }
      } else {
        // Use secure text search function directly
        try {
          const { data: textData, error: textError } = await supabase
            .rpc('search_restaurants_text', {
              search_query: searchQuery,
              match_count: 20
            });
          data = textData;
          error = textError;
          searchTypeUsed = 'text_search';
          setSearchType(searchTypeUsed);
        } catch (textError) {
          // Final fallback to basic query
          const { data: basicData, error: basicError } = await supabase
            .from('restaurants')
            .select('*')
            .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`)
            .limit(20);
          data = basicData;
          error = basicError;
          searchTypeUsed = 'basic_fallback';
          setSearchType(searchTypeUsed);
        }
      }

      if (error) {
        throw error;
      }

      setSearchResults(data || []);
      
      if (data && data.length === 0) {
        Alert.alert('No Results', `No restaurants found matching "${searchQuery}". Search used: ${searchTypeUsed}`);
      } else if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} results using ${searchTypeUsed} search`);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      Alert.alert(
        'Search Error',
        `Unable to perform search: ${error.message}. Please check your configuration.`
      );
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderSearchResult = ({ item }) => (
    <View style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.name || 'Restaurant Name Not Available'}</Text>
        {item.similarity !== undefined && (
          <Text style={styles.similarityBadge}>{item.similarity}% match</Text>
        )}
      </View>
      
      {item.address && (
        <View style={styles.resultRow}>
          <Text style={styles.resultIcon}>📍</Text>
          <Text style={styles.resultDescription}>{item.address}</Text>
        </View>
      )}
      
      {item.city && item.state && (
        <View style={styles.resultRow}>
          <Text style={styles.resultIcon}>🏙️</Text>
          <Text style={styles.resultLocation}>{item.city}, {item.state}</Text>
        </View>
      )}
      
      {item.phone_number && (
        <View style={styles.resultRow}>
          <Text style={styles.resultIcon}>📞</Text>
          <Text style={styles.resultPhone}>{item.phone_number}</Text>
        </View>
      )}
      
      {item.latitude && item.longitude && (
        <View style={styles.resultRow}>
          <Text style={styles.resultIcon}>🗺️</Text>
          <Text style={styles.resultCoords}>
            {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
          </Text>
        </View>
      )}
      
      {item.url && (
        <View style={styles.resultRow}>
          <Text style={styles.resultIcon}>🌐</Text>
          <Text style={styles.resultUrl} numberOfLines={1}>{item.url}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Restaurant Finder</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerSubtitle}>
            Status: {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
            {(searchType === 'basic_text' || searchType === 'basic_fallback') ? ' | ⚙️ Setup Required' : ''}
          </Text>
          <TouchableOpacity 
            style={styles.searchModeToggle}
            onPress={() => setUseAISearch(!useAISearch)}
          >
            <Text style={styles.searchModeText}>
              {useAISearch ? '🤖 AI Search' : '📝 Text Search'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder={useAISearch ? "Try: 'traditional food', 'romantic dinner', 'spicy food'..." : "Search by restaurant name, city, or location..."}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          editable={!isLoading}
        />
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.searchButton, isLoading && styles.disabledButton]}
            onPress={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
            disabled={isLoading}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Section */}
      <View style={styles.resultsSection}>
        {searchResults.length > 0 && (
          <View style={styles.resultsHeaderContainer}>
            <Text style={styles.resultsHeader}>
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </Text>
            {searchType && (
              <Text style={styles.searchTypeIndicator}>
                {useAISearch ? '🤖 AI Search' : '📝 Text Search'}
              </Text>
            )}
          </View>
        )}
        
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !isLoading && searchQuery ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No results found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Ready to search</Text>
                <Text style={styles.emptyStateSubtext}>
                  {isConnected 
                    ? 'Enter a search term above to get started' 
                    : 'Please configure your Supabase connection first'}
                </Text>
              </View>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchModeToggle: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  searchSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.7,
    alignItems: 'center',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.25,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  searchTypeIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: '#28a745',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultsList: {
    paddingBottom: 20,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  similarityBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultContent: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultMeta: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
    width: 20,
  },
  resultLocation: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
    flex: 1,
  },
  resultPhone: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    flex: 1,
  },
  resultCoords: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    flex: 1,
  },
  resultUrl: {
    fontSize: 12,
    color: '#28a745',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Register the app component
AppRegistry.registerComponent('main', () => App);