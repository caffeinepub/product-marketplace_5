# Specification

## Summary
**Goal:** Fix image upload functionality in both batch and single product uploaders, and add capability for administrators to edit/replace product images after upload.

**Planned changes:**
- Debug and fix image upload in BatchUploader component to enable successful uploads to backend blob storage
- Debug and fix image upload in SingleProductUploader component to enable successful uploads to backend blob storage
- Verify backend blob storage correctly handles image data, stores blobs with metadata, and returns accessible URLs/blob IDs
- Add image editing functionality allowing administrators to replace product images in both upload and management interfaces
- Add UI controls (edit button/icon) on product cards for administrators to initiate image editing
- Create backend function `updateProductImage` that accepts product ID and new image blob, replaces existing image reference
- Create React Query hook `useUpdateProductImage` for updating product images with proper cache invalidation

**User-visible outcome:** Users can successfully upload product images when creating products (batch or single mode), and administrators can edit/replace existing product images with upload progress feedback and success confirmation.
