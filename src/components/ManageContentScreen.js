import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { supabase } from '../config/supabase';
import { deleteBunnyVideo } from '../services/bunnyVideo';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const GripIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

// Sortable Category Item
const SortableCategoryItem = ({ category, index, isExpanded, onToggle, onEdit, onDelete, onAddContent, onEditContent, onDeleteContent, onReorderItems }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...styles.categoryCard, ...style }}>
      <div style={styles.categoryHeader}>
        <div {...attributes} {...listeners} style={styles.dragHandle}>
          <GripIcon />
        </div>
        <div style={styles.categoryInfo} onClick={onToggle}>
          <h3 style={styles.categoryName}>{category.title}</h3>
          <span style={styles.categoryCount}>
            {category.items.length} item{category.items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={styles.categoryActions}>
          <button style={styles.iconBtn} onClick={onEdit}>
            <EditIcon />
          </button>
          <button style={styles.iconBtn} onClick={onDelete}>
            <TrashIcon />
          </button>
          <div style={{ ...styles.expandIcon, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} onClick={onToggle}>
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.categoryContent}>
          <button style={styles.addContentBtn} onClick={onAddContent}>
            <PlusIcon />
            <span>Add Content</span>
          </button>

          {category.items.length > 0 ? (
            <SortableContentList
              items={category.items}
              categoryId={category.id}
              onEditContent={onEditContent}
              onDeleteContent={onDeleteContent}
              onReorderItems={onReorderItems}
            />
          ) : (
            <p style={styles.noItems}>No content items yet</p>
          )}
        </div>
      )}
    </div>
  );
};

// Sortable Content Item
const SortableContentItem = ({ item, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...styles.itemCard, ...style }}>
      <div {...attributes} {...listeners} style={styles.dragHandleSmall}>
        <GripIcon />
      </div>
      <div style={styles.itemThumbnail}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" style={styles.itemThumbImage} />
        ) : (
          <div style={styles.itemThumbPlaceholder}>
            <ImageIcon />
          </div>
        )}
      </div>
      <div style={styles.itemInfo}>
        <p style={styles.itemTitle}>{item.title}</p>
        {item.description && (
          <p style={styles.itemDesc}>{item.description}</p>
        )}
      </div>
      <div style={styles.itemActions}>
        <button style={styles.iconBtn} onClick={onEdit}>
          <EditIcon />
        </button>
        <button style={styles.iconBtn} onClick={onDelete}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

// Sortable Content List (nested DndContext for items)
const SortableContentList = ({ items, categoryId, onEditContent, onDeleteContent, onReorderItems }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      onReorderItems(categoryId, newOrder.map(i => i.id));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={styles.itemsList}>
          {items.map(item => (
            <SortableContentItem
              key={item.id}
              item={item}
              onEdit={() => onEditContent(item)}
              onDelete={() => onDeleteContent(item)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// Category Modal
const CategoryModal = ({ isOpen, onClose, onSave, category, title }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(category?.title || '');
      setDescription(category?.description || '');
    }
  }, [isOpen, category]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: name.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 style={styles.modalTitle}>{title}</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={styles.input}
            placeholder="Enter category name"
            autoFocus
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Brief description"
            rows={3}
          />
        </div>

        <button
          style={{ ...styles.saveBtn, opacity: !name.trim() || saving ? 0.5 : 1 }}
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? 'Saving...' : (category ? 'Update Category' : 'Add Category')}
        </button>
      </div>
    </div>
  );
};

// Content Item Modal
const ContentItemModal = ({ isOpen, onClose, onSave, item, title, type, categories = [], itemCategoryIds = [] }) => {
  const modalRef = React.useRef(null);
  const scrollYRef = React.useRef(0);
  const { prepareVideoUpload } = useContent();
  const [formData, setFormData] = useState({
    title: '', description: '', thumbnail_url: '', file_url: '', file_name: '',
    external_link: '', external_link_label: '', quiz_link: '', quiz_link_label: '',
    is_downloadable: true, use_company_logo: false,
    bunny_video_id: '', bunny_video_status: '',
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [pendingVideoUpload, setPendingVideoUpload] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoCreating, setVideoCreating] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.width = '100%';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen]);

  // Prevent touch scroll on overlay (allow only on modal)
  const handleTouchMove = React.useCallback((e) => {
    if (modalRef.current && modalRef.current.contains(e.target)) {
      return;
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: item?.title || '',
        description: item?.description || '',
        thumbnail_url: item?.thumbnail_url || '',
        file_url: item?.file_url || '',
        file_name: item?.file_name || '',
        external_link: item?.external_link || '',
        external_link_label: item?.external_link_label || '',
        quiz_link: item?.quiz_link || '',
        quiz_link_label: item?.quiz_link_label || '',
        is_downloadable: item?.is_downloadable !== false,
        use_company_logo: item?.use_company_logo || false,
        bunny_video_id: item?.bunny_video_id || '',
        bunny_video_status: item?.bunny_video_status || '',
      });
      setPendingVideoUpload(null);
      setVideoCreating(false);
      setVideoUploadError('');
      setSelectedCategories(itemCategoryIds.length > 0 ? [...itemCategoryIds] : []);
      setCategoryError('');
    }
  }, [isOpen, item, itemCategoryIds]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoCreating(true);
    setVideoUploadError('');
    try {
      const result = await prepareVideoUpload(formData.title || file.name, file);
      handleChange('bunny_video_id', result.videoId);
      handleChange('bunny_video_status', 'uploading');
      setPendingVideoUpload(result);
      setVideoCreating(false);
    } catch (err) {
      setVideoCreating(false);
      setVideoUploadError('Failed to prepare video. Please try again.');
      console.error('Error preparing video:', err);
    }
  };

  const handleRemoveVideo = async () => {
    if (formData.bunny_video_id && !pendingVideoUpload) {
      try {
        await deleteBunnyVideo(formData.bunny_video_id);
      } catch (err) {
        console.error('Failed to delete Bunny video:', err);
      }
    }
    if (pendingVideoUpload && formData.bunny_video_id) {
      try {
        await deleteBunnyVideo(formData.bunny_video_id);
      } catch (err) {
        console.error('Failed to delete Bunny video:', err);
      }
    }
    handleChange('bunny_video_id', '');
    handleChange('bunny_video_status', '');
    setPendingVideoUpload(null);
    setVideoUploadError('');
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      handleChange('thumbnail_url', data.publicUrl);
    } catch (err) {
      console.error('Error uploading thumbnail:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      handleChange('file_url', data.publicUrl);
      handleChange('file_name', file.name);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const toggleCategory = (catId) => {
    setCategoryError('');
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    if (item && categories.length > 0 && selectedCategories.length === 0) {
      setCategoryError('At least one category must be selected');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData, pendingVideoUpload, selectedCategories);
      onClose();
    } catch (err) {
      console.error('Error saving content:', err);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose} onTouchMove={handleTouchMove}>
      <div ref={modalRef} style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 style={styles.modalTitle}>{title}</h2>

        {item && categories.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #1e40af' : '2px solid #e2e8f0',
                      backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                      color: isSelected ? '#1e40af' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSelected && <span style={{ fontWeight: '700' }}>+</span>}
                    {cat.title}
                  </button>
                );
              })}
            </div>
            {categoryError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '6px 0 0 0' }}>{categoryError}</p>}
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Title *</label>
          <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} style={styles.input} placeholder="Content title" />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} style={styles.textarea} placeholder="Content description" rows={3} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Thumbnail (Square Image)</label>
          {formData.thumbnail_url ? (
            <div style={styles.thumbnailPreview}>
              <img src={formData.thumbnail_url} alt="Thumbnail" style={styles.previewImage} />
              <button style={styles.removeBtn} onClick={() => handleChange('thumbnail_url', '')}>Remove</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <ImageIcon />
              <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
              <input type="file" accept="image/*" onChange={handleThumbnailUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>File Attachment</label>
          {formData.file_url ? (
            <div style={styles.filePreview}>
              <span>{formData.file_name || 'File uploaded'}</span>
              <button style={styles.removeBtn} onClick={() => { handleChange('file_url', ''); handleChange('file_name', ''); }}>Remove</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <PlusIcon />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Private Video</label>
          {formData.bunny_video_id ? (
            <div style={styles.videoStatusContainer}>
              <div style={styles.videoStatusRow}>
                <VideoIcon />
                <span style={styles.videoStatusText}>
                  {pendingVideoUpload ? 'Video ready - will upload in background after save' :
                   formData.bunny_video_status === 'processing' ? 'Processing' :
                   formData.bunny_video_status === 'ready' ? 'Ready' : 'Uploaded'}
                </span>
              </div>
              <button style={styles.removeBtn} onClick={handleRemoveVideo}>Remove Video</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <VideoIcon />
              <span>{videoCreating ? 'Preparing...' : 'Upload Video'}</span>
              <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} disabled={videoCreating} />
            </label>
          )}
          {videoUploadError && (
            <p style={styles.videoErrorText}>{videoUploadError}</p>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>External Link</label>
          <input type="url" value={formData.external_link} onChange={e => handleChange('external_link', e.target.value)} style={styles.input} placeholder="https://..." />
          {formData.external_link && (
            <input type="text" value={formData.external_link_label} onChange={e => handleChange('external_link_label', e.target.value)} style={{ ...styles.input, marginTop: '8px' }} placeholder="Link label (e.g., 'View Resource')" />
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Quiz Link</label>
          <input type="url" value={formData.quiz_link} onChange={e => handleChange('quiz_link', e.target.value)} style={styles.input} placeholder="https://..." />
          {formData.quiz_link && (
            <input type="text" value={formData.quiz_link_label} onChange={e => handleChange('quiz_link_label', e.target.value)} style={{ ...styles.input, marginTop: '8px' }} placeholder="Quiz label (e.g., 'Take Assessment')" />
          )}
        </div>

        <div style={styles.toggleGroup}>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Downloadable</span>
            <button style={{ ...styles.toggle, backgroundColor: formData.is_downloadable ? '#1e40af' : '#e2e8f0' }} onClick={() => handleChange('is_downloadable', !formData.is_downloadable)}>
              <div style={{ ...styles.toggleKnob, transform: formData.is_downloadable ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Use Company Logo as Thumbnail</span>
            <button style={{ ...styles.toggle, backgroundColor: formData.use_company_logo ? '#1e40af' : '#e2e8f0' }} onClick={() => handleChange('use_company_logo', !formData.use_company_logo)}>
              <div style={{ ...styles.toggleKnob, transform: formData.use_company_logo ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
        </div>

        <button style={{ ...styles.saveBtn, opacity: !formData.title.trim() || saving ? 0.5 : 1 }} onClick={handleSave} disabled={!formData.title.trim() || saving}>
          {saving ? 'Saving...' : (item ? 'Update Content' : 'Add Content')}
        </button>
      </div>
    </div>
  );
};

// Multi-Category Content Modal
const MultiCategoryContentModal = ({ isOpen, onClose, onSave, libraryCategories, trainingCategories, formsCategories, type }) => {
  const modalRef = React.useRef(null);
  const scrollYRef = React.useRef(0);
  const { prepareVideoUpload } = useContent();
  const [formData, setFormData] = useState({
    title: '', description: '', thumbnail_url: '', file_url: '', file_name: '',
    external_link: '', external_link_label: '', quiz_link: '', quiz_link_label: '',
    is_downloadable: true, use_company_logo: false,
    bunny_video_id: '', bunny_video_status: '',
  });
  const [pendingVideoUpload, setPendingVideoUpload] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoCreating, setVideoCreating] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.width = '100%';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '', description: '', thumbnail_url: '', file_url: '', file_name: '',
        external_link: '', external_link_label: '', quiz_link: '', quiz_link_label: '',
        is_downloadable: true, use_company_logo: false,
        bunny_video_id: '', bunny_video_status: '',
      });
      setSelectedCategories([]);
      setPendingVideoUpload(null);
      setVideoCreating(false);
      setVideoUploadError('');
    }
  }, [isOpen]);

  // Prevent touch scroll on overlay
  const handleTouchMove = React.useCallback((e) => {
    if (modalRef.current && modalRef.current.contains(e.target)) {
      return;
    }
    e.preventDefault();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoCreating(true);
    setVideoUploadError('');
    try {
      const result = await prepareVideoUpload(formData.title || file.name, file);
      handleChange('bunny_video_id', result.videoId);
      handleChange('bunny_video_status', 'uploading');
      setPendingVideoUpload(result);
      setVideoCreating(false);
    } catch (err) {
      setVideoCreating(false);
      setVideoUploadError('Failed to prepare video. Please try again.');
      console.error('Error preparing video:', err);
    }
  };

  const handleRemoveVideo = async () => {
    if (formData.bunny_video_id) {
      try {
        await deleteBunnyVideo(formData.bunny_video_id);
      } catch (err) {
        console.error('Failed to delete Bunny video:', err);
      }
    }
    handleChange('bunny_video_id', '');
    handleChange('bunny_video_status', '');
    setPendingVideoUpload(null);
    setVideoUploadError('');
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      handleChange('thumbnail_url', data.publicUrl);
    } catch (err) {
      console.error('Error uploading thumbnail:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      handleChange('file_url', data.publicUrl);
      handleChange('file_name', file.name);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || selectedCategories.length === 0) return;
    setSaving(true);
    try {
      await onSave(formData, selectedCategories, pendingVideoUpload);
      onClose();
    } catch (err) {
      console.error('Error saving content:', err);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const canSave = formData.title.trim() && selectedCategories.length > 0 && !saving;

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose} onTouchMove={handleTouchMove}>
      <div ref={modalRef} style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 style={styles.modalTitle}>Add Content to Multiple Categories</h2>

        {/* Category Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Select Categories *</label>
          <p style={styles.categoryHint}>Choose one or more categories for this content</p>

          {libraryCategories.length > 0 && (
            <div style={styles.categorySection}>
              <div style={styles.categorySectionTitle}>Resource Library</div>
              {libraryCategories.map(cat => (
                <label key={cat.id} style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>{cat.title}</span>
                </label>
              ))}
            </div>
          )}

          {trainingCategories.length > 0 && (
            <div style={styles.categorySection}>
              <div style={styles.categorySectionTitle}>Training & Development</div>
              {trainingCategories.map(cat => (
                <label key={cat.id} style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>{cat.title}</span>
                </label>
              ))}
            </div>
          )}

          {formsCategories && formsCategories.length > 0 && (
            <div style={styles.categorySection}>
              <div style={styles.categorySectionTitle}>Forms</div>
              {formsCategories.map(cat => (
                <label key={cat.id} style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>{cat.title}</span>
                </label>
              ))}
            </div>
          )}

          {selectedCategories.length > 0 && (
            <div style={styles.selectedCount}>
              {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Title *</label>
          <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} style={styles.input} placeholder="Content title" />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} style={styles.textarea} placeholder="Content description" rows={3} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Thumbnail (Square Image)</label>
          {formData.thumbnail_url ? (
            <div style={styles.thumbnailPreview}>
              <img src={formData.thumbnail_url} alt="Thumbnail" style={styles.previewImage} />
              <button style={styles.removeBtn} onClick={() => handleChange('thumbnail_url', '')}>Remove</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <ImageIcon />
              <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
              <input type="file" accept="image/*" onChange={handleThumbnailUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>File Attachment</label>
          {formData.file_url ? (
            <div style={styles.filePreview}>
              <span>{formData.file_name || 'File uploaded'}</span>
              <button style={styles.removeBtn} onClick={() => { handleChange('file_url', ''); handleChange('file_name', ''); }}>Remove</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <PlusIcon />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Private Video</label>
          {formData.bunny_video_id ? (
            <div style={styles.videoStatusContainer}>
              <div style={styles.videoStatusRow}>
                <VideoIcon />
                <span style={styles.videoStatusText}>
                  {pendingVideoUpload ? 'Video ready - will upload in background after save' :
                   formData.bunny_video_status === 'processing' ? 'Processing' :
                   formData.bunny_video_status === 'ready' ? 'Ready' : 'Uploaded'}
                </span>
              </div>
              <button style={styles.removeBtn} onClick={handleRemoveVideo}>Remove Video</button>
            </div>
          ) : (
            <label style={styles.uploadBtn}>
              <VideoIcon />
              <span>{videoCreating ? 'Preparing...' : 'Upload Video'}</span>
              <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} disabled={videoCreating} />
            </label>
          )}
          {videoUploadError && (
            <p style={styles.videoErrorText}>{videoUploadError}</p>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>External Link</label>
          <input type="url" value={formData.external_link} onChange={e => handleChange('external_link', e.target.value)} style={styles.input} placeholder="https://..." />
          {formData.external_link && (
            <input type="text" value={formData.external_link_label} onChange={e => handleChange('external_link_label', e.target.value)} style={{ ...styles.input, marginTop: '8px' }} placeholder="Link label (e.g., 'View Resource')" />
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Quiz Link</label>
          <input type="url" value={formData.quiz_link} onChange={e => handleChange('quiz_link', e.target.value)} style={styles.input} placeholder="https://..." />
          {formData.quiz_link && (
            <input type="text" value={formData.quiz_link_label} onChange={e => handleChange('quiz_link_label', e.target.value)} style={{ ...styles.input, marginTop: '8px' }} placeholder="Quiz label (e.g., 'Take Assessment')" />
          )}
        </div>

        <div style={styles.toggleGroup}>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Downloadable</span>
            <button style={{ ...styles.toggle, backgroundColor: formData.is_downloadable ? '#1e40af' : '#e2e8f0' }} onClick={() => handleChange('is_downloadable', !formData.is_downloadable)}>
              <div style={{ ...styles.toggleKnob, transform: formData.is_downloadable ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Use Company Logo as Thumbnail</span>
            <button style={{ ...styles.toggle, backgroundColor: formData.use_company_logo ? '#1e40af' : '#e2e8f0' }} onClick={() => handleChange('use_company_logo', !formData.use_company_logo)}>
              <div style={{ ...styles.toggleKnob, transform: formData.use_company_logo ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
        </div>

        <button style={{ ...styles.saveBtn, opacity: canSave ? 1 : 0.5 }} onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving...' : `Add to ${selectedCategories.length} Categor${selectedCategories.length === 1 ? 'y' : 'ies'}`}
        </button>
      </div>
    </div>
  );
};

// Main Component
const ManageContentScreen = ({ type, title, backPath }) => {
  const navigate = useNavigate();
  const {
    libraryCategories, trainingCategories, formsCategories,
    addCategory, updateCategory, deleteCategory,
    addContentItem, addContentToCategories, updateContentItem, updateContentCategories, deleteContentItem,
    removeContentFromCategory,
    reorderCategories, reorderContentItems,
    startBackgroundUpload, videoUploads,
  } = useContent();

  const categories = type === 'library'
    ? libraryCategories
    : type === 'forms'
      ? formsCategories
      : trainingCategories;

  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [contentModal, setContentModal] = useState({ open: false, item: null, categoryId: null });
  const [multiCategoryModal, setMultiCategoryModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null, name: '', categoryId: null, isMultiCategory: false });
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      reorderCategories(type, newOrder.map(c => c.id));
    }
  };

  const handleSaveCategory = async (data) => {
    if (categoryModal.category) {
      await updateCategory(categoryModal.category.id, data);
    } else {
      await addCategory(type, data.title, data.description);
    }
  };

  const handleSaveContent = async (data, pendingVideo, selectedCategoryIds) => {
    let savedItem;
    if (contentModal.item) {
      await updateContentItem(contentModal.item.id, data);
      savedItem = contentModal.item;
      // Update category assignments if categories were changed
      if (selectedCategoryIds && selectedCategoryIds.length > 0) {
        await updateContentCategories(contentModal.item.id, selectedCategoryIds);
      }
    } else {
      savedItem = await addContentItem(contentModal.categoryId, data);
    }
    console.log('handleSaveContent - pendingVideo:', pendingVideo, 'savedItem:', savedItem);
    if (pendingVideo && savedItem?.id) {
      console.log('Starting background upload for', savedItem.id);
      startBackgroundUpload(savedItem.id, pendingVideo.file, pendingVideo.tusConfig);
    }
  };

  const handleSaveMultiCategoryContent = async (data, selectedCategoryIds, pendingVideo) => {
    const savedItem = await addContentToCategories(data, selectedCategoryIds);
    if (pendingVideo && savedItem?.id) {
      startBackgroundUpload(savedItem.id, pendingVideo.file, pendingVideo.tusConfig);
    }
  };

  const confirmDelete = async (deleteEverywhere = true) => {
    try {
      if (deleteConfirm.type === 'category') {
        await deleteCategory(deleteConfirm.id);
      } else if (deleteEverywhere) {
        await deleteContentItem(deleteConfirm.id);
      } else {
        await removeContentFromCategory(deleteConfirm.id, deleteConfirm.categoryId);
      }
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete');
    }
    setDeleteConfirm({ open: false, type: null, id: null, name: '', categoryId: null, isMultiCategory: false });
  };

  const activeCategory = activeId ? categories.find(c => c.id === activeId) : null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backBtn} onClick={() => navigate(backPath)}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>{title}</h1>
          <div style={{ width: 40 }} />
        </div>
        <div style={styles.headerBorder} />
      </header>

      <div style={styles.contentContainer}>
        <div style={styles.content}>
          <button style={styles.addCategoryBtn} onClick={() => setCategoryModal({ open: true, category: null })}>
            <PlusIcon />
            <span>Add Category</span>
          </button>

          <button style={styles.addMultiContentBtn} onClick={() => setMultiCategoryModal(true)}>
            <PlusIcon />
            <span>Add Content to Multiple Categories</span>
          </button>

          {categories.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div style={styles.categoriesList}>
                  {categories.map((category, index) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      index={index}
                      isExpanded={expandedCategory === category.id}
                      onToggle={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                      onEdit={() => setCategoryModal({ open: true, category })}
                      onDelete={() => setDeleteConfirm({ open: true, type: 'category', id: category.id, name: category.title })}
                      onAddContent={() => setContentModal({ open: true, item: null, categoryId: category.id })}
                      onEditContent={(item) => setContentModal({ open: true, item, categoryId: category.id })}
                      onDeleteContent={(item) => {
                        // Count how many categories this item is in
                        const allCats = [...libraryCategories, ...trainingCategories];
                        const categoryCount = allCats.filter(c => c.items.some(i => i.id === item.id)).length;
                        setDeleteConfirm({ open: true, type: 'content', id: item.id, name: item.title, categoryId: category.id, isMultiCategory: categoryCount > 1 });
                      }}
                      onReorderItems={reorderContentItems}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeCategory ? (
                  <div style={{ ...styles.categoryCard, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transform: 'scale(1.02)' }}>
                    <div style={styles.categoryHeader}>
                      <div style={styles.dragHandle}><GripIcon /></div>
                      <div style={styles.categoryInfo}>
                        <h3 style={styles.categoryName}>{activeCategory.title}</h3>
                        <span style={styles.categoryCount}>{activeCategory.items.length} items</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No categories yet. Add one to get started!</p>
            </div>
          )}

          <div style={{ height: '40px' }} />
        </div>
      </div>

      <CategoryModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={handleSaveCategory}
        category={categoryModal.category}
        title={categoryModal.category ? 'Edit Category' : 'Add Category'}
      />

      <ContentItemModal
        isOpen={contentModal.open}
        onClose={() => setContentModal({ open: false, item: null, categoryId: null })}
        onSave={handleSaveContent}
        item={contentModal.item}
        title={contentModal.item ? 'Edit Content' : 'Add Content'}
        type={type}
        categories={categories}
        itemCategoryIds={contentModal.item ? categories.filter(c => c.items.some(i => i.id === contentModal.item.id)).map(c => c.id) : [contentModal.categoryId].filter(Boolean)}
      />

      <MultiCategoryContentModal
        isOpen={multiCategoryModal}
        onClose={() => setMultiCategoryModal(false)}
        onSave={handleSaveMultiCategoryContent}
        libraryCategories={libraryCategories}
        trainingCategories={trainingCategories}
        formsCategories={formsCategories}
        type={type}
      />

      {deleteConfirm.open && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm({ open: false, type: null, id: null, name: '', categoryId: null, isMultiCategory: false })}>
          <div style={styles.deleteModal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.deleteModalTitle}>
              {deleteConfirm.type === 'category' ? 'Delete Category?' : (deleteConfirm.isMultiCategory ? 'Remove Content?' : 'Delete Content?')}
            </h2>
            <p style={styles.deleteText}>
              {deleteConfirm.type === 'category'
                ? `Are you sure you want to delete "${deleteConfirm.name}"? All content in this category will also be deleted.`
                : deleteConfirm.isMultiCategory
                  ? `"${deleteConfirm.name}" is in multiple categories. What would you like to do?`
                  : `Are you sure you want to delete "${deleteConfirm.name}"?`
              }
            </p>
            <div style={styles.deleteActionsVertical}>
              {deleteConfirm.type === 'content' && deleteConfirm.isMultiCategory && (
                <button style={styles.removeBtnFull} onClick={() => confirmDelete(false)}>Remove from This Category</button>
              )}
              <button style={styles.deleteBtnFull} onClick={() => confirmDelete(true)}>
                {deleteConfirm.type === 'category' ? 'Delete Category' : (deleteConfirm.isMultiCategory ? 'Delete from All Categories' : 'Delete')}
              </button>
              <button style={styles.cancelBtnFull} onClick={() => setDeleteConfirm({ open: false, type: null, id: null, name: '', categoryId: null, isMultiCategory: false })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100%', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' },
  header: { width: '100%', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px 16px', maxWidth: '600px', margin: '0 auto' },
  headerTitle: { color: '#1e40af', fontSize: '20px', fontWeight: '700', margin: 0, textAlign: 'center' },
  headerBorder: { maxWidth: '600px', margin: '0 auto', height: '2px', backgroundColor: 'rgba(30, 64, 175, 0.15)', borderRadius: '1px' },
  backBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#1e40af', borderRadius: '10px' },
  contentContainer: { flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto' },
  content: { width: '100%', maxWidth: '600px', padding: '16px' },
  addCategoryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' },
  addMultiContentBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', backgroundColor: '#ffffff', color: '#1e40af', border: '2px solid #1e40af', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '20px' },
  categoriesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  categoryCard: { backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' },
  categoryHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' },
  dragHandle: { color: '#94a3b8', cursor: 'grab', padding: '4px', touchAction: 'none' },
  dragHandleSmall: { color: '#94a3b8', cursor: 'grab', padding: '2px', touchAction: 'none' },
  categoryInfo: { flex: 1, cursor: 'pointer' },
  categoryName: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 },
  categoryCount: { fontSize: '13px', color: '#64748b' },
  categoryActions: { display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' },
  expandIcon: { transition: 'transform 0.2s', cursor: 'pointer', padding: '4px' },
  iconBtn: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#64748b' },
  categoryContent: { padding: '0 16px 16px 16px', borderTop: '1px solid #f1f5f9' },
  addContentBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#f1f5f9', color: '#1e40af', border: '1px dashed #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '12px', marginTop: '12px', width: '100%', justifyContent: 'center' },
  itemsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  itemCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  itemThumbnail: { width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 },
  itemThumbImage: { width: '100%', height: '100%', objectFit: 'cover' },
  itemThumbPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: '14px', fontWeight: '500', color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemDesc: { fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemActions: { display: 'flex', gap: '6px' },
  noItems: { color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', padding: '12px' },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyText: { color: '#64748b', fontSize: '15px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' },
  modal: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', position: 'relative', maxHeight: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  modalTitle: { fontSize: '20px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0', paddingRight: '40px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', fontSize: '15px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 14px', fontSize: '15px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  saveBtn: { width: '100%', padding: '14px', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  uploadBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer', color: '#64748b', fontSize: '14px' },
  thumbnailPreview: { display: 'flex', alignItems: 'center', gap: '12px' },
  previewImage: { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' },
  filePreview: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '14px', color: '#1e293b' },
  removeBtn: { padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  toggleGroup: { marginBottom: '16px' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  toggleLabel: { fontSize: '14px', color: '#1e293b' },
  toggle: { width: '48px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s ease', padding: 0 },
  toggleKnob: { width: '24px', height: '24px', borderRadius: '12px', backgroundColor: '#ffffff', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)', transition: 'transform 0.2s ease' },
  deleteText: { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0, padding: '0 16px 16px', textAlign: 'center' },
  deleteActions: { display: 'flex', gap: '12px' },
  cancelBtn: { flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  removeBtn: { flex: 1, padding: '12px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { flex: 1, padding: '12px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  // iOS-style delete modal
  deleteModal: { backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '300px', overflow: 'hidden' },
  deleteModalTitle: { fontSize: '17px', fontWeight: '600', color: '#1e293b', margin: 0, padding: '20px 16px 8px', textAlign: 'center' },
  deleteActionsVertical: { display: 'flex', flexDirection: 'column', borderTop: '1px solid #e2e8f0', marginTop: '16px' },
  removeBtnFull: { width: '100%', padding: '14px 16px', backgroundColor: 'transparent', color: '#f59e0b', border: 'none', borderBottom: '1px solid #e2e8f0', fontSize: '17px', fontWeight: '400', cursor: 'pointer' },
  deleteBtnFull: { width: '100%', padding: '14px 16px', backgroundColor: 'transparent', color: '#dc2626', border: 'none', borderBottom: '1px solid #e2e8f0', fontSize: '17px', fontWeight: '600', cursor: 'pointer' },
  cancelBtnFull: { width: '100%', padding: '14px 16px', backgroundColor: 'transparent', color: '#007aff', border: 'none', fontSize: '17px', fontWeight: '600', cursor: 'pointer' },
  // Multi-category modal styles
  categoryHint: { fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' },
  categorySection: { marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  categorySectionTitle: { fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1e40af' },
  checkboxLabel: { fontSize: '14px', color: '#1e293b' },
  selectedCount: { fontSize: '13px', color: '#059669', fontWeight: '500', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', textAlign: 'center' },
  // Video upload styles
  videoStatusContainer: { padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' },
  videoStatusRow: { display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' },
  videoStatusText: { fontSize: '14px', fontWeight: '500' },
  videoProgressBar: { width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' },
  videoProgressFill: { height: '100%', backgroundColor: '#1e40af', borderRadius: '3px', transition: 'width 0.3s ease' },
  videoErrorText: { color: '#dc2626', fontSize: '13px', margin: '6px 0 0 0' },
};

export default ManageContentScreen;
