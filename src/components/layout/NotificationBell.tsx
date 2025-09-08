import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useGetUnreadNotificationCount } from '../../queries/notificationQueries';
import { playNotificationSound, preloadNotificationSound } from '../../utils/soundUtils';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previousCountRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const navigate = useNavigate();

  // Get unread count with polling
  const { data: countData, isLoading, error } = useGetUnreadNotificationCount();
  const unreadCount = countData?.count || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Preload notification sound on component mount
  useEffect(() => {
    preloadNotificationSound();
  }, []);

  // Play notification sound when unread count increases
  useEffect(() => {
    // Skip initial load and error states
    if (!hasInitializedRef.current || isLoading || error) {
      if (!isLoading && !error && unreadCount >= 0) {
        // First successful load - initialize previous count
        hasInitializedRef.current = true;
        previousCountRef.current = unreadCount;
      }
      return;
    }

    // Play sound if count increased (new notifications arrived)
    if (unreadCount > previousCountRef.current && unreadCount > 0) {
      playNotificationSound().catch((err: unknown) => {
        console.warn('Failed to play notification sound:', err);
      });
    }

    // Update previous count for next comparison
    previousCountRef.current = unreadCount;
  }, [unreadCount, isLoading, error]);

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position relative to viewport
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 380;
      
      setDropdownPosition({
        top: buttonRect.bottom + 8,
        left: Math.max(10, buttonRect.left - dropdownWidth + buttonRect.width + 10)
      });
    }
    setIsOpen(prev => !prev);
  };

  const handleNotificationClick = (taskId: number, eventId?: number | null) => {
    // Navigate to the task with optional message highlighting
    const searchParams = new URLSearchParams();
    searchParams.set('taskId', taskId.toString());
    if (eventId) {
      searchParams.set('highlightMessage', eventId.toString());
    }
    
    const url = `/tasks?${searchParams.toString()}`;
    console.log('Navigating to:', url);
    
    navigate(url);
    setIsOpen(false);
  };

  return (
    <div className={`position-relative notification-bell-container ${className}`}>
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className={`btn btn-light position-relative p-2 rounded-3 border-0 ${
          isOpen ? 'btn-secondary' : 'btn-light'
        } ${
          error ? 'text-danger' : 'text-muted'
        }`}
        style={{
          transition: 'all 0.2s ease-in-out',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
        }}
        aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروءة)` : ''}`}
        disabled={isLoading}
      >
        {/* Bell Icon */}
        <Bell 
          className="" 
          size={20}
          fill={unreadCount > 0 ? 'currentColor' : 'none'}
        />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span 
            className="position-absolute badge bg-danger rounded-pill d-flex align-items-center justify-content-center"
            style={{
              top: '-2px',
              right: '-2px',
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              animation: 'pulse 2s infinite'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <span className="position-absolute" style={{ top: '-2px', right: '-2px' }}>
            <div 
              className="spinner-border spinner-border-sm text-primary"
              style={{ width: '12px', height: '12px' }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
          </span>
        )}

        {/* Error Indicator */}
        {error && (
          <span 
            className="position-absolute bg-danger rounded-circle"
            style={{
              top: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px'
            }}
            title="خطأ في تحميل الإشعارات"
          />
        )}
      </button>

      {/* Dropdown Portal - Rendered outside sidebar to prevent clipping */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="dropdown-menu shadow-lg border-0 show"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: '380px',
            maxHeight: '500px',
            zIndex: 1055,
            transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            opacity: 1,
            visibility: 'visible',
            transform: 'scale(1)',
            transformOrigin: 'top right'
          }}
        >
          <NotificationDropdown
            onNotificationClick={handleNotificationClick}
            onClose={() => setIsOpen(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
