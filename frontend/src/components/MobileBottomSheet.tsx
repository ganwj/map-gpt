import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleIcon?: ReactNode;
  children: ReactNode;
  height?: string;
  maxHeight?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  titleIcon,
  children,
  height = 'calc(70vh - 64px)',
  maxHeight = 'calc(100vh - 130px)',
}: MobileBottomSheetProps) {
  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-16 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out overflow-visible ${
        isOpen ? 'translate-y-0' : 'translate-y-[calc(100%+64px)]'
      }`}
      style={{ height, maxHeight }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
      <div className="flex items-center justify-between px-4 pb-2 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          {titleIcon}
          {title}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      {children}
    </div>
  );
}
