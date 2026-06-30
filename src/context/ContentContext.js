import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { deleteBunnyVideo, getBunnyVideoStatus, createBunnyVideo, uploadBunnyVideo } from '../services/bunnyVideo';

const ContentContext = createContext({});

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

export const ContentProvider = ({ children }) => {
  const { user } = useAuth();

  // Background video uploads: { [contentItemId]: { progress, status, upload } }
  const [videoUploads, setVideoUploads] = useState({});
  const uploadsRef = useRef({});

  // Start a background video upload for a saved content item
  const startBackgroundUpload = (contentItemId, file, tusConfig) => {
    console.log('startBackgroundUpload called:', { contentItemId, fileName: file?.name, fileSize: file?.size, tusConfig });
    const upload = uploadBunnyVideo(
      file,
      tusConfig,
      (progress) => {
        setVideoUploads(prev => ({ ...prev, [contentItemId]: { ...prev[contentItemId], progress } }));
      },
      async () => {
        // Upload complete - update DB and local state
        await supabase
          .from('content_items')
          .update({ bunny_video_status: 'processing' })
          .eq('id', contentItemId);

        const updateState = (prev) => prev.map(c => ({
          ...c,
          items: c.items.map(i => i.id === contentItemId ? { ...i, bunny_video_status: 'processing' } : i),
        }));
        setLibraryCategories(updateState);
        setTrainingCategories(updateState);
        setFormsCategories(updateState);

        // Clean up from uploads tracking
        setVideoUploads(prev => {
          const next = { ...prev };
          delete next[contentItemId];
          return next;
        });
        delete uploadsRef.current[contentItemId];
      },
      (error) => {
        console.error('Background video upload failed:', error);
        setVideoUploads(prev => ({ ...prev, [contentItemId]: { ...prev[contentItemId], status: 'error', progress: 0 } }));
        delete uploadsRef.current[contentItemId];
      }
    );

    uploadsRef.current[contentItemId] = upload;
    setVideoUploads(prev => ({ ...prev, [contentItemId]: { progress: 0, status: 'uploading', upload } }));
  };

  // Prepare a video for background upload (called from modal before save)
  const prepareVideoUpload = async (title, file) => {
    const result = await createBunnyVideo(title);
    return { videoId: result.videoId, tusConfig: result.tusConfig, file };
  };

  // Categories and items state
  const [libraryCategories, setLibraryCategories] = useState([]);
  const [trainingCategories, setTrainingCategories] = useState([]);
  const [formsCategories, setFormsCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // User's downloaded content
  const [userDownloads, setUserDownloads] = useState(new Set());

  // Track if initial load is done
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load content on mount (only once)
  useEffect(() => {
    if (!initialLoaded) {
      loadAllContent();
    }
  }, [initialLoaded]);

  // Computed loading - only true if actually loading AND no data yet
  const isLoading = loading && libraryCategories.length === 0 && trainingCategories.length === 0 && formsCategories.length === 0;

  // Load user downloads when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserDownloads();
    } else {
      setUserDownloads(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load all categories and their content
  const loadAllContent = async (forceRefresh = false) => {
    // Skip if already loaded (unless forcing refresh)
    if (initialLoaded && !forceRefresh) return;

    try {
      setLoading(true);

      // Load categories, items, and junction table in parallel
      const [categoriesResult, itemsResult, junctionResult] = await Promise.all([
        supabase
          .from('content_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('content_items')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('content_item_categories')
          .select('*')
          .order('sort_order', { ascending: true })
      ]);

      if (categoriesResult.error) {
        console.error('Error loading categories:', categoriesResult.error);
        return;
      }

      if (itemsResult.error) {
        console.error('Error loading content items:', itemsResult.error);
        return;
      }

      const categoriesData = categoriesResult.data;
      const itemsData = itemsResult.data;
      const junctionData = junctionResult.data || [];

      // Create a map of items by ID for quick lookup
      const itemsById = (itemsData || []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      // Group items by category using junction table (many-to-many)
      // Falls back to direct category_id if no junction entries exist
      const itemsByCategory = {};

      // First, process junction table entries (new multi-category system)
      junctionData.forEach(junction => {
        if (!itemsByCategory[junction.category_id]) {
          itemsByCategory[junction.category_id] = [];
        }
        const item = itemsById[junction.content_id];
        if (item) {
          // Add junction sort_order to item for this category
          itemsByCategory[junction.category_id].push({
            ...item,
            _junctionSortOrder: junction.sort_order
          });
        }
      });

      // Fallback: Also include items with direct category_id (backward compatibility)
      (itemsData || []).forEach(item => {
        if (item.category_id) {
          if (!itemsByCategory[item.category_id]) {
            itemsByCategory[item.category_id] = [];
          }
          // Only add if not already in this category via junction
          const alreadyInCategory = itemsByCategory[item.category_id].some(i => i.id === item.id);
          if (!alreadyInCategory) {
            itemsByCategory[item.category_id].push(item);
          }
        }
      });

      // Sort items within each category
      Object.keys(itemsByCategory).forEach(categoryId => {
        itemsByCategory[categoryId].sort((a, b) => {
          const orderA = a._junctionSortOrder ?? a.sort_order ?? 0;
          const orderB = b._junctionSortOrder ?? b.sort_order ?? 0;
          return orderA - orderB;
        });
      });

      // Separate library, training, and forms categories with their items
      const library = [];
      const training = [];
      const forms = [];

      (categoriesData || []).forEach(category => {
        const categoryWithItems = {
          ...category,
          items: itemsByCategory[category.id] || [],
        };

        if (category.type === 'library') {
          library.push(categoryWithItems);
        } else if (category.type === 'training') {
          training.push(categoryWithItems);
        } else if (category.type === 'forms') {
          forms.push(categoryWithItems);
        }
      });

      setLibraryCategories(library);
      setTrainingCategories(training);
      setFormsCategories(forms);
      setInitialLoaded(true);

      // Sync any stale "processing" videos with Bunny's actual status
      syncProcessingVideos(itemsData || [], (updatedMap) => {
        const applyUpdates = (prev) => prev.map(c => ({
          ...c,
          items: c.items.map(i => updatedMap[i.id]
            ? { ...i, bunny_video_status: updatedMap[i.id] }
            : i
          ),
        }));
        setLibraryCategories(applyUpdates);
        setTrainingCategories(applyUpdates);
        setFormsCategories(applyUpdates);
      });
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check Bunny for any items stuck at "processing" and update DB + state
  const syncProcessingVideos = async (items, onUpdates) => {
    const processingItems = items.filter(
      i => i.bunny_video_id && i.bunny_video_status === 'processing'
    );
    if (processingItems.length === 0) return;

    const updatedMap = {};

    await Promise.all(
      processingItems.map(async (item) => {
        try {
          const result = await getBunnyVideoStatus(item.bunny_video_id);
          if (result.status === 'ready' || result.status === 'error') {
            updatedMap[item.id] = result.status;
            supabase
              .from('content_items')
              .update({ bunny_video_status: result.status })
              .eq('id', item.id)
              .then(() => {});
            // Push notification is handled server-side by bunny-webhook
          }
        } catch (err) {
          console.error('Error syncing video status for', item.bunny_video_id, err);
        }
      })
    );

    if (Object.keys(updatedMap).length > 0) {
      onUpdates(updatedMap);
    }
  };

  // Load user's downloads
  const loadUserDownloads = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('content_downloads')
        .select('content_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading downloads:', error);
        return;
      }

      setUserDownloads(new Set((data || []).map(d => d.content_id)));
    } catch (err) {
      console.error('Error loading downloads:', err);
    }
  };

  // Track a download
  const trackDownload = async (contentId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserDownloads(prev => new Set([...prev, contentId]));

    try {
      const { error } = await supabase
        .from('content_downloads')
        .upsert({
          content_id: contentId,
          user_id: user.id,
          downloaded_at: new Date().toISOString(),
        }, {
          onConflict: 'content_id,user_id',
        });

      if (error) {
        console.error('Error tracking download:', error);
      }
    } catch (err) {
      console.error('Error tracking download:', err);
    }
  };

  // Remove download tracking
  const removeDownload = async (contentId) => {
    if (!user?.id) return;

    // Optimistic update
    setUserDownloads(prev => {
      const next = new Set(prev);
      next.delete(contentId);
      return next;
    });

    try {
      const { error } = await supabase
        .from('content_downloads')
        .delete()
        .eq('content_id', contentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing download:', error);
      }
    } catch (err) {
      console.error('Error removing download:', err);
    }
  };

  // Check if content is downloaded
  const isDownloaded = (contentId) => userDownloads.has(contentId);

  // === ADMIN FUNCTIONS ===

  // Add a category
  const addCategory = async (type, title, description = '') => {
    try {
      // Get max sort order
      const categories = type === 'library' ? libraryCategories : type === 'forms' ? formsCategories : trainingCategories;
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order || 0))
        : -1;

      const { data, error } = await supabase
        .from('content_categories')
        .insert({
          type,
          title,
          description,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newCategory = { ...data, items: [] };
      if (type === 'library') {
        setLibraryCategories(prev => [...prev, newCategory]);
      } else if (type === 'forms') {
        setFormsCategories(prev => [...prev, newCategory]);
      } else {
        setTrainingCategories(prev => [...prev, newCategory]);
      }

      return data;
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  // Update a category
  const updateCategory = async (categoryId, updates) => {
    try {
      const { error } = await supabase
        .from('content_categories')
        .update(updates)
        .eq('id', categoryId);

      if (error) throw error;

      // Update local state
      const updateState = (prev) => prev.map(c =>
        c.id === categoryId ? { ...c, ...updates } : c
      );

      setLibraryCategories(updateState);
      setTrainingCategories(updateState);
      setFormsCategories(updateState);
    } catch (err) {
      console.error('Error updating category:', err);
      throw err;
    }
  };

  // Delete a category
  const deleteCategory = async (categoryId) => {
    try {
      const { error } = await supabase
        .from('content_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      // Remove from local state
      setLibraryCategories(prev => prev.filter(c => c.id !== categoryId));
      setTrainingCategories(prev => prev.filter(c => c.id !== categoryId));
      setFormsCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (err) {
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  // Reorder categories
  const reorderCategories = async (type, orderedIds) => {
    try {
      // Update local state first (optimistic)
      const updateState = (prev) => {
        const reordered = orderedIds.map((id, index) => {
          const cat = prev.find(c => c.id === id);
          return cat ? { ...cat, sort_order: index } : null;
        }).filter(Boolean);
        return reordered;
      };

      if (type === 'library') {
        setLibraryCategories(updateState);
      } else if (type === 'forms') {
        setFormsCategories(updateState);
      } else {
        setTrainingCategories(updateState);
      }

      // Update in database
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('content_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Error reordering categories:', err);
      // Reload on error
      loadAllContent();
    }
  };

  // Add a content item to a single category
  const addContentItem = async (categoryId, itemData) => {
    try {
      // Get the category to determine type
      const allCategories = [...libraryCategories, ...trainingCategories, ...formsCategories];
      const category = allCategories.find(c => c.id === categoryId);
      if (!category) throw new Error('Category not found');

      // Get max sort order for this category
      const maxOrder = category.items.length > 0
        ? Math.max(...category.items.map(i => i.sort_order || 0))
        : -1;

      const { data, error } = await supabase
        .from('content_items')
        .insert({
          category_id: categoryId,
          title: itemData.title,
          description: itemData.description || '',
          thumbnail_url: itemData.thumbnail_url || null,
          file_url: itemData.file_url || null,
          file_name: itemData.file_name || null,
          external_link: itemData.external_link || null,
          external_link_label: itemData.external_link_label || null,
          quiz_link: itemData.quiz_link || null,
          quiz_link_label: itemData.quiz_link_label || null,
          is_downloadable: itemData.is_downloadable !== false,
          use_company_logo: itemData.use_company_logo || false,
          bunny_video_id: itemData.bunny_video_id || null,
          bunny_video_status: itemData.bunny_video_status || null,
          sort_order: maxOrder + 1,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Also insert into junction table for the new many-to-many system
      await supabase
        .from('content_item_categories')
        .insert({
          content_id: data.id,
          category_id: categoryId,
          sort_order: maxOrder + 1,
        });

      // Add to local state
      const updateState = (prev) => prev.map(c => {
        if (c.id === categoryId) {
          return { ...c, items: [...c.items, data] };
        }
        return c;
      });

      if (category.type === 'library') {
        setLibraryCategories(updateState);
      } else if (category.type === 'forms') {
        setFormsCategories(updateState);
      } else {
        setTrainingCategories(updateState);
      }

      return data;
    } catch (err) {
      console.error('Error adding content item:', err);
      throw err;
    }
  };

  // Add a content item to multiple categories
  const addContentToCategories = async (itemData, categoryIds) => {
    try {
      console.log('=== addContentToCategories DEBUG ===');
      console.log('categoryIds received:', categoryIds);
      console.log('categoryIds length:', categoryIds?.length);

      if (!categoryIds || categoryIds.length === 0) {
        throw new Error('At least one category must be selected');
      }

      const allCategories = [...libraryCategories, ...trainingCategories, ...formsCategories];

      // Insert the content item (without category_id since it goes to multiple)
      const { data, error } = await supabase
        .from('content_items')
        .insert({
          category_id: null, // Multi-category items don't use direct FK
          title: itemData.title,
          description: itemData.description || '',
          thumbnail_url: itemData.thumbnail_url || null,
          file_url: itemData.file_url || null,
          file_name: itemData.file_name || null,
          external_link: itemData.external_link || null,
          external_link_label: itemData.external_link_label || null,
          quiz_link: itemData.quiz_link || null,
          quiz_link_label: itemData.quiz_link_label || null,
          is_downloadable: itemData.is_downloadable !== false,
          use_company_logo: itemData.use_company_logo || false,
          bunny_video_id: itemData.bunny_video_id || null,
          bunny_video_status: itemData.bunny_video_status || null,
          sort_order: 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert junction table entries for each category
      const junctionInserts = categoryIds.map(categoryId => {
        const category = allCategories.find(c => c.id === categoryId);
        const maxOrder = category?.items?.length > 0
          ? Math.max(...category.items.map(i => i.sort_order || 0))
          : -1;
        return {
          content_id: data.id,
          category_id: categoryId,
          sort_order: maxOrder + 1,
        };
      });

      console.log('Junction inserts to make:', junctionInserts);
      console.log('Number of junction entries:', junctionInserts.length);

      const { data: junctionData, error: junctionError } = await supabase
        .from('content_item_categories')
        .insert(junctionInserts)
        .select();

      console.log('Junction insert result:', junctionData);

      if (junctionError) {
        console.error('Error inserting junction entries:', junctionError);
        // Still continue - content was created
      } else {
        console.log('Successfully inserted', junctionData?.length, 'junction entries');
      }

      // Update local state - add item to each selected category
      const updateCategories = (prev) => prev.map(c => {
        if (categoryIds.includes(c.id)) {
          return { ...c, items: [...c.items, data] };
        }
        return c;
      });

      setLibraryCategories(updateCategories);
      setTrainingCategories(updateCategories);
      setFormsCategories(updateCategories);

      return data;
    } catch (err) {
      console.error('Error adding content to categories:', err);
      throw err;
    }
  };

  // Update a content item
  const updateContentItem = async (itemId, updates) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      const updateState = (prev) => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, ...updates } : i),
      }));

      setLibraryCategories(updateState);
      setTrainingCategories(updateState);
      setFormsCategories(updateState);
    } catch (err) {
      console.error('Error updating content item:', err);
      throw err;
    }
  };

  // Update which categories an item belongs to (delete old, insert new)
  const updateContentCategories = async (itemId, categoryIds) => {
    try {
      // Delete all existing junction entries
      await supabase
        .from('content_item_categories')
        .delete()
        .eq('content_id', itemId);

      // Insert new junction entries
      if (categoryIds.length > 0) {
        const links = categoryIds.map((catId, index) => ({
          content_id: itemId,
          category_id: catId,
          sort_order: index,
        }));
        const { error } = await supabase
          .from('content_item_categories')
          .insert(links);
        if (error) throw error;
      }

      // Reload to get fresh state
      await loadAllContent(true);
    } catch (err) {
      console.error('Error updating content categories:', err);
      throw err;
    }
  };

  // Delete a content item (removes from ALL categories)
  const deleteContentItem = async (itemId) => {
    try {
      // Clean up Bunny video if one is attached
      const allItems = [...libraryCategories, ...trainingCategories, ...formsCategories].flatMap(c => c.items);
      const itemToDelete = allItems.find(i => i.id === itemId);
      if (itemToDelete?.bunny_video_id) {
        try {
          await deleteBunnyVideo(itemToDelete.bunny_video_id);
        } catch (bunnyErr) {
          console.error('Failed to delete Bunny video (continuing):', bunnyErr);
        }
      }

      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Remove from local state
      const updateState = (prev) => prev.map(c => ({
        ...c,
        items: c.items.filter(i => i.id !== itemId),
      }));

      setLibraryCategories(updateState);
      setTrainingCategories(updateState);
      setFormsCategories(updateState);
    } catch (err) {
      console.error('Error deleting content item:', err);
      throw err;
    }
  };

  // Remove a content item from ONE category only (keeps item in other categories)
  const removeContentFromCategory = async (itemId, categoryId) => {
    try {
      // Delete only the junction entry
      const { error } = await supabase
        .from('content_item_categories')
        .delete()
        .eq('content_id', itemId)
        .eq('category_id', categoryId);

      if (error) throw error;

      // Check if item is still in any category
      const { data: remaining } = await supabase
        .from('content_item_categories')
        .select('id')
        .eq('content_id', itemId);

      // If not in any category anymore, delete the content item too
      if (!remaining || remaining.length === 0) {
        // Clean up Bunny video if one is attached
        const allItems = [...libraryCategories, ...trainingCategories, ...formsCategories].flatMap(c => c.items);
        const itemToDelete = allItems.find(i => i.id === itemId);
        if (itemToDelete?.bunny_video_id) {
          try {
            await deleteBunnyVideo(itemToDelete.bunny_video_id);
          } catch (bunnyErr) {
            console.error('Failed to delete Bunny video (continuing):', bunnyErr);
          }
        }

        await supabase
          .from('content_items')
          .delete()
          .eq('id', itemId);
      }

      // Update local state - remove from this category only
      const updateState = (prev) => prev.map(c => {
        if (c.id === categoryId) {
          return { ...c, items: c.items.filter(i => i.id !== itemId) };
        }
        return c;
      });

      setLibraryCategories(updateState);
      setTrainingCategories(updateState);
      setFormsCategories(updateState);
    } catch (err) {
      console.error('Error removing content from category:', err);
      throw err;
    }
  };

  // Reorder content items within a category
  const reorderContentItems = async (categoryId, orderedIds) => {
    try {
      // Update local state first (optimistic)
      const updateState = (prev) => prev.map(c => {
        if (c.id === categoryId) {
          const reorderedItems = orderedIds.map((id, index) => {
            const item = c.items.find(i => i.id === id);
            return item ? { ...item, sort_order: index } : null;
          }).filter(Boolean);
          return { ...c, items: reorderedItems };
        }
        return c;
      });

      setLibraryCategories(updateState);
      setTrainingCategories(updateState);
      setFormsCategories(updateState);

      // Update in database (junction table for many-to-many relationships)
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('content_item_categories')
          .update({ sort_order: update.sort_order })
          .eq('content_id', update.id)
          .eq('category_id', categoryId);
      }
    } catch (err) {
      console.error('Error reordering items:', err);
      // Reload on error
      loadAllContent();
    }
  };

  // Get all downloaded items for downloads screen
  const getDownloadedItems = useCallback(() => {
    const allItems = [];

    [...libraryCategories, ...trainingCategories, ...formsCategories].forEach(category => {
      category.items.forEach(item => {
        if (userDownloads.has(item.id)) {
          allItems.push({
            ...item,
            categoryTitle: category.title,
            categoryType: category.type,
          });
        }
      });
    });

    return allItems;
  }, [libraryCategories, trainingCategories, formsCategories, userDownloads]);

  // Force refresh content (for pull-to-refresh, etc.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refreshContent = useCallback(() => loadAllContent(true), []);

  const value = {
    // Data
    libraryCategories,
    trainingCategories,
    formsCategories,
    loading: isLoading, // Only true when actually loading with no data
    userDownloads,

    // Read functions
    loadAllContent,
    refreshContent,
    isDownloaded,
    getDownloadedItems,

    // Download tracking
    trackDownload,
    removeDownload,

    // Admin: Categories
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,

    // Admin: Content Items
    addContentItem,
    addContentToCategories,
    updateContentItem,
    updateContentCategories,
    deleteContentItem,
    removeContentFromCategory, // Remove from ONE category only
    reorderContentItems,

    // Background video uploads
    videoUploads,
    prepareVideoUpload,
    startBackgroundUpload,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};
