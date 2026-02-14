import { HiOutlineX } from 'react-icons/hi';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-6xl',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`${sizeClasses[size]} w-full mx-4 glass-card p-0 animate-slide-up max-h-[85vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/50">
                    <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-dark-200 hover:bg-dark-700/50 transition-colors"
                    >
                        <HiOutlineX className="w-5 h-5" />
                    </button>
                </div>
                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
