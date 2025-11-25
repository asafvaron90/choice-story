"use client";

import { FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/hooks/useTranslation";

interface LeaveStoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const LeaveStoryModal: FC<LeaveStoryModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.leaveStory.title}</DialogTitle>
          <DialogDescription>
            {t.leaveStory.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-1"
          >
            {t.leaveStory.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1 sm:flex-1"
          >
            {t.leaveStory.leave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

