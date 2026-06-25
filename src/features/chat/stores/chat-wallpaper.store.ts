// Wallpaper giờ được lưu trên server (conversation.background).
// Đọc qua useWallpaper() / useBubbleConfig() từ TanStack Query cache.
// Cập nhật qua useUpdateBackground() mutation.
export { DEFAULT_BUBBLE_CONFIG } from '@/features/chat/config/chat-themes';
export { parseBackground } from '@/features/chat/hooks/useWallpaper';
